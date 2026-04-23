from datetime import timedelta
import re
import traceback
import threading
import os
import random
from uuid import uuid4

from flask import Blueprint, jsonify, request, url_for, current_app
from flask_jwt_extended import create_access_token
from flask_mail import Message
from sqlalchemy import func
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

from database import db
from models import Business, User, UserRole, Service

auth_bp = Blueprint("auth", __name__)


EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _send_email_async(app, msg):
    """Send a Flask-Mail message in a background daemon thread.
    
    Using a background thread means the HTTP response returns immediately
    without waiting for the SMTP handshake. The app context is passed
    explicitly because the thread doesn't have one by default.
    """
    def _send():
        try:
            with app.app_context():
                mail = app.extensions['mail']
                mail.send(msg)
        except Exception as e:
            print(f"[EMAIL] Background send failed: {e}")

    t = threading.Thread(target=_send, daemon=True)
    t.start()


@auth_bp.post("/auth/register")
def register():
    """Customer registration."""
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = (data.get("email") or "").lower().strip()
    password = data.get("password")
    phone = (data.get("phone") or "").strip()

    if not name or not email or not password:
        return jsonify({"message": "Name, email and password are required."}), 400

    if not EMAIL_REGEX.match(email):
        return jsonify({"message": "Please provide a valid email address."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email is already registered."}), 400

    otp = str(random.randint(100000, 999999))

    user = User(name=name, email=email, phone=phone or None)
    user.set_role(UserRole.CUSTOMER)
    user.set_password(password)
    user.is_verified = False
    user.verification_code = otp
    db.session.add(user)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"[REGISTER ERROR] DB commit failed: {e}")
        traceback.print_exc()
        return jsonify({"message": "Registration failed due to a database error.", "detail": str(e)}), 500

    # Send verification email in background (non-blocking — never delays the HTTP response)
    try:
        msg = Message(
            subject="Verify your Apointz account",
            recipients=[email],
            body=(f"Welcome to Apointz!\n\nYour verification code is: {otp}\n\n"
                  f"If you didn't create an account, you can safely ignore this email.\n\n"
                  f"Best regards,\nThe Apointz Team")
        )
        _send_email_async(current_app._get_current_object(), msg)
    except Exception as e:
        print(f"[REGISTER] Could not queue verification email: {e}")
        # Never fail registration because of email

    return jsonify({"message": "Registration successful. Please check your email to verify your account."}), 201


@auth_bp.post("/auth/register-business")
def register_business():
    """Business owner registration with business profile."""
    data = request.get_json() or {}

    owner_name = (data.get("owner_name") or "").strip()
    business_name = (data.get("business_name") or "").strip()
    email = (data.get("email") or "").lower().strip()
    password = data.get("password")
    phone = (data.get("phone") or "").strip()
    category = (data.get("category") or "").strip()
    address = (data.get("address") or "").strip()
    city = (data.get("city") or "").strip()
    state = (data.get("state") or "").strip()
    pincode = (data.get("pincode") or "").strip()
    services_offered = (data.get("services_offered") or "").strip()
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    opening_time = data.get("opening_time")
    closing_time = data.get("closing_time")
    map_url = (data.get("map_url") or "").strip()

    if not all([owner_name, business_name, email, password, phone, category, address, city]):
        return (
            jsonify(
                {
                    "message": "owner_name, business_name, email, password, phone, category, address and city are required."
                }
            ),
            400,
        )

    if not EMAIL_REGEX.match(email):
        return jsonify({"message": "Please provide a valid email address."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email is already registered."}), 400

    # Create user with business role
    otp = str(random.randint(100000, 999999))
    user = User(name=owner_name, email=email, phone=phone or None)
    user.set_role(UserRole.BUSINESS)
    user.set_password(password)
    user.is_verified = False
    user.verification_code = otp
    db.session.add(user)
    db.session.flush()

    # Parse opening/closing times if provided
    from datetime import datetime as _dt

    opening = None
    closing = None
    try:
        if opening_time:
            opening = _dt.strptime(opening_time, "%H:%M").time()
        if closing_time:
            closing = _dt.strptime(closing_time, "%H:%M").time()
    except ValueError:
        return jsonify({"message": "opening_time/closing_time must be in HH:MM format."}), 400

    # service_id is required: use provided value, or resolve from category, or default to first service
    service_id = data.get("service_id")
    if not service_id and category:
        svc = (
            Service.query.filter(
                func.lower(Service.name) == category.lower().strip()
            ).first()
        )
        if svc:
            service_id = svc.id
    if not service_id:
        first_svc = Service.query.order_by(Service.id.asc()).first()
        service_id = first_svc.id if first_svc else None
    if not service_id:
        return jsonify({"message": "No service category available. Please contact support."}), 400

    business = Business(
        name=business_name,
        owner_name=owner_name,
        phone=phone,
        category=category,
        address=address,
        city=city,
        state=state,
        pincode=pincode,
        latitude=latitude,
        longitude=longitude,
        opening_time=opening,
        closing_time=closing,
        services_offered=services_offered,
        owner_id=user.id,
        service_id=service_id,
        map_url=map_url,
    )
    db.session.add(business)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"[REGISTER BUSINESS ERROR] DB commit failed: {e}")
        traceback.print_exc()
        return jsonify({"message": "Business registration failed due to a database error.", "detail": str(e)}), 500

    # Send verification email in background (non-blocking)
    try:
        msg = Message(
            subject="Verify your Apointz business account",
            recipients=[email],
            body=(f"Welcome to Apointz!\n\nYour business account has been created. "
                  f"Your verification code is: {otp}\n\n"
                  f"If you didn't create an account, you can safely ignore this email.\n\n"
                  f"Best regards,\nThe Apointz Team")
        )
        _send_email_async(current_app._get_current_object(), msg)
    except Exception as e:
        print(f"[REGISTER BUSINESS] Could not queue verification email: {e}")

    return jsonify({"message": "Business account created. Please check your email to verify your account."}), 201


@auth_bp.post("/auth/login")
def login():
    """Authenticate user and return JWT."""
    print("LOGIN ATTEMPT")
    try:
        data = request.get_json(force=True)
        email = (data.get("email") or "").lower().strip()
        password = data.get("password")

        if not email or not password:
            return jsonify({"message": "Email and password are required."}), 400

        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({"message": "Invalid email or password."}), 401

        if not user.check_password(password):
            return jsonify({"message": "Invalid email or password."}), 401

        if not user.is_verified:
            return (
                jsonify(
                    {
                        "message": "Account not verified. Please verify your email.",
                        "needs_verification": True,
                        "email": email,
                    }
                ),
                401,
            )

        # Success - create token
        role = (user.role or UserRole.CUSTOMER).lower()
        additional_claims = {"is_admin": user.is_admin, "role": role}
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims=additional_claims,
            expires_delta=timedelta(hours=8),
        )

        return (
            jsonify(
                {
                    "message": "Login successful",
                    "token": access_token,
                    "access_token": access_token,
                    "user": user.to_dict(),
                    "role": role,
                }
            ),
            200,
        )

    except Exception as e:
        print(f"[LOGIN ERROR] {e}")
        traceback.print_exc()
        return jsonify({"message": "An error occurred during login.", "detail": str(e)}), 500


@auth_bp.post("/auth/google-login")
def google_login():
    """Authenticate or create a user via Google Sign-In ID token."""
    data = request.get_json() or {}
    token = data.get("token")
    if not token:
        return jsonify({"message": "Token is required."}), 400

    print(f"Received Google token: {token[:50]}...")  # Log first 50 chars for debugging

    try:
        google_client_id = os.getenv("APOINTZ_GOOGLE_CLIENT_ID")
        if not google_client_id:
            print("[GOOGLE AUTH] Google Client ID not configured (APOINTZ_GOOGLE_CLIENT_ID is None)")
            return jsonify({"message": "Google Client ID not configured."}), 500

        idinfo = id_token.verify_oauth2_token(token, grequests.Request(), google_client_id)
        
        # Audience validation (verify_oauth2_token already does this, but for extra safety)
        if idinfo.get("aud") != google_client_id:
            print(f"[GOOGLE AUTH] Audience mismatch: expected {google_client_id}, got {idinfo.get('aud')}")
            return jsonify({"message": "Invalid Google token audience."}), 401

        email = idinfo.get("email")
        name = (idinfo.get("name") or (email.split("@")[0] if email else "User"))
        picture = idinfo.get("picture")

    except ValueError as e:
        print(f"[GOOGLE AUTH] Token verification error: {e}")
        return jsonify({"message": "Invalid Google token.", "error": str(e)}), 400
    except Exception as e:
        print(f"[GOOGLE AUTH] Unexpected error in Google login verification: {e}")
        return jsonify({"message": "Google authentication failed.", "error": str(e)}), 500

    if not email:
        print("[GOOGLE AUTH] Failed to extract email from token")
        return jsonify({"message": "Google account missing email."}), 400

    print(f"[GOOGLE AUTH] Processing user for email: {email}")
    user = User.query.filter_by(email=email).first()
    if not user:
        # Return new_user=True so frontend can ask for role
        return (
            jsonify(
                {
                    "new_user": True,
                    "email": email,
                    "name": name,
                    "picture": picture,
                }
            ),
            200,
        )
    else:
        # ensure verified and provider set
        user.is_verified = True
        user.avatar_url = picture or user.avatar_url
        if not getattr(user, "auth_provider", None):
            user.auth_provider = "google"
        db.session.commit()

    role = (user.role or "customer").lower()
    additional_claims = {"is_admin": user.is_admin, "role": role}
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims=additional_claims,
        expires_delta=timedelta(hours=8),
    )

    return (
        jsonify(
            {
                "message": "Google login success",
                "token": access_token,
                "access_token": access_token,
                "role": role,
                "user_id": str(user.id),
                "user": user.to_dict(),
            }
        ),
        200,
    )


@auth_bp.post("/auth/verify-code")
def verify_code():
    """Verify registration using a 6-digit OTP code."""
    data = request.get_json() or {}
    email = (data.get("email") or "").lower().strip()
    code = (data.get("code") or "").strip()

    if not email or not code:
        return jsonify({"message": "Email and code are required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "No account found with this email."}), 404

    if user.is_verified:
        return jsonify({"message": "Account is already verified."}), 200

    if user.verification_code != code:
        return jsonify({"message": "Invalid verification code."}), 400

    user.is_verified = True
    user.verification_code = None
    db.session.commit()

    return jsonify({"message": "Email verified successfully. You can now log in."}), 200


@auth_bp.post("/auth/resend-verification")
def resend_verification():
    data = request.get_json() or {}
    email = (data.get("email") or "").lower().strip()

    if not email:
        return jsonify({"message": "Email is required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "No account found with this email."}), 404

    if user.is_verified:
        return jsonify({"message": "This account is already verified."}), 400

    otp = str(random.randint(100000, 999999))
    user.verification_code = otp
    db.session.commit()

    # Send verification email
    try:
        mail = current_app.extensions['mail']
        msg = Message(
            subject="Verify your Apointz account",
            recipients=[email],
            body=f"""Welcome to Apointz!

Your new verification code is: {otp}

If you didn't create an account, you can safely ignore this email.

Best regards,
The Apointz Team"""
        )
        mail.send(msg)
    except Exception as e:
        print(f"Failed to send verification email: {e}")
        return jsonify({"message": "Failed to send verification email. Please try again later."}), 500

    return jsonify({"message": "Verification code sent. Please check your inbox."}), 200




@auth_bp.post("/auth/forgot-password")
def forgot_password():
    data = request.get_json() or {}
    email = (data.get("email") or "").lower().strip()
    
    if not email:
        return jsonify({"message": "Email is required."}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "If an account with that email exists, we sent a password reset link."}), 200
        
    token = uuid4().hex
    user.verification_token = token  # reuse token field for password reset tracking
    db.session.commit()
    
    try:
        # Generate the frontend reset link dynamically. Allow using an env var or a local IP
        frontend_url = os.environ.get("FRONTEND_URL", "https://your-frontend-domain.vercel.app")
        # For local dev fallback, typically React/Vite runs on 5173 or 3000
        if "localhost" in frontend_url and os.environ.get("FLASK_ENV") == "development":
           pass
           
        reset_link = f"{frontend_url}/reset-password/{token}"
        
        msg = Message(
            subject="Reset your Apointz password",
            recipients=[email],
            body=f"You requested a password reset.\n\nPlease click the link below to reset your password:\n{reset_link}\n\nIf you didn't request this, you can safely ignore this email."
        )
        _send_email_async(current_app._get_current_object(), msg)
        print(f"Sent password reset link to {email}: {reset_link}")
    except Exception as e:
        print(f"Failed to send reset email: {e}")
        
    return jsonify({"message": "If an account with that email exists, we sent a password reset link."}), 200


@auth_bp.post("/auth/reset-password/<token>")
def reset_password(token):
    data = request.get_json() or {}
    password = data.get("password")
    
    if not password:
        return jsonify({"message": "New password is required."}), 400
        
    user = User.query.filter_by(verification_token=token).first()
    if not user:
        return jsonify({"message": "Invalid or expired reset token."}), 400
        
    user.set_password(password)
    user.verification_token = None
    db.session.commit()
    
    return jsonify({"message": "Password reset successfully. You can now log in."}), 200
