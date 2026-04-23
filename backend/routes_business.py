from datetime import date
import traceback

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from sqlalchemy import func
from datetime import datetime as _dt, timedelta

from database import db
from models import (
    AppointmentSlot,
    Booking,
    BookingStatus,
    Business,
    Notification,
    NotificationType,
    Review,
    Service,
    User,
    UserRole,
)

business_bp = Blueprint("business", __name__, url_prefix="/api/business")


def _require_business_owner() -> int | None:
  claims = get_jwt()
  role = claims.get("role")
  if role not in (UserRole.BUSINESS, UserRole.ADMIN):
      return None
  return int(get_jwt_identity())


def _booking_card(b, slot, business):
    user = b.user
    payment_info = None
    if b.payment:
        payment_info = {
            "id": b.payment.id,
            "amount": b.payment.amount,
            "refund_amount": b.payment.refund_amount,
            "status": b.payment.status,
            "payment_method": b.payment.payment_method,
        }
    return {
        "id": b.id,
        "status": b.status,
        "payment_status": b.payment_status,
        "payment": payment_info,
        "business_id": b.business_id,
        "business_name": business.name,
        "customer_id": b.user_id,
        "customer_name": user.name if user else "Unknown",
        "customer_phone": getattr(user, "phone", None) or "",
        "customer_email": user.email if user else "",
        "service": b.service_name or business.category or "",
        "date": slot.date.isoformat(),
        "start_time": slot.start_time.strftime("%H:%M"),
        "end_time": slot.end_time.strftime("%H:%M"),
    }


@business_bp.get("/dashboard")
@jwt_required()
def business_dashboard():
    owner_id = _require_business_owner()
    if not owner_id:
        return jsonify({"message": "Business access required."}), 403

    today = date.today()

    businesses = Business.query.filter_by(owner_id=owner_id).all()
    business_ids = [b.id for b in businesses]

    today_bookings = []
    upcoming_bookings = []
    stats = {"total_today": 0, "total_bookings": 0, "upcoming": 0, "pending": 0, "confirmed": 0, "completed": 0, "cancelled": 0}

    if business_ids:
        all_bookings = (
            Booking.query.join(AppointmentSlot, Booking.slot_id == AppointmentSlot.id)
            .join(User, Booking.user_id == User.id)
            .filter(Booking.business_id.in_(business_ids))
            .order_by(AppointmentSlot.date.asc(), AppointmentSlot.start_time.asc())
            .all()
        )

        for b in all_bookings:
            slot = b.slot
            business = b.business
            card = _booking_card(b, slot, business)

            if b.status in stats:
                stats[b.status] += 1
            stats["total_bookings"] += 1

            if slot.date == today:
                today_bookings.append(card)
                stats["total_today"] += 1
            elif slot.date > today and b.status in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
                upcoming_bookings.append(card)
                stats["upcoming"] += 1

    business_summaries = [{"id": b.id, "name": b.name, "city": b.city, "category": b.category} for b in businesses]

    return jsonify(
        {
            "businesses": business_summaries,
            "today_bookings": today_bookings,
            "upcoming_bookings": upcoming_bookings,
            "stats": stats,
        }
    )


@business_bp.get("/my-businesses")
@jwt_required()
def get_my_businesses():
    owner_id = _require_business_owner()
    if not owner_id:
        return jsonify({"message": "Business access required."}), 403

    businesses = Business.query.filter_by(owner_id=owner_id).all()
    return jsonify([
        {
            "id": b.id,
            "name": b.name,
            "category": b.category,
            "city": b.city,
            "address": b.address
        } for b in businesses
    ])


@business_bp.post("/create")
@jwt_required()
def create_business():
    owner_id = _require_business_owner()
    if not owner_id:
        return jsonify({"message": "Business access required."}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    category = (data.get("category") or "").strip()
    address = (data.get("address") or "").strip()
    city = (data.get("city") or "").strip()

    if not all([name, category, address, city]):
        return jsonify({"message": "Name, category, address and city are required."}), 400

    # Resolve service_id from category or use first
    service_id = data.get("service_id")
    if not service_id:
        svc = Service.query.filter(func.lower(Service.name) == category.lower()).first()
        if not svc:
            svc = Service.query.first()
        service_id = svc.id if svc else None

    if not service_id:
        return jsonify({"message": "No service category available."}), 400

    business = Business(
        name=name,
        category=category,
        address=address,
        city=city,
        owner_id=owner_id,
        service_id=service_id,
        owner_name=User.query.get(owner_id).name,
        opening_time=_dt.strptime("09:00", "%H:%M").time(),
        closing_time=_dt.strptime("18:00", "%H:%M").time()
    )
    db.session.add(business)
    db.session.commit()

    return jsonify({"message": "Business created successfully.", "id": business.id}), 201


@business_bp.get("/bookings")
@jwt_required()
def business_bookings():
    owner_id = _require_business_owner()
    if not owner_id:
        return jsonify({"message": "Business access required."}), 403

    status_filter = request.args.get("status")
    date_str = request.args.get("date")
    selected_date = None
    if date_str:
        from datetime import datetime as _dt

        try:
            selected_date = _dt.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"message": "Invalid date format, use YYYY-MM-DD."}), 400

    businesses = Business.query.filter_by(owner_id=owner_id).all()
    business_ids = [b.id for b in businesses]

    if not business_ids:
        return jsonify([])

    q = (
        Booking.query.join(AppointmentSlot, Booking.slot_id == AppointmentSlot.id)
        .join(Business, Booking.business_id == Business.id)
        .join(User, Booking.user_id == User.id)
        .filter(Booking.business_id.in_(business_ids))
        .order_by(AppointmentSlot.date.desc(), AppointmentSlot.start_time.desc())
    )

    if status_filter:
        q = q.filter(Booking.status == status_filter)
    if selected_date:
        q = q.filter(AppointmentSlot.date == selected_date)

    results = []
    for b in q.all():
        slot = b.slot
        business = b.business
        user = b.user
        results.append(
            {
                "id": b.id,
                "status": b.status,
                "customer_id": b.user_id,
                "customer_name": user.name if user else "Unknown",
                "customer_phone": getattr(user, "phone", None) or "",
                "customer_email": user.email if user else "",
                "service": b.service_name or business.category or "",
                "business": {"id": business.id, "name": business.name, "city": business.city},
                "date": slot.date.isoformat(),
                "start_time": slot.start_time.strftime("%H:%M"),
                "end_time": slot.end_time.strftime("%H:%M"),
            }
        )

    return jsonify(results)


@business_bp.post("/slots")
@jwt_required()
def business_create_slot():
    owner_id = _require_business_owner()
    if not owner_id:
        return jsonify({"message": "Business access required."}), 403

    data = request.get_json() or {}
    business_id = data.get("business_id")
    date_str = data.get("date")
    start_time_str = data.get("start_time")
    end_time_str = data.get("end_time")

    if not all([business_id, date_str, start_time_str, end_time_str]):
        return (
            jsonify(
                {
                    "message": "business_id, date, start_time and end_time are required in YYYY-MM-DD and HH:MM format."
                }
            ),
            400,
        )

    business = Business.query.filter_by(id=business_id, owner_id=owner_id).first()
    if not business:
        return jsonify({"message": "You are not allowed to manage this business."}), 403

    try:
        slot_date = _dt.strptime(date_str, "%Y-%m-%d").date()
        start_time = _dt.strptime(start_time_str, "%H:%M").time()
        end_time = _dt.strptime(end_time_str, "%H:%M").time()
    except ValueError:
        return jsonify({"message": "Invalid date or time format."}), 400

    if end_time <= start_time:
        return jsonify({"message": "end_time must be after start_time."}), 400

    # Enforce 30-minute slot duration
    start_dt = _dt.combine(slot_date, start_time)
    expected_end = start_dt + timedelta(minutes=30)
    if end_time != expected_end.time():
        end_time = expected_end.time()

    # Prevent double booking: check for existing slot at same time
    existing = AppointmentSlot.query.filter_by(
        business_id=business_id, date=slot_date, start_time=start_time
    ).first()
    if existing:
        return jsonify({"message": "A slot already exists at this time."}), 409

    slot = AppointmentSlot(
        business_id=business_id,
        date=slot_date,
        start_time=start_time,
        end_time=end_time,
    )
    db.session.add(slot)
    db.session.commit()

    return (
        jsonify(
            {
                "id": slot.id,
                "date": slot.date.isoformat(),
                "start_time": slot.start_time.strftime("%H:%M"),
                "end_time": slot.end_time.strftime("%H:%M"),
            }
        ),
        201,
    )


@business_bp.get("/slots")
@jwt_required()
def get_business_slots_owner():
    owner_id = _require_business_owner()
    if not owner_id:
        return jsonify({"message": "Business access required."}), 403

    # Fetch all businesses for this owner
    businesses = Business.query.filter_by(owner_id=owner_id).all()
    business_ids = [b.id for b in businesses]
    
    if not business_ids:
        return jsonify([])

    # Fetch all slots for these businesses
    slots = AppointmentSlot.query.filter(AppointmentSlot.business_id.in_(business_ids)).order_by(AppointmentSlot.date.desc(), AppointmentSlot.start_time.asc()).all()
    
    return jsonify([
        {
            "id": s.id,
            "business_id": s.business_id,
            "business_name": s.business.name,
            "date": s.date.isoformat(),
            "start_time": s.start_time.strftime("%H:%M"),
            "end_time": s.end_time.strftime("%H:%M"),
            "is_booked": s.is_booked
        } for s in slots
    ])


@business_bp.delete("/slots/<int:slot_id>")
@jwt_required()
def delete_business_slot(slot_id):
    owner_id = _require_business_owner()
    if not owner_id:
        return jsonify({"message": "Business access required."}), 403

    slot = AppointmentSlot.query.get_or_404(slot_id)
    if slot.business.owner_id != owner_id:
        return jsonify({"message": "Access denied."}), 403

    if slot.is_booked:
        return jsonify({"message": "Cannot delete a booked slot."}), 400

    db.session.delete(slot)
    db.session.commit()
    return jsonify({"message": "Slot deleted successfully."})


@business_bp.put("/booking-status")
@jwt_required()
def update_booking_status():
    owner_id = _require_business_owner()
    if not owner_id:
        return jsonify({"message": "Business access required."}), 403

    data = request.get_json() or {}
    booking_id = data.get("booking_id")
    new_status = (data.get("status") or "").lower()

    if not booking_id or new_status not in {
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
    }:
        return jsonify({"message": "booking_id and a valid status are required."}), 400

    booking = Booking.query.get_or_404(booking_id)
    business = Business.query.get(booking.business_id)

    if not business or business.owner_id != owner_id:
        return jsonify({"message": "You are not allowed to update this booking."}), 403

    # Slot locking/unlocking on cancel
    if new_status == BookingStatus.CANCELLED and booking.slot:
        booking.slot.is_booked = False

    booking.status = new_status
    db.session.commit()

    # Create a notification for the customer
    msg_map = {
        BookingStatus.CONFIRMED: ("Your booking has been confirmed.", NotificationType.BOOKING_CONFIRMED),
        BookingStatus.CANCELLED: ("Your booking has been cancelled.", NotificationType.BOOKING_CANCELLED),
        BookingStatus.COMPLETED: ("Your appointment has been marked as completed.", NotificationType.BOOKING_CONFIRMED),
        BookingStatus.PENDING: ("Your booking is pending review.", NotificationType.BOOKING_CREATED),
    }
    pair = msg_map.get(new_status)
    if pair:
        message, ntype = pair
        note = Notification(user_id=booking.user_id, message=message, type=ntype)
        db.session.add(note)
        db.session.commit()

    return jsonify({"message": "Booking status updated.", "status": booking.status})


@business_bp.route("/<int:business_id>", methods=["GET", "PUT", "PATCH", "DELETE"])
@jwt_required()
def handle_business(business_id):
    """Manage a specific business profile (view/update/delete)."""
    owner_id = _require_business_owner()
    if not owner_id:
        return jsonify({"message": "Access denied"}), 403

    business = Business.query.get_or_404(business_id)
    if business.owner_id != owner_id:
        return jsonify({"message": "You are not authorized to access this business profile."}), 403

    # DELETE LOGIC
    if request.method == "DELETE":
        try:
            # Cleanup dependent data
            AppointmentSlot.query.filter_by(business_id=business_id).delete()
            Booking.query.filter_by(business_id=business_id).delete()
            Review.query.filter_by(business_id=business_id).delete()
            db.session.delete(business)
            db.session.commit()
            return jsonify({"message": "Business deleted successfully."}), 200
        except Exception as e:
            db.session.rollback()
            print(f"[DELETE BUSINESS ERROR] {e}")
            return jsonify({"message": "Internal error during deletion.", "error": str(e)}), 500

    # GET LOGIC (Private view for owner)
    if request.method == "GET":
        return jsonify({
            "id": business.id,
            "name": business.name,
            "owner_name": business.owner_name,
            "phone": business.phone,
            "category": business.category,
            "address": business.address,
            "city": business.city,
            "state": business.state,
            "pincode": business.pincode,
            "services_offered": business.services_offered,
            "opening_time": business.opening_time.strftime("%H:%M") if business.opening_time else None,
            "closing_time": business.closing_time.strftime("%H:%M") if business.closing_time else None,
            "map_url": business.map_url,
            "latitude": business.latitude,
            "longitude": business.longitude,
            "service_id": business.service_id,
            "extra_data": business.extra_data or {}
        })

    # PUT/PATCH LOGIC
    try:
        data = request.get_json() or {}
        
        # Update standard fields
        fields = ["name", "owner_name", "phone", "category", "address", "city", "state", "pincode", "services_offered", "map_url", "extra_data"]
        for field in fields:
            if field in data:
                val = data[field]
                if field == "extra_data" and not isinstance(val, dict):
                    val = business.extra_data or {}
                setattr(business, field, val)

        # Handle coordinates
        if "latitude" in data:
            business.latitude = data["latitude"]
        if "longitude" in data:
            business.longitude = data["longitude"]

        # Handle times
        if "opening_time" in data and data["opening_time"]:
            try:
                business.opening_time = _dt.strptime(data["opening_time"], "%H:%M").time()
            except ValueError:
                return jsonify({"message": "opening_time must be in HH:MM format."}), 400

        if "closing_time" in data and data["closing_time"]:
            try:
                business.closing_time = _dt.strptime(data["closing_time"], "%H:%M").time()
            except ValueError:
                return jsonify({"message": "closing_time must be in HH:MM format."}), 400

        # Handle service_id
        if "service_id" in data:
            service = Service.query.get(data["service_id"])
            if not service:
                return jsonify({"message": "Invalid service_id."}), 400
            business.service_id = data["service_id"]

        db.session.commit()
        return jsonify({"message": "Business updated successfully."})

    except Exception as e:
        print("[UPDATE BUSINESS ERROR]", str(e))
        traceback.print_exc()
        db.session.rollback()
        return jsonify({"message": "Internal Server Error during update", "error": str(e)}), 500

