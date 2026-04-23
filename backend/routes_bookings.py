from datetime import datetime, date, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from database import db
from models import AppointmentSlot, Booking, BookingStatus, Business, Notification, NotificationType, Payment, PaymentStatus

bookings_bp = Blueprint("bookings", __name__, url_prefix="/api/bookings")
bookings_bp.strict_slashes = False


def _parse_date(date_str: str) -> date | None:
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


@bookings_bp.post("")
@jwt_required()
def create_booking():
    user_id = int(get_jwt_identity())
    print(f"--- BOOKING ATTEMPT: User {user_id} ---")
    claims = get_jwt()
    role = (claims.get("role") or "customer").lower()

    if role == "business":
        return jsonify({"message": "Business accounts cannot book appointments. Use a customer account."}), 403

    data = request.get_json() or {}
    try:
        business_id = int(data.get("business_id"))
        slot_id = int(data.get("slot_id"))
    except (TypeError, ValueError):
        return jsonify({"message": "business_id and slot_id are required and must be integers."}), 400

    business = Business.query.get(business_id)
    if not business:
        return jsonify({"message": "Selected business does not exist."}), 404

    slot = AppointmentSlot.query.filter_by(
        id=slot_id, business_id=business_id
    ).first()
    if not slot:
        return jsonify({"message": "Slot not available. The selected time slot does not exist for this business."}), 404
    if slot.is_booked:
        return jsonify({"message": "This time slot has just been booked by someone else."}), 409

    # Populate booking details (date/time + service name) from slot/business
    booking = Booking(
        user_id=user_id,
        business_id=business_id,
        slot_id=slot.id,
        appointment_date=slot.date,
        appointment_time=slot.start_time,
        service_name=business.category,
        status=BookingStatus.PENDING,
        payment_status=PaymentStatus.PENDING,
    )
    slot.is_booked = True

    db.session.add(booking)
    db.session.commit()
    print(f"✅ BOOKING CREATED: ID={booking.id}, Status={booking.status}, Payment_Status={booking.payment_status}")

    # Create associated payment record (default amount: 500)
    payment = Payment(
        booking_id=booking.id,
        user_id=user_id,
        amount=500.0,  # Default booking amount
        status=PaymentStatus.PENDING,
        payment_method=None,
    )
    db.session.add(payment)
    db.session.commit()
    print(f"✅ PAYMENT CREATED: ID={payment.id}, Amount={payment.amount}, Status={payment.status}")

    # Notify business owner of new booking
    if business.owner_id:
        msg = f"New booking for {business.name} on {slot.date} at {slot.start_time.strftime('%H:%M')}."
        note = Notification(
            user_id=business.owner_id,
            message=msg,
            type=NotificationType.BOOKING_CREATED,
        )
        db.session.add(note)
        db.session.commit()
        print(f"✅ NOTIFICATION SENT to business owner {business.owner_id}")

    return (
        jsonify(
            {
                "message": "Appointment booked successfully.",
                "booking": {
                    "id": booking.id,
                    "status": booking.status,
                    "payment_status": booking.payment_status,
                    "business_id": booking.business_id,
                    "slot_id": booking.slot_id,
                },
                "payment": {
                    "id": payment.id,
                    "amount": payment.amount,
                    "status": payment.status,
                },
            }
        ),
        201,
    )


@bookings_bp.get("/me")
@bookings_bp.get("/my")
@jwt_required()
def get_my_bookings():
    user_id = int(get_jwt_identity())
    print(f"📖 GET_MY_BOOKINGS: User {user_id}")
    today = date.today()

    all_bookings = (
        Booking.query.join(AppointmentSlot, Booking.slot_id == AppointmentSlot.id)
        .join(Business, Booking.business_id == Business.id)
        .filter(Booking.user_id == user_id)
        .order_by(AppointmentSlot.date.asc(), AppointmentSlot.start_time.asc())
        .all()
    )
    
    print(f"✅ FOUND {len(all_bookings)} bookings for user {user_id}")

    upcoming = []
    history = []
    for b in all_bookings:
        slot = b.slot
        business = b.business
        payment_info = None
        if b.payment:
            payment_info = {
                "id": b.payment.id,
                "amount": b.payment.amount,
                "refund_amount": b.payment.refund_amount,
                "status": b.payment.status,
                "payment_method": b.payment.payment_method,
            }
        item = {
            "id": b.id,
            "status": b.status,
            "payment_status": b.payment_status,
            "payment": payment_info,
            "service": b.service_name or business.category or "",
            "business": {
                "id": business.id,
                "name": business.name,
                "address": business.address,
                "city": business.city,
            },
            "date": slot.date.isoformat(),
            "start_time": slot.start_time.strftime("%H:%M"),
            "end_time": slot.end_time.strftime("%H:%M"),
            "created_at": b.created_at.isoformat(),
        }
        if slot.date >= today and b.status in (
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
        ):
            upcoming.append(item)
        else:
            history.append(item)

    return jsonify({"upcoming": upcoming, "history": history})


@bookings_bp.patch("/<int:booking_id>/cancel")
@jwt_required()
def cancel_booking(booking_id: int):
    user_id = int(get_jwt_identity())
    print(f"🚫 CANCEL_REQUEST: User {user_id} for Booking {booking_id}")
    claims = get_jwt()
    is_admin = claims.get("is_admin", False)

    booking = Booking.query.get_or_404(booking_id)
    if booking.user_id != user_id and not is_admin:
        print(f"❌ UNAUTHORIZED: User {user_id} cannot cancel booking {booking_id} (owner: {booking.user_id})")
        return jsonify({"message": "Not authorized to cancel this booking."}), 403

    if booking.status not in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
        print(f"❌ INVALID_STATUS: Booking {booking_id} has status {booking.status}")
        return jsonify({"message": "Only pending or confirmed bookings can be cancelled."}), 400

    # Get payment information if exists
    payment = Payment.query.filter_by(booking_id=booking_id).first()
    print(f"✅ BOOKING_FOUND: Status={booking.status}, HasPayment={payment is not None}")
    
    # Apply cancellation policy with refund logic
    if payment and payment.status == PaymentStatus.PENDING:
        # Calculate time until appointment
        from datetime import datetime as dt
        appointment_datetime = dt.combine(booking.appointment_date, booking.appointment_time)
        time_until_appointment = appointment_datetime - dt.utcnow()
        hours_left = time_until_appointment.total_seconds() / 3600
        
        print(f"📅 TIME_CALC: Appointment at {appointment_datetime}, Hours left: {hours_left:.2f}")
        
        # If more than 1 hour before appointment: FULL REFUND (100%)
        if time_until_appointment.total_seconds() > 3600:
            payment.refund_amount = payment.amount
            payment.status = PaymentStatus.FULL_REFUND
            print(f"💰 FULL_REFUND: ₹{payment.refund_amount} (>1 hour before)")
        else:
            # Less than 1 hour: no refund
            payment.refund_amount = 0.0
            payment.status = PaymentStatus.NO_REFUND
            print(f"🚫 NO_REFUND: Cancelled within 1 hour")
        
        db.session.add(payment)

    booking.status = BookingStatus.CANCELLED
    if booking.slot:
        booking.slot.is_booked = False
    
    db.session.commit()
    print(f"✅ BOOKING_CANCELLED: ID={booking_id}, Status={booking.status}")

    result = {
        "message": "Booking cancelled successfully.",
        "cancellation_details": {
            "booking_id": booking_id,
            "status": booking.status,
        }
    }
    
    if payment:
        result["cancellation_details"]["payment_status"] = payment.status
        result["cancellation_details"]["refund_amount"] = payment.refund_amount
    
    return jsonify(result)


@bookings_bp.post("/<int:booking_id>/pay")
@jwt_required()
def pay_for_booking(booking_id: int):
    """
    Process payment for a booking.
    Set payment status to 'paid' and booking payment_status to 'paid'.
    """
    user_id = int(get_jwt_identity())
    print(f"💳 PAYMENT_REQUEST: User {user_id} for Booking {booking_id}")
    claims = get_jwt()
    is_admin = claims.get("is_admin", False)

    booking = Booking.query.get_or_404(booking_id)
    if booking.user_id != user_id and not is_admin:
        print(f"❌ UNAUTHORIZED: Cannot pay for booking {booking_id}")
        return jsonify({"message": "Not authorized to pay for this booking."}), 403

    payment = Payment.query.filter_by(booking_id=booking_id).first()
    if not payment:
        print(f"❌ NOT_FOUND: No payment for booking {booking_id}")
        return jsonify({"message": "No payment record found for this booking."}), 404

    if payment.status in (PaymentStatus.PAID, PaymentStatus.PARTIAL_REFUND, PaymentStatus.FULL_REFUND):
        print(f"❌ ALREADY_PROCESSED: Payment status {payment.status}")
        return jsonify({"message": f"Payment already processed with status: {payment.status}"}), 400

    # In a real system, this would integrate with a payment gateway (Stripe, PayPal, etc.)
    # For now, we simply mark it as paid
    payment.status = PaymentStatus.PAID
    payment.payment_method = request.get_json().get("payment_method", "card")
    
    booking.payment_status = PaymentStatus.PAID
    
    db.session.add(payment)
    db.session.add(booking)
    db.session.commit()
    
    print(f"✅ PAYMENT_SUCCESS: Booking {booking_id}, Amount: ₹{payment.amount}, Method: {payment.payment_method}")

    return jsonify({
        "message": "Payment successful.",
        "payment": {
            "id": payment.id,
            "booking_id": booking.id,
            "amount": payment.amount,
            "status": payment.status,
            "payment_method": payment.payment_method,
        }
    })


@bookings_bp.patch("/<int:booking_id>/reschedule")
@jwt_required()
def reschedule_booking(booking_id: int):
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    is_admin = claims.get("is_admin", False)

    data = request.get_json() or {}
    new_slot_id = data.get("slot_id")
    if not new_slot_id:
        return jsonify({"message": "New slot_id is required."}), 400

    booking = Booking.query.get_or_404(booking_id)
    if booking.user_id != user_id and not is_admin:
        return jsonify({"message": "Not authorized to reschedule this booking."}), 403

    if booking.status not in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
        return jsonify({"message": "Only pending or confirmed bookings can be rescheduled."}), 400

    new_slot = AppointmentSlot.query.filter_by(
        id=new_slot_id, business_id=booking.business_id
    ).first()
    if not new_slot:
        return jsonify({"message": "New slot not found for this business."}), 404
    if new_slot.is_booked:
        return jsonify({"message": "New slot is no longer available."}), 409

    # free old slot
    if booking.slot:
        booking.slot.is_booked = False

    # assign new slot
    booking.slot_id = new_slot.id
    booking.appointment_date = new_slot.date
    booking.appointment_time = new_slot.start_time
    new_slot.is_booked = True

    db.session.commit()

    return jsonify({"message": "Booking rescheduled successfully."})

