import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { showToast } from "../components/ToastHost";
import MapView from "../components/MapView";
import { formatRating } from "../utils";

const BusinessProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState({ reviews: [] });
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Step 1: Fetch Profile (Core data)
        const { data: prof } = await api.get(`/businesses/${id}`);
        setProfile(prof);

        // Step 2: Fetch Reviews (Independent load)
        try {
          const { data: rev } = await api.get(`/businesses/${id}/reviews`);
          setReviews(rev || { reviews: [] });
        } catch (revError) {
          console.error("Non-critical error: Failed to load reviews:", revError);
          setReviews({ reviews: [], average_rating: 0, rating_count: 0 });
        }
      } catch (e) {
        showToast("Business profile not found.", "error");
        navigate("/services");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  useEffect(() => {
    if (!profile || !selectedDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }
    setLoadingSlots(true);
    api
      .get('/slots', {
        params: { business_id: profile.id, date: selectedDate }
      })
      .then(({ data }) => {
        setSlots(data || []);
        setSelectedSlot(null);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [profile, selectedDate]);

  const handleBook = async () => {
    if (!user) {
      showToast("Please login to book.", "error");
      navigate("/login");
      return;
    }
    if (!profile || !selectedSlot) return;
    setSubmitting(true);
    try {
      await api.post("/bookings", { business_id: profile.id, slot_id: selectedSlot.id });
      showToast("Appointment booked!", "success");
      navigate("/dashboard");
    } catch (e) {
      showToast(e.response?.data?.message || "Unable to book.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRate = async () => {
    if (!user) {
      showToast("Please login to rate.", "error");
      return;
    }
    if (ratingValue < 1) {
      showToast("Please select a star rating first.", "error");
      return;
    }
    setRatingBusy(true);
    try {
      const { data } = await api.post(`/businesses/${profile.id}/rating`, {
        rating: ratingValue,
        comment: ratingComment.trim(),
      });
      console.log("[rating] response:", data);

      // Show the server's message and update UI directly from response
      showToast(data.message || "Thanks for your feedback!", "success");

      // Update profile stats immediately — no extra network call needed
      setProfile((p) => ({
        ...p,
        average_rating: data.average_rating ?? p.average_rating,
        rating_count:   data.rating_count   ?? p.rating_count,
      }));

      // Also refresh the review list so the new comment appears
      try {
        const { data: rev } = await api.get(`/businesses/${profile.id}/reviews`);
        setReviews(rev || { reviews: [] });
      } catch (revErr) {
        console.warn("[rating] Could not refresh reviews list:", revErr);
      }

      // Reset form
      setRatingValue(0);
      setRatingComment("");
    } catch (e) {
      console.error("[rating] submission error:", e.response?.data || e.message);
      showToast(e.response?.data?.message || "Unable to submit rating.", "error");
    } finally {
      setRatingBusy(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="page-modern full-center">
        <div className="loader-modern"></div>
        <p className="muted">Discovering service details...</p>
      </div>
    );
  }

  return (
    <div className="business-page-wrapper">
      <div className="business-bg-animated">
        <div className="glow-sphere"></div>
      </div>

      <motion.div
        className="dashboard-main-modern flex-profile-layout"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '32px' }}
      >
        <div className="profile-details-column">
          <motion.header className="glass-card" variants={itemVariants} style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px' }}>{profile?.name || "Business Profile"}</h1>
                <span className="business-category-tag">{profile?.category || "Service"}</span>
              </div>
              {profile?.rating_count > 0 && (
                <div className="rating-pill-modern">
                  <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fbbf24' }}>★ {profile?.average_rating?.toFixed(1) || "0.0"}</span>
                  <p style={{ fontSize: '0.8rem', opacity: 0.5, margin: 0 }}>{profile?.rating_count || 0} reviews</p>
                </div>
              )}
            </div>
          </motion.header>

          <motion.div className="glass-card" variants={itemVariants} style={{ marginBottom: '32px' }}>
            <h2 className="section-title-modern">Location & Contact</h2>
            <div className="info-row-modern" style={{ display: 'flex', gap: '40px', marginBottom: '24px' }}>
              <div className="info-block">
                <label>Address</label>
                <p>{profile?.address || "Street address unavailable"}, {profile?.city || ""}</p>
              </div>
              {profile?.phone && (
                <div className="info-block">
                  <label>Contact</label>
                  <p><a href={`tel:${profile.phone}`} style={{ color: '#818cf8', fontWeight: '600' }}>{profile.phone}</a></p>
                </div>
              )}
            </div>
            {profile?.map_url && (
              <div className="map-embed-wrapper" style={{ borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <iframe
                  src={profile.map_url}
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  title="Location"
                ></iframe>
              </div>
            )}
          </motion.div>

          {profile?.services_offered && (
            <motion.div className="glass-card" variants={itemVariants} style={{ marginBottom: '32px' }}>
              <h2 className="section-title-modern">Service Offerings</h2>
              <p style={{ lineHeight: '1.6', color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem' }}>{profile.services_offered}</p>
            </motion.div>
          )}

          <motion.div className="glass-card" variants={itemVariants}>
            <h2 className="section-title-modern">Client Reviews</h2>
            <div className="reviews-scroller-modern" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(reviews?.reviews || []).length ? (
                (reviews.reviews || []).slice(0, 8).map((r) => (
                  <motion.div
                    key={r?.id || Math.random()}
                    className="review-item-modern"
                    whileHover={{ x: 5, background: 'rgba(255,255,255,0.03)' }}
                    style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#fbbf24' }}>{"★".repeat(r?.rating || 5)}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{r?.customer_name || "Valued Customer"}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>{r?.comment || "Great service, highly recommended!"}</p>
                  </motion.div>
                ))
              ) : (
                <p className="muted small">Be the first to leave a review!</p>
              )}
            </div>

            {user && (
              <div className="rate-input-modern" style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '12px', opacity: 0.6 }}>How was your experience?</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <motion.button
                      key={v}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      className="star-btn-modern"
                      onClick={() => setRatingValue(v)}
                      style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: v <= ratingValue ? '#fbbf24' : 'rgba(255,255,255,0.1)' }}
                    >
                      ★
                    </motion.button>
                  ))}
                </div>
                <textarea
                  placeholder="Share your experience (optional)..."
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    color: "white",
                    padding: "10px 14px",
                    fontSize: "0.9rem",
                    resize: "vertical",
                    marginBottom: "14px",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-outline-modern small"
                  disabled={ratingBusy || ratingValue < 1}
                  onClick={handleRate}
                >
                  {ratingBusy ? "Posting..." : "Submit Review"}
                </motion.button>
              </div>
            )}
          </motion.div>
        </div>

        <div className="booking-sidebar-column">
          <motion.div
            className="glass-card booking-sticky-card"
            variants={itemVariants}
            style={{ position: 'sticky', top: '120px' }}
          >
            <h2 className="section-title-modern">Secure Your Spot</h2>

            <div className="form-group-modern" style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', opacity: 0.5 }}>Select Date</label>
              <input
                type="date"
                className="form-input-modern"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>

            <div className="slots-booking-block">
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.85rem', opacity: 0.5 }}>Available Times</label>
              {loadingSlots ? (
                <div className="loader-mini-row">
                  <div className="spinner-modern small"></div>
                  <span className="muted small">Checking availability...</span>
                </div>
              ) : !selectedDate ? (
                <div className="date-prompt-modern">Please choose a date above</div>
              ) : (slots || []).length === 0 ? (
                <div className="no-slots-modern">No slots found for this date</div>
              ) : (
                <div className="slot-grid-modern" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px' }}>
                  {(slots || []).map((s) => (
                    <motion.button
                      key={s?.id || Math.random()}
                      whileHover={!s?.is_booked ? { scale: 1.05, background: 'rgba(99, 102, 241, 0.2)' } : {}}
                      whileTap={!s?.is_booked ? { scale: 0.95 } : {}}
                      className={`slot-btn-modern ${selectedSlot?.id === s?.id ? 'active' : ''} ${s?.is_booked ? 'booked' : ''}`}
                      onClick={() => !s?.is_booked && setSelectedSlot(s)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: selectedSlot?.id === s?.id ? 'rgba(99, 102, 241, 0.8)' : 'rgba(255,255,255,0.03)',
                        color: s?.is_booked ? 'rgba(255,255,255,0.2)' : 'white',
                        fontSize: '0.85rem',
                        cursor: s?.is_booked ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {s?.start_time || "—"}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary full-width large"
              disabled={!selectedSlot || submitting}
              onClick={handleBook}
              style={{ padding: '16px', fontSize: '1.1rem', fontWeight: '800' }}
            >
              {!user ? "Login to Book" : submitting ? "Processing..." : "Confirm Appointment"}
            </motion.button>
            {!user && (
              <p className="login-link-modern" style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem' }}>
                Already have an account? <Link to="/login" style={{ color: '#818cf8', fontWeight: '600' }}>Sign In</Link>
              </p>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default BusinessProfilePage;
