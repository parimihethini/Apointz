import traceback

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from database import db
from models import Business, Review

rating_bp = Blueprint("rating", __name__, url_prefix="/api")


@rating_bp.post("/businesses/<int:business_id>/rating")
@jwt_required()
def rate_business(business_id: int):
    print(f"[rating] POST /businesses/{business_id}/rating hit")

    user_id = int(get_jwt_identity())
    claims  = get_jwt()
    role    = (claims.get("role") or "customer").lower()

    if role == "business":
        return jsonify({"message": "Business accounts cannot rate other businesses."}), 403

    data    = request.get_json(silent=True) or {}
    rating  = data.get("rating")
    comment = (data.get("comment") or "").strip()

    # ── Validate rating value ──────────────────────────────────────────────────
    if rating is None:
        return jsonify({"message": "rating is required."}), 400

    try:
        rating = int(round(float(rating)))
    except (TypeError, ValueError):
        return jsonify({"message": "rating must be a number between 1 and 5."}), 400

    if not (1 <= rating <= 5):
        return jsonify({"message": "rating must be between 1 and 5."}), 400

    try:
        # ── Fetch business — return JSON 404, never HTML ───────────────────────
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"message": "Business not found."}), 404

        # ── Insert or update review ────────────────────────────────────────────
        existing = Review.query.filter_by(
            business_id=business_id, user_id=user_id
        ).first()

        if existing:
            existing.rating  = rating
            existing.comment = comment
            print(f"[rating] Updated review id={existing.id} for user {user_id}")
        else:
            review = Review(
                user_id=user_id,
                business_id=business_id,
                rating=rating,
                comment=comment,
            )
            db.session.add(review)
            print(f"[rating] Created new review for user {user_id}")

        # ── Flush so the new/updated row is visible to the next query ──────────
        db.session.flush()

        # ── Recalculate average ────────────────────────────────────────────────
        reviews = Review.query.filter_by(business_id=business_id).all()
        count   = len(reviews)
        avg     = round(sum(r.rating for r in reviews) / count, 2) if count else float(rating)

        business.average_rating = avg
        business.rating_count   = count

        db.session.commit()
        print(f"[rating] Saved — avg={avg}, count={count}")

        return jsonify(
            {
                "message":        "Thank you for your feedback.",
                "average_rating": avg,
                "rating_count":   count,
            }
        )

    except Exception as exc:
        db.session.rollback()
        traceback.print_exc()
        print(f"[rating] ERROR: {exc}")
        return jsonify({"message": "An error occurred while submitting your rating.", "error": str(exc)}), 500
