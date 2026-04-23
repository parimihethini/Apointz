from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from database import db
from models import Notification

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@notifications_bp.get("")
@jwt_required()
def get_notifications():
    user_id = int(get_jwt_identity())
    unread_only = request.args.get("unread", "").lower() == "true"

    query = Notification.query.filter_by(user_id=user_id).order_by(
        Notification.created_at.desc()
    )
    if unread_only:
        query = query.filter_by(is_read=False)
    notifications = query.limit(50).all()

    return jsonify(
        [
            {
                "id": n.id,
                "message": n.message,
                "type": n.type or "booking_created",
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifications
        ]
    )


@notifications_bp.post("/read")
@jwt_required()
def mark_read():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    notification_id = data.get("notification_id")
    mark_all = data.get("mark_all", False)

    if mark_all:
        Notification.query.filter_by(user_id=user_id, is_read=False).update(
            {"is_read": True}
        )
        db.session.commit()
        return jsonify({"message": "All notifications marked as read."})

    if not notification_id:
        return jsonify({"message": "notification_id or mark_all is required."}), 400

    n = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if not n:
        return jsonify({"message": "Notification not found."}), 404

    n.is_read = True
    db.session.commit()
    return jsonify({"message": "Notification marked as read."})
