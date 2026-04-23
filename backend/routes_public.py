from datetime import datetime, timedelta
from math import atan2, cos, radians, sin, sqrt

from flask import Blueprint, jsonify, request

from database import db
from models import AppointmentSlot, Business, Review, Service, User

public_bp = Blueprint("public", __name__, url_prefix="/api")


@public_bp.get("/services")
def get_services():
    services = Service.query.order_by(Service.name.asc()).all()
    return jsonify(
        [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
            }
            for s in services
        ]
    )


@public_bp.get("/services/<int:service_id>/businesses")
def get_businesses_for_service(service_id: int):
    """Legacy endpoint kept for compatibility – prefer /businesses with service_id."""
    search = (request.args.get("q") or "").strip()
    city = (request.args.get("city") or "").strip()

    query = Business.query.filter_by(service_id=service_id)
    if search:
        like = f"%{search.lower()}%"
        query = query.filter(db.func.lower(Business.name).like(like))
    if city:
        like_city = f"%{city.lower()}%"
        query = query.filter(db.func.lower(Business.city).like(like_city))

    businesses = query.order_by(Business.name.asc()).all()
    return jsonify(
        [
            {
                "id": b.id,
                "name": b.name,
                "address": b.address,
                "city": b.city,
                "service_id": b.service_id,
                "average_rating": b.average_rating,
                "rating_count": b.rating_count,
                "map_url": getattr(b, "map_url", None),
                "opening_time": b.opening_time.strftime("%H:%M") if getattr(b, "opening_time", None) else None,
                "closing_time": b.closing_time.strftime("%H:%M") if getattr(b, "closing_time", None) else None,
            }
            for b in businesses
        ]
    )


@public_bp.get("/businesses")
def get_businesses():
    """Return businesses across services, with optional filters."""
    search = (request.args.get("q") or "").strip()
    city = (request.args.get("city") or "").strip()
    location = (request.args.get("location") or "").strip()
    service_id = request.args.get("service_id", type=int)
    service_type = (request.args.get("service_type") or "").strip()
    service_slug = (request.args.get("service") or "").strip()

    query = Business.query

    # Service filtering: support service_id, service_type, or generic ?service=salon
    if service_id:
        query = query.filter(Business.service_id == service_id)
    else:
        effective_service = (service_type or service_slug).strip()
        if effective_service:
            svc = (
                Service.query.filter(
                    db.func.lower(Service.name) == effective_service.lower()
                ).first()
            )
            if svc:
                query = query.filter(Business.service_id == svc.id)
            else:
                # Unknown service name – no matches
                return jsonify([])

    # Text search by business name
    if search:
        like = f"%{search.lower()}%"
        query = query.filter(db.func.lower(Business.name).like(like))

    # Optional location filter (acts as a filter, not a requirement)
    effective_city = city or location
    if effective_city:
        like_city = f"%{effective_city.lower()}%"
        query = query.filter(db.func.lower(Business.city).like(like_city))

    businesses = query.order_by(Business.name.asc()).all()
    return jsonify(
        [
            {
                "id": b.id,
                "name": b.name,
                "address": b.address,
                "city": b.city,
                "category": b.category,
                "services_offered": b.services_offered,
                "latitude": b.latitude,
                "longitude": b.longitude,
                "service_id": b.service_id,
                "rating": b.average_rating,
                "rating_count": b.rating_count,
                "map_url": b.map_url,
                "opening_time": b.opening_time.strftime("%H:%M") if b.opening_time else None,
                "closing_time": b.closing_time.strftime("%H:%M") if b.closing_time else None,
            }
            for b in businesses
        ]
    )


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Approximate great‑circle distance between two points (in kilometers)."""
    r = 6371.0  # Earth radius in km
    phi1, phi2 = radians(lat1), radians(lat2)
    d_phi = radians(lat2 - lat1)
    d_lambda = radians(lon2 - lon1)

    a = sin(d_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(d_lambda / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c


@public_bp.get("/businesses/nearby")
def get_nearby_businesses():
    """Return businesses within radius (km) of a lat/lng, optionally filtered by service."""
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    radius_km = request.args.get("radius", default=5.0, type=float)
    service_id = request.args.get("service_id", type=int)
    service_slug = (request.args.get("service") or "").strip()

    if lat is None or lng is None:
        return jsonify({"message": "lat and lng query parameters are required."}), 400

    query = Business.query

    # Optional service filter
    if service_id:
        query = query.filter(Business.service_id == service_id)
    elif service_slug:
        svc = (
            Service.query.filter(
                db.func.lower(Service.name) == service_slug.lower()
            ).first()
        )
        if svc:
            query = query.filter(Business.service_id == svc.id)
        else:
            return jsonify([])

    candidates = query.filter(
        Business.latitude.isnot(None), Business.longitude.isnot(None)
    ).all()

    results = []
    for b in candidates:
        dist = _haversine_km(lat, lng, b.latitude, b.longitude)
        if dist <= radius_km:
            d = round(dist, 2)
            results.append(
                {
                    "id": b.id,
                    "name": b.name,
                    "address": b.address,
                    "city": b.city,
                    "category": b.category,
                    "services_offered": b.services_offered,
                    "latitude": b.latitude,
                    "longitude": b.longitude,
                    "service_id": b.service_id,
                    "rating": b.average_rating or 0,
                    "rating_count": b.rating_count or 0,
                    "distance": d,
                    "distance_km": d,
                    "map_url": getattr(b, "map_url", None),
                    "opening_time": b.opening_time.strftime("%H:%M") if getattr(b, "opening_time", None) else None,
                    "closing_time": b.closing_time.strftime("%H:%M") if getattr(b, "closing_time", None) else None,
                }
            )

    # Sort by distance ascending
    results.sort(key=lambda x: x["distance"])
    return jsonify(results)


@public_bp.get("/businesses/<int:business_id>")
def get_business_profile(business_id: int):
    """Public business profile for customers to view and book."""
    business = Business.query.get(business_id)
    if not business:
        return jsonify({"message": "Business not found."}), 404

    service = business.service
    return jsonify(
        {
            "id": business.id,
            "name": business.name,
            "owner_name": business.owner_name or "",
            "owner_id": business.owner_id,
            "category": business.category or (service.name if service else ""),
            "address": business.address,
            "city": business.city,
            "state": business.state,
            "pincode": business.pincode,
            "phone": business.phone,
            "latitude": business.latitude,
            "longitude": business.longitude,
            "average_rating": business.average_rating or 0,
            "rating_count": business.rating_count or 0,
            "services_offered": business.services_offered or "",
            "opening_time": business.opening_time.strftime("%H:%M") if business.opening_time else None,
            "closing_time": business.closing_time.strftime("%H:%M") if business.closing_time else None,
            "service_id": business.service_id,
            "map_url": business.map_url,
        }
    )


@public_bp.get("/businesses/<int:business_id>/reviews")
def get_business_reviews(business_id: int):
    """Return reviews for a business. Safely handles errors to prevent page crashes."""
    try:
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"message": "Business not found."}), 404

        reviews_data = (
            db.session.query(Review, User)
            .outerjoin(User, Review.user_id == User.id)
            .filter(Review.business_id == business_id)
            .order_by(Review.created_at.desc())
            .limit(50)
            .all()
        )

        items = []
        for r, u in reviews_data:
            items.append(
                {
                    "id": r.id,
                    "rating": r.rating,
                    "comment": r.comment or "",
                    "customer_name": u.name if u else "Anonymous",
                    "created_at": r.created_at.isoformat() if (r and hasattr(r, 'created_at') and r.created_at) else None,
                }
            )
        return jsonify({
            "reviews": items, 
            "average_rating": getattr(business, 'average_rating', 0) or 0,
            "rating_count": getattr(business, 'rating_count', 0) or 0
        })
    except Exception as e:
        print(f"DEBUG: Reviews API Error for ID {business_id}: {e}")
        return jsonify({
            "reviews": [],
            "average_rating": 0,
            "rating_count": 0,
            "error": "Unable to load reviews at this time."
        }), 200 # Return 200 to prevent frontend Promise.all from failing the entire page load


@public_bp.get("/businesses/<int:business_id>/slots")
def get_business_slots(business_id: int):
    """Return slots for a given business and date, generated from working hours.
    Slots are 30 minutes. Existing AppointmentSlot records mark booked slots.
    Missing slots within business hours are created for booking."""
    date_str = request.args.get("date")
    if not date_str:
        return jsonify({"message": "date query parameter (YYYY-MM-DD) is required."}), 400

    try:
        selected_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "Invalid date format, use YYYY-MM-DD."}), 400

    business = Business.query.get(business_id)
    if not business:
        return jsonify({"message": "Business not found."}), 404

    open_t = business.opening_time or datetime.strptime("09:00", "%H:%M").time()
    close_t = business.closing_time or datetime.strptime("21:00", "%H:%M").time()

    stored_slots = (
        AppointmentSlot.query.filter_by(
            business_id=business_id,
            date=selected_date,
        )
        .order_by(AppointmentSlot.start_time.asc())
        .all()
    )
    stored_by_start = {s.start_time.strftime("%H:%M"): s for s in stored_slots}

    start_dt = datetime.combine(selected_date, open_t)
    end_dt = datetime.combine(selected_date, close_t)

    result = []
    current = start_dt
    while current < end_dt:
        start_label = current.strftime("%H:%M")
        end_dt_slot = current + timedelta(minutes=30)
        end_label = end_dt_slot.strftime("%H:%M")

        existing = stored_by_start.get(start_label)
        if existing:
            slot = existing
        else:
            slot = AppointmentSlot(
                business_id=business_id,
                date=selected_date,
                start_time=current.time(),
                end_time=end_dt_slot.time(),
                is_booked=False,
            )
            db.session.add(slot)
            db.session.flush()

        result.append({
            "id": slot.id,
            "date": selected_date.isoformat(),
            "start_time": start_label,
            "end_time": end_label,
            "is_booked": slot.is_booked,
        })
        current = end_dt_slot

    db.session.commit()
    return jsonify(result)


@public_bp.get("/slots")
def get_slots():
    """Return strictly the real database slots created by the business owner."""
    business_id = request.args.get("business_id", type=int)
    date_str = request.args.get("date")

    if not business_id or not date_str:
        return (
            jsonify({"message": "business_id and date query parameters are required (YYYY-MM-DD)."}),
            400,
        )

    try:
        selected_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "Invalid date format, use YYYY-MM-DD."}), 400

    business = Business.query.get(business_id)
    if not business:
        return jsonify({"message": "Business not found."}), 404

    # Fetch ONLY stored slots for this business/date
    stored_slots = (
        AppointmentSlot.query.filter_by(
            business_id=business_id,
            date=selected_date,
        )
        .order_by(AppointmentSlot.start_time.asc())
        .all()
    )

    result = []
    for s in stored_slots:
        result.append({
            "id": s.id,
            "date": s.date.isoformat(),
            "start_time": s.start_time.strftime("%H:%M"),
            "end_time": s.end_time.strftime("%H:%M"),
            "is_booked": s.is_booked,
        })

    return jsonify(result)
