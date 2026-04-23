from datetime import datetime, date, time

from werkzeug.security import generate_password_hash, check_password_hash

from database import db


class UserRole:
    CUSTOMER = "customer"
    BUSINESS = "business"
    ADMIN = "admin"


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(40))
    password_hash = db.Column(db.String(255), nullable=True)
    # OAuth provider: 'local' (email/password) or e.g. 'google'
    auth_provider = db.Column(db.String(30), nullable=False, default="local")
    # Optional avatar/photo URL from OAuth providers
    avatar_url = db.Column(db.String(255))
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_code = db.Column(db.String(10))
    # Keep is_admin for backwards compatibility, but prefer role going forward
    is_admin = db.Column(db.Boolean, default=False)
    role = db.Column(db.String(20), nullable=False, default=UserRole.CUSTOMER)
    subscription_plan = db.Column(db.String(20), nullable=True)
    subscription_expiry = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    bookings = db.relationship("Booking", back_populates="user", lazy=True)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        # If no password is set (OAuth-only account) or provider isn't local, fail password checks
        if not self.password_hash or (hasattr(self, "auth_provider") and self.auth_provider != "local"):
            return False
        return check_password_hash(self.password_hash, password)

    def set_role(self, role: str) -> None:
        """Set role and keep is_admin flag in sync."""
        role = (role or UserRole.CUSTOMER).lower()
        if role not in {UserRole.CUSTOMER, UserRole.BUSINESS, UserRole.ADMIN}:
            role = UserRole.CUSTOMER
        self.role = role
        self.is_admin = role == UserRole.ADMIN

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "is_admin": self.is_admin,
            "avatar_url": self.avatar_url,
            "subscription_plan": self.subscription_plan,
            "subscription_expiry": self.subscription_expiry.isoformat() if self.subscription_expiry else None,
        }


class Service(db.Model):
    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False, unique=True)
    description = db.Column(db.String(255))

    businesses = db.relationship("Business", back_populates="service", lazy=True)


class Business(db.Model):
    __tablename__ = "businesses"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    owner_name = db.Column(db.String(150))
    phone = db.Column(db.String(40))
    category = db.Column(db.String(80))
    address = db.Column(db.String(255), nullable=False)
    city = db.Column(db.String(120), nullable=False)
    state = db.Column(db.String(120))
    pincode = db.Column(db.String(20))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    map_url = db.Column(db.String(2048), nullable=True)
    opening_time = db.Column(db.Time)
    closing_time = db.Column(db.Time)
    services_offered = db.Column(db.Text)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    average_rating = db.Column(db.Float, default=0.0)
    rating_count = db.Column(db.Integer, default=0)
    extra_data = db.Column(db.JSON, nullable=True, default={})

    service = db.relationship("Service", back_populates="businesses")
    owner = db.relationship("User", backref="businesses_owned")
    slots = db.relationship("AppointmentSlot", back_populates="business", lazy=True)
    bookings = db.relationship("Booking", back_populates="business", lazy=True)


class AppointmentSlot(db.Model):
    __tablename__ = "appointment_slots"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False)
    date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    is_booked = db.Column(db.Boolean, default=False, index=True)

    business = db.relationship("Business", back_populates="slots")
    bookings = db.relationship("Booking", back_populates="slot", lazy=True)


class BookingStatus:
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentStatus:
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    PARTIAL_REFUND = "partial_refund"
    FULL_REFUND = "full_refund"
    NO_REFUND = "no_refund"


class Booking(db.Model):
    __tablename__ = "bookings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False)
    slot_id = db.Column(db.Integer, db.ForeignKey("appointment_slots.id"), nullable=False)
    service_name = db.Column(db.String(150))
    appointment_date = db.Column(db.Date)
    appointment_time = db.Column(db.Time)
    status = db.Column(db.String(20), default=BookingStatus.PENDING, index=True)
    payment_status = db.Column(db.String(20), default=PaymentStatus.PENDING, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="bookings")
    business = db.relationship("Business", back_populates="bookings")
    slot = db.relationship("AppointmentSlot", back_populates="bookings")
    payment = db.relationship("Payment", back_populates="booking", uselist=False, cascade="all, delete-orphan")


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=False, unique=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)  # Original booking amount
    refund_amount = db.Column(db.Float, default=0.0)  # Amount refunded (if any)
    status = db.Column(db.String(20), default=PaymentStatus.PENDING, index=True)
    payment_method = db.Column(db.String(50), nullable=True)  # 'credit_card', 'upi', etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    booking = db.relationship("Booking", back_populates="payment")
    user = db.relationship("User", backref="payments")


class NotificationType:
    BOOKING_CREATED = "booking_created"
    BOOKING_CONFIRMED = "booking_confirmed"
    BOOKING_CANCELLED = "booking_cancelled"
    APPOINTMENT_REMINDER = "appointment_reminder"


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(40), default=NotificationType.BOOKING_CREATED)
    is_read = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    customer_name = db.Column(db.String(120))
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)



def seed_initial_services():
    """Create default high-level services if they do not exist."""
    defaults = [
        ("Salon", "Book premium salon and spa appointments."),
        ("Hospital", "Schedule consultations and checkups at hospitals and clinics."),
        ("Bank", "Avoid queues by booking bank and financial service slots."),
    ]
    for name, description in defaults:
        if not Service.query.filter_by(name=name).first():
            db.session.add(Service(name=name, description=description))
    db.session.commit()

