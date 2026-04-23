import os
import sys
import logging
from urllib.parse import quote_plus
from dotenv import load_dotenv
from datetime import timedelta

from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail

from database import db
from models import seed_initial_services

from routes_admin import admin_bp
from routes_auth import auth_bp, login as auth_login, register as auth_register
from routes_bookings import (
    bookings_bp,
    cancel_booking as api_cancel_booking,
    create_booking as api_create_booking,
    get_my_bookings as api_get_my_bookings,
    reschedule_booking as api_reschedule_booking,
    pay_for_booking as api_pay_for_booking,
)
from routes_business import business_bp
from routes_public import (
    public_bp,
    get_businesses as api_get_businesses,
    get_services as api_get_services,
    get_slots as api_get_slots,
)
from routes_notifications import notifications_bp
from routes_rating import rating_bp
from routes_subscription import bp as subscription_bp

# ---------------- LOGGING ----------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
)

# Fix path
sys.path.append(os.path.dirname(__file__))

# Load env
base_dir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(base_dir, ".env"))


def _build_database_uri():
    DATABASE_URL = os.environ.get("DATABASE_URL")

    if not DATABASE_URL:
        DATABASE_URL = "sqlite:///apointz.db"

    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    return DATABASE_URL


def create_app():
    app = Flask(__name__)

    # ---------------- CONFIG ----------------
    app.config["SQLALCHEMY_DATABASE_URI"] = _build_database_uri()
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.getenv("APOINTZ_SECRET_KEY", "dev-secret")
    app.config["JWT_SECRET_KEY"] = os.getenv("APOINTZ_JWT_SECRET_KEY", "dev-jwt")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

    # Mail (optional)
    app.config["MAIL_SERVER"] = os.getenv("APOINTZ_MAIL_SERVER")
    app.config["MAIL_PORT"] = int(os.getenv("APOINTZ_MAIL_PORT", 587))
    app.config["MAIL_USE_TLS"] = True
    app.config["MAIL_USERNAME"] = os.getenv("APOINTZ_MAIL_USERNAME")
    app.config["MAIL_PASSWORD"] = os.getenv("APOINTZ_MAIL_PASSWORD")

    # ---------------- INIT ----------------
    db.init_app(app)
    JWTManager(app)
    Mail(app)

    # ---------------- ✅ CORS ----------------
    CORS(
        app,
        resources={r"/*": {"origins": "*"}},
        allow_headers=["Authorization", "Content-Type", "token"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        max_age=3600
    )

    # ---------------- REQUEST LOGGING ----------------
    @app.before_request
    def log_request_info():
        app.logger.info(f">>> Request: {request.method} {request.url}")
        if request.data:
            app.logger.info(f"Body: {request.get_data(as_text=True)[:500]}")

    @app.after_request
    def log_response_info(response):
        app.logger.info(f"<<< Response: {response.status}")
        return response

    # ---------------- ROUTES ----------------
    # Register blueprints with explicit prefixes
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(public_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(business_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(rating_bp)
    app.register_blueprint(subscription_bp, url_prefix="/api")

    # ---------------- CORE ROUTES ----------------
    @app.route("/", methods=["GET"])
    def index():
        return "Backend running"

    @app.route("/api/test", methods=["GET"])
    def test_route():
        return jsonify({"msg": "ok", "status": "active"})

    # ---------------- HEALTH ----------------
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    # ---------------- ALIASES (Compatibility) ----------------
    @app.post("/login")
    def login_alias():
        return auth_login()

    @app.post("/register")
    def register_alias():
        return auth_register()

    @app.get("/services")
    def services_alias():
        return api_get_services()

    @app.get("/businesses")
    def businesses_alias():
        return api_get_businesses()

    @app.get("/slots")
    def slots_alias():
        return api_get_slots()

    @app.post("/book")
    def book_alias():
        return api_create_booking()

    @app.get("/user/bookings")
    def user_bookings_alias():
        return api_get_my_bookings()

    @app.delete("/cancel/<int:booking_id>")
    def cancel_alias(booking_id):
        return api_cancel_booking(booking_id)

    @app.put("/reschedule/<int:booking_id>")
    def reschedule_alias(booking_id):
        return api_reschedule_booking(booking_id)

    # ---------------- DB INIT ----------------
    def migrate_db():
        from sqlalchemy import text
        try:
            with db.engine.connect() as conn:
                if db.engine.name == 'sqlite':
                    cols = [r[1] for r in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
                    if 'subscription_plan' not in cols:
                        conn.execute(text("ALTER TABLE users ADD COLUMN subscription_plan VARCHAR(20)"))
                    if 'subscription_expiry' not in cols:
                        conn.execute(text("ALTER TABLE users ADD COLUMN subscription_expiry DATETIME"))
                    conn.commit()
                else: # Postgres
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20)"))
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMP"))
                    conn.commit()
            app.logger.info("Auto-migration check completed")
        except Exception as e:
            app.logger.error(f"Migration check error: {e}")

    with app.app_context():
        try:
            db.create_all()
            migrate_db()
            seed_initial_services()
            app.logger.info("Database/Models initialized")
        except Exception as e:
            app.logger.error(f"DB INIT ERROR: {e}")

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
