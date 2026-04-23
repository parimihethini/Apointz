import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { showToast } from "../components/ToastHost";
import MapView from "../components/MapView";
import { formatRating } from "../utils";
import PaymentModal from "../components/PaymentModal";

const BookingPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);

  useEffect(() => {
    if (!user) {
      console.warn("🔐 User not logged in - skipping booking history load");
      return;
    }
    const loadHistory = async () => {
      try {
        console.log("📖 Loading booking history for user:", user.id);
        const token = localStorage.getItem("apointz_token");
        console.log("🔑 Token present:", !!token);
        
        const { data } = await api.get("/bookings/me");
        const combined = [...(data.upcoming || []), ...(data.history || [])];
        
        console.log("✅ Bookings loaded:", {
          upcoming: data.upcoming?.length || 0,
          history: data.history?.length || 0,
          total: combined.length,
          firstBooking: combined[0]
        });
        
        setBookingHistory(combined);
      } catch (err) {
        console.error("❌ History fetch error:", {
          status: err.response?.status,
          message: err.response?.data?.message,
          error: err.message
        });
      }
    };
    loadHistory();
  }, [user]);

  const categoryMapping = {
    hospital: ["hospital", "clinic", "dental", "medical", "doctor"],
    salon: ["salon", "beauty", "hair", "spa"],
    bank: ["bank", "finance", "atm"],
  };

  useEffect(() => {
    const loadServices = async () => {
      const { data } = await api.get("/services");
      setServices(data);

      if (state?.preselectedServiceType) {
        const match = data.find((s) => s.name.toLowerCase() === state.preselectedServiceType.toLowerCase());
        if (match) setSelectedServiceId(match.id);
      } else if (state?.preselectedServiceId) {
        setSelectedServiceId(state.preselectedServiceId);
      }
    };
    loadServices().catch(() => showToast("Unable to load services.", "error"));
  }, [state]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      null,
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    const loadBusinesses = async () => {
      if (!selectedServiceId) {
        setBusinesses([]);
        setSelectedBusiness(null);
        return;
      }
      setLoading(true);
      try {
        const params = { service_id: selectedServiceId };
        if (search) params.q = search;
        if (city) params.location = city;

        const { data } = await api.get("/businesses", { params });
        setBusinesses(data);

        if (state?.preselectedBusinessId) {
          const found = data.find(b => b.id === state.preselectedBusinessId);
          if (found) setSelectedBusiness(found);
        }
      } catch (err) {
        showToast("Error loading businesses.", "error");
      } finally {
        setLoading(false);
      }
    };
    loadBusinesses();
  }, [selectedServiceId, search, city]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedBusiness || !selectedDate) {
        setSlots([]);
        setSelectedSlot(null);
        return;
      }
      setLoadingSlots(true);
      try {
        const { data } = await api.get('/slots', {
          params: { business_id: selectedBusiness.id, date: selectedDate }
        });
        setSlots(data || []);
      } finally {
        setLoadingSlots(false);
      }
    };
    loadSlots();
  }, [selectedBusiness, selectedDate]);

  const handleBook = async () => {
    if (!user) {
      showToast("Please login to book.", "error");
      navigate("/login");
      return;
    }
    if (!selectedBusiness || !selectedSlot) return;

    // Store booking details and show payment modal first
    setPendingBooking({
      businessId: selectedBusiness.id,
      businessName: selectedBusiness.name,
      slotId: selectedSlot.id,
      date: selectedDate,
      time: `${selectedSlot.start_time} - ${selectedSlot.end_time}`,
    });

    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentInfo) => {
    if (!pendingBooking) return;

    setSubmitting(true);
    try {
      console.log("📝 Creating booking with payment:", {
        business_id: pendingBooking.businessId,
        slot_id: pendingBooking.slotId,
        paymentInfo
      });

      // Create the booking after payment is successful
      const { data } = await api.post("/bookings", {
        business_id: pendingBooking.businessId,
        slot_id: pendingBooking.slotId,
      });

      console.log("✅ Booking created successfully:", {
        booking: data.booking,
        payment: data.payment
      });

      showToast("Appointment booked successfully!", "success");

      // Close payment modal
      setShowPaymentModal(false);

      // Show confirmation
      setConfirmation({
        business: selectedBusiness,
        date: pendingBooking.date,
        slot: selectedSlot,
        paymentInfo: paymentInfo,
      });

      // Reset booking states
      setPendingBooking(null);
      setSelectedBusiness(null);
      setSelectedSlot(null);
      setSelectedDate("");

      // Refresh booking history
      const { data: historyData } = await api.get("/bookings/me");
      const combined = [...(historyData.upcoming || []), ...(historyData.history || [])];
      
      console.log("✅ Booking history refreshed:", {
        upcoming: historyData.upcoming?.length || 0,
        history: historyData.history?.length || 0
      });
      
      setBookingHistory(combined);
    } catch (e) {
      showToast(e.response?.data?.message || "Booking failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayNow = async (bookingId) => {
    try {
      setSubmitting(true);
      console.log("💳 Processing payment for booking:", bookingId);
      
      const { data } = await api.post(`/bookings/${bookingId}/pay`, {
        payment_method: "card"
      });
      
      console.log("✅ Payment successful:", data.payment);
      showToast("Payment successful!", "success");
      
      // Reload booking history
      const { data: historyData } = await api.get("/bookings/me");
      const combined = [...(historyData.upcoming || []), ...(historyData.history || [])];
      setBookingHistory(combined);
    } catch (e) {
      console.error("❌ Payment error:", e.response?.data || e.message);
      showToast(e.response?.data?.message || "Payment failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      setSubmitting(true);
      console.log("🚫 Cancelling booking:", bookingId);
      
      const { data } = await api.patch(`/bookings/${bookingId}/cancel`);
      
      // Display refund information
      const refundAmount = data?.cancellation_details?.refund_amount;
      const paymentStatus = data?.cancellation_details?.payment_status;
      
      console.log("✅ Cancellation response:", {
        refundAmount,
        paymentStatus,
        details: data.cancellation_details
      });
      
      let message = "Booking cancelled successfully.";
      if (refundAmount !== undefined) {
        if (refundAmount > 0) {
          message += ` Refund: ₹${refundAmount.toFixed(2)} (${paymentStatus})`;
        } else {
          message += " No refund applicable.";
        }
      }
      
      showToast(message, "success");
      
      // Reload booking history
      const { data: historyData } = await api.get("/bookings/me");
      const combined = [...(historyData.upcoming || []), ...(historyData.history || [])];
      
      console.log("✅ Booking history updated after cancellation");
      
      setBookingHistory(combined);
    } catch (e) {
      console.error("❌ Cancellation error:", e.response?.data || e.message);
      showToast(e.response?.data?.message || "Cancellation failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBusinesses = businesses.filter((b) => {
    if (!selectedServiceId) return true;
    const service = services.find(s => s.id === selectedServiceId);
    if (!service) return true;

    const categoryKey = service.name.toLowerCase().trim();
    const targets = categoryMapping[categoryKey] || [categoryKey];
    const bType = (b.category || b.service_type || "").toLowerCase().trim();

    return targets.some(t => bType.includes(t) || b.name.toLowerCase().includes(t));
  });

  return (
    <div className="business-page-wrapper">
      <div className="business-bg-animated">
        <div className="glow-sphere"></div>
      </div>

      <div className="dashboard-main-modern booking-container-modern">
        <div className="booking-sidebar-modern glass-card">
          <header className="sidebar-header-modern">
            <h2>Find Services</h2>
            <p className="muted small">Refine your search</p>
          </header>

          <div className="filter-group-modern">
            <label>Category</label>
            <div className="service-pills-modern">
              {services.map((s) => (
                <button
                  key={s.id}
                  className={`pill-modern ${selectedServiceId === s.id ? 'active' : ''}`}
                  onClick={() => setSelectedServiceId(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group-modern">
            <label>Location & Search</label>
            <input
              type="text"
              placeholder="Business name..."
              className="form-input-modern"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input
              type="text"
              placeholder="City or Area..."
              className="form-input-modern"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{ marginTop: '12px' }}
            />
          </div>

          <div className="filter-group-modern">
            <label>Available Places</label>
            <div className="businesses-scroller-modern">
              {loading ? (
                <div className="spinner-modern small center"></div>
              ) : filteredBusinesses.length > 0 ? (
                filteredBusinesses.map((b) => (
                  <motion.div
                    key={b.id}
                    whileHover={{ x: 5 }}
                    className={`business-item-card-modern ${selectedBusiness?.id === b.id ? 'active' : ''}`}
                    onClick={() => setSelectedBusiness(b)}
                  >
                    <h4>{b.name}</h4>
                    <p className="muted">📍 {b.city}</p>
                    {b.rating > 0 && <span className="rating-tag-mini">★ {b.rating.toFixed(1)}</span>}
                  </motion.div>
                ))
              ) : (
                <p className="muted small center">No matching businesses.</p>
              )}
            </div>
          </div>
        </div>

        <div className="booking-content-modern">
          <motion.div
            className="map-wrapper-modern glass-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <MapView userLocation={userLocation} businesses={filteredBusinesses} onSelectBusiness={setSelectedBusiness} />
          </motion.div>

          <AnimatePresence mode="wait">
            {selectedBusiness && (
              <motion.div
                key={selectedBusiness.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="booking-action-card glass-card"
                style={{ marginTop: '24px' }}
              >
                <div className="booking-header-mini">
                  <h3>Book at {selectedBusiness.name}</h3>
                  <p className="muted">📍 {selectedBusiness.address}, {selectedBusiness.city}</p>
                </div>

                <div className="booking-form-modern">
                  <div className="form-group-modern">
                    <label>Select Date</label>
                    <input
                      type="date"
                      className="form-input-modern"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                    />
                  </div>

                  <div className="form-group-modern">
                    <label>Preferred Time</label>
                    {!selectedDate ? (
                      <p className="muted small">Please choose a date to see times.</p>
                    ) : loadingSlots ? (
                      <div className="loader-mini-row"><div className="spinner-modern small"></div></div>
                    ) : slots.length > 0 ? (
                      <div className="slot-grid-modern">
                        {slots.map(s => (
                          <button
                            key={s.id}
                            disabled={s.is_booked}
                            className={`slot-btn-modern ${selectedSlot?.id === s.id ? 'active' : ''} ${s.is_booked ? 'booked' : ''}`}
                            onClick={() => setSelectedSlot(s)}
                          >
                            {s.start_time}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="muted small">No slots available for this day.</p>
                    )}
                  </div>

                  <div style={{ marginTop: '24px' }}>
                    <p className="muted small" style={{ marginBottom: '12px', textAlign: 'center' }}>
                      💳 Secure payment required to complete booking
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={!selectedSlot || submitting}
                      className="btn-primary large full-width"
                      onClick={handleBook}
                    >
                      {submitting ? "Processing..." : "💳 Proceed to Payment"}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {confirmation && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-backdrop-modern"
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="modal-modern glass-card"
            >
              <h2>✅ Booking Confirmed!</h2>
              <p>Your appointment at <strong>{confirmation.business.name}</strong> is secured.</p>
              <div className="confirm-details">
                <p>📅 {confirmation.date}</p>
                <p>⏰ {confirmation.slot.start_time} - {confirmation.slot.end_time}</p>
                {confirmation.paymentInfo && (
                  <p style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                    💳 Payment: <strong>₹{confirmation.paymentInfo.amount}</strong> via <strong>{confirmation.paymentInfo.method}</strong>
                  </p>
                )}
              </div>
              <div className="modal-actions-modern">
                <button className="btn-outline-modern" onClick={() => setConfirmation(null)}>Close</button>
                <button className="btn-primary" onClick={() => { setConfirmation(null); window.location.reload(); }}>Done</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPendingBooking(null);
        }}
        onPaymentSuccess={handlePaymentSuccess}
        bookingDetails={pendingBooking}
        amount={500}
      />

      {user && bookingHistory.length > 0 && (
        <section className="dashboard-section glass-card" style={{ maxWidth: '1200px', margin: '40px auto', padding: '32px' }}>
             <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: 0 }}>Recent Booking Activity</h2>
                <p className="muted small">Your appointment history and status</p>
             </div>
             <div className="bookings-table">
                {bookingHistory.slice(0, 5).map((b) => (
                  <div key={b.id} className="booking-row-modern" style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <div className="booking-info">
                        <h4 style={{ margin: 0 }}>{b.business?.name || b.service || "Booking"}</h4>
                        <p className="muted small" style={{ margin: '4px 0 0 0' }}>
                          📅 {b.date} · ⏰ {b.start_time} - {b.end_time}
                        </p>
                        {b.payment && (
                          <p className="muted small" style={{ margin: '4px 0 0 0' }}>
                            💳 Amount: ₹{b.payment.amount} | Status: <strong>{b.payment.status}</strong>
                            {b.payment.refund_amount > 0 && ` | Refund: ₹${b.payment.refund_amount}`}
                          </p>
                        )}
                      </div>
                      <div className="booking-status" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                         <span className={`status-badge-modern status-${(b.status || 'PENDING').toLowerCase()}`}>
                            {b.status}
                         </span>
                         {b.payment && (
                           <span className={`status-badge-modern status-${(b.payment.status || 'PENDING').toLowerCase()}`}
                             style={{ fontSize: '12px', padding: '4px 8px' }}>
                            💳 {b.payment.status}
                           </span>
                         )}
                         <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                           {b.status === 'pending' && b.payment?.status === 'pending' && (
                             <motion.button
                               whileHover={{ scale: 1.05 }}
                               whileTap={{ scale: 0.95 }}
                               className="btn-primary small"
                               onClick={() => handlePayNow(b.id)}
                               disabled={submitting}
                               style={{ padding: '8px 16px', fontSize: '12px' }}
                             >
                               {submitting ? "Processing..." : "Pay Now"}
                             </motion.button>
                           )}
                           {(b.status === 'pending' || b.status === 'confirmed') && (
                             <motion.button
                               whileHover={{ scale: 1.05 }}
                               whileTap={{ scale: 0.95 }}
                               className="btn-outline-modern small"
                               onClick={() => handleCancelBooking(b.id)}
                               disabled={submitting}
                               style={{ padding: '8px 16px', fontSize: '12px', color: '#ff6b6b' }}
                             >
                               Cancel
                             </motion.button>
                           )}
                         </div>
                      </div>
                  </div>
                ))}
             </div>
             {bookingHistory.length > 5 && (
                 <button 
                  className="btn-ghost small" 
                  style={{ marginTop: '16px', color: 'var(--primary)', fontWeight: '700' }}
                  onClick={() => navigate("/dashboard")}
                >
                  View Full History →
                </button>
             )}
        </section>
      )}
    </div>
  );
};

export default BookingPage;