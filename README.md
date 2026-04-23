# Apointz – Luxury Appointment Booking

Apointz is a modern full‑stack appointment booking platform that lets users reserve precise time slots at salons, hospitals, and banks so they never have to wait in line.

It consists of:

- **Backend**: Python Flask API with JWT auth and SQLite via SQLAlchemy
- **Frontend**: React single‑page app built with Vite

---

## Running the project

### 1. Backend (Flask + SQLite)

From the project root:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # on Windows
pip install -r requirements.txt
python app.py
```

The API will run by default on `http://localhost:5000`.

The first run will automatically:

- Create the SQLite database file `apointz.db`
- Create the tables for **Users, Services, Businesses, Appointment Slots, Bookings**
- Seed the high‑level **services**: Salon, Hospital, Bank

### 2. Frontend (React + Vite)

From the project root in a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The app will run on `http://localhost:5173` and is preconfigured to talk to the Flask backend at `http://localhost:5000`.

You can override the backend URL by creating a `.env` file in `frontend`:

```bash
VITE_API_BASE_URL=http://localhost:5000
```

---

## Core features

- **Landing page with hero section** and luxury dark UI (white/dark grey with gold accents, glassmorphism, soft gradients)
- **Service cards** for Salons, Hospitals, Banks with hover effects and icons
- **Search & discovery**
  - Filter businesses by name and city
  - See ratings on each business card
- **Booking flow**
  - Select service → business → date → live available time slots
  - Slots become unavailable as soon as they are booked
  - On‑screen confirmation toast after booking
- **User dashboard**
  - Upcoming appointments with **cancel** and **reschedule** actions
  - Appointment history with status badges
  - Smooth modal for rescheduling with fresh slot lookup
- **Admin panel**
  - Add new services (e.g., new categories)
  - Add new businesses for each service
  - Create individual time slots per business and date
  - View recent bookings with status and basic user info

---

## API overview

Base URL: `http://localhost:5000/api`

### Auth

- `POST /auth/register`
  - Body: `{ "name", "email", "password" }`
  - Creates a regular user account
  - First user who registers with `"is_admin": true` becomes an admin
- `POST /auth/login`
  - Body: `{ "email", "password" }`
  - Returns `{ access_token, user }`
  - JWT is used for all authenticated operations

### Public

- `GET /services`
  - List of Salon / Hospital / Bank services (and any others created by admin)
- `GET /services/:serviceId/businesses?q=&city=`
  - Filter businesses by search query and city
- `GET /businesses/:businessId/slots?date=YYYY-MM-DD`
  - Returns **only available** (unbooked) slots for the selected date

### Bookings (authenticated)

All booking endpoints require the `Authorization: Bearer <token>` header.

- `POST /bookings`
  - Body: `{ "business_id", "slot_id" }`
  - Marks the slot as booked and creates a booking record
- `GET /bookings/me`
  - Returns `{ upcoming: [...], history: [...] }`
- `PATCH /bookings/:id/cancel`
  - Cancels a booking and frees up the slot
- `PATCH /bookings/:id/reschedule`
  - Body: `{ "slot_id": <newSlotId> }`
  - Moves booking to a new slot and frees the old one

### Ratings (authenticated)

- `POST /businesses/:businessId/rating`
  - Body: `{ "rating": 1–5 }`
  - Updates the rolling average rating and count for the business

### Admin (authenticated, `is_admin: true` in JWT)

- `POST /admin/services`
  - Add new high‑level services
- `POST /admin/businesses`
  - Add businesses assigned to a service
- `POST /admin/businesses/:businessId/slots`
  - Create a new slot for a business on a given date/time
- `GET /admin/bookings`
  - Overview of all bookings

---

## Admin user notes

- The **first** registered user who includes `"is_admin": true` in the JSON body will become an admin.
- Subsequent users cannot self‑assign admin via the public API.
- You can also promote a user manually by updating the `users.is_admin` column directly in the SQLite database if needed.

---

## Design & UX

- Luxury dark theme with **gold accent** and soft gradients
- Glassmorphism cards, subtle depth shadows, and rounded geometry
- Smooth transitions on hover, focus, and layout changes
- Fully responsive across desktop, tablet, and mobile

