from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from models import db, User
from flask_jwt_extended import jwt_required, get_jwt_identity

bp = Blueprint("subscription", __name__)

PLANS = {
    "BASIC": {"days": 30, "price": 99},
    "PRO": {"days": 90, "price": 249},
    "PREMIUM": {"days": 365, "price": 799},
}

@bp.route("/subscription/plans", methods=["GET"])
def get_plans():
    return jsonify(PLANS)

@bp.route("/subscription/subscribe", methods=["POST"])
@jwt_required()
def subscribe():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    plan = data.get("plan")
    
    if plan not in PLANS:
        return jsonify({"error": "Invalid plan"}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    user.subscription_plan = plan
    user.subscription_expiry = datetime.utcnow() + timedelta(days=PLANS[plan]["days"])
    
    db.session.commit()
    
    return jsonify({
        "msg": "Subscription activated",
        "plan": plan,
        "expiry": user.subscription_expiry.isoformat()
    })
