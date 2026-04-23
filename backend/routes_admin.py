from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required

from database import db
from models import AppointmentSlot, Booking, Business, Service

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def admin_required():
    claims = get_jwt()
    if not claims.get("is_admin", False):
        return False
    return True


@admin_bp.post("/services")
@jwt_required()
def create_service():
    if not admin_required():
        return jsonify({"message": "Admin access required."}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    if not name:
        return jsonify({"message": "Service name is required."}), 400

    if Service.query.filter_by(name=name).first():
        return jsonify({"message": "Service already exists."}), 400

    service = Service(name=name, description=description)
    db.session.add(service)
    db.session.commit()

    return jsonify({"id": service.id, "name": service.name}), 201


@admin_bp.post("/businesses")
@jwt_required()
def create_business():
    if not admin_required():
        return jsonify({"message": "Admin access required."}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    address = (data.get("address") or "").strip()
    city = (data.get("city") or "").strip()
    service_id = data.get("service_id")

    if not all([name, address, city, service_id]):
        return jsonify({"message": "name, address, city and service_id are required."}), 400

    business = Business(
        name=name,
        address=address,
        city=city,
        service_id=service_id,
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
    )
    db.session.add(business)
    db.session.commit()

    return jsonify({"id": business.id, "name": business.name}), 201


@admin_bp.post("/businesses/<int:business_id>/slots")
@jwt_required()
def create_slots(business_id: int):
    if not admin_required():
        return jsonify({"message": "Admin access required."}), 403

    data = request.get_json() or {}
    date_str = data.get("date")
    start_time_str = data.get("start_time")
    end_time_str = data.get("end_time")

    if not (date_str and start_time_str and end_time_str):
        return (
            jsonify(
                {"message": "date, start_time and end_time are required in YYYY-MM-DD and HH:MM format."}
            ),
            400,
        )

    try:
        slot_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        start_time = datetime.strptime(start_time_str, "%H:%M").time()
        end_time = datetime.strptime(end_time_str, "%H:%M").time()
    except ValueError:
        return jsonify({"message": "Invalid date or time format."}), 400

    if end_time <= start_time:
        return jsonify({"message": "end_time must be after start_time."}), 400

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


@admin_bp.get("/bookings")
@jwt_required()
def list_bookings():
    if not admin_required():
        return jsonify({"message": "Admin access required."}), 403

    bookings = (
        Booking.query.join(AppointmentSlot, Booking.slot_id == AppointmentSlot.id)
        .join(Business, Booking.business_id == Business.id)
        .order_by(AppointmentSlot.date.desc(), AppointmentSlot.start_time.desc())
        .all()
    )

    results = []
    for b in bookings:
        slot = b.slot
        business = b.business
        payment_info = None
        if b.payment:
            payment_info = {
                "id": b.payment.id,
                "amount": b.payment.amount,
                "refund_amount": b.payment.refund_amount,
                "status": b.payment.status,
            }
        results.append(
            {
                "id": b.id,
                "user_id": b.user_id,
                "business": {
                    "id": business.id,
                    "name": business.name,
                    "city": business.city,
                },
                "date": slot.date.isoformat(),
                "start_time": slot.start_time.strftime("%H:%M"),
                "end_time": slot.end_time.strftime("%H:%M"),
                "status": b.status,
                "payment_status": b.payment_status,
                "payment": payment_info,
            }
        )

    return jsonify(results)

