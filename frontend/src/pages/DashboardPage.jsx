import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { showToast } from "../components/ToastHost";
import PageWrapper from "../components/PageWrapper";
import GlassCard from "../components/GlassCard";
import { motion, AnimatePresence } from "framer-motion";

const DashboardPage = () => {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleSlotId, setRescheduleSlotId] = useState(null);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/bookings/me");
      setUpcoming(data.upcoming || []);
      setHistory(data.history || []);
    } catch {
      showToast("Unable to load bookings.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel?")) return;
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      showToast("Booking cancelled.", "success");
      loadBookings();
    } catch (e) {
      showToast(e.response?.data?.message || "Cancel failed.", "error");
    }
  };

  const loadRescheduleSlots = async () => {
    if (!rescheduleTarget || !rescheduleDate) return;
    try {
      const { data } = await api.get(`/businesses/${rescheduleTarget.business.id}/slots`, { 
        params: { date: rescheduleDate } 
      });
      setRescheduleSlots(data);
    } catch {
      showToast("Could not load slots.", "error");
    }
  };

  const confirmReschedule = async () => {
    try {
      await api.patch(`/bookings/${rescheduleTarget.id}/reschedule`, { slot_id: rescheduleSlotId });
      showToast("Rescheduled successfully.", "success");
      setRescheduleTarget(null);
      loadBookings();
    } catch (e) {
      showToast(e.response?.data?.message || "Reschedule failed.", "error");
    }
  };

  return (
    <PageWrapper className="dashboard">
      <header style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "2.5rem" }}>Customer <span className="primary-gradient-text">Portal</span></h1>
        <p className="muted">Track your appointments and history</p>
      </header>

      {/* Stats Quick Look */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "40px" }}>
         <GlassCard hoverLift={false}>
            <p className="tiny muted">UPCOMING</p>
            <h2 style={{ fontSize: "2rem", margin: "8px 0" }}>{upcoming.length}</h2>
            <div style={{ width: "40px", height: "4px", background: "var(--primary)", borderRadius: "2px" }}></div>
         </GlassCard>
         <GlassCard hoverLift={false}>
            <p className="tiny muted">COMPLETED</p>
            <h2 style={{ fontSize: "2rem", margin: "8px 0" }}>{history.length}</h2>
            <div style={{ width: "40px", height: "4px", background: "var(--accent)", borderRadius: "2px" }}></div>
         </GlassCard>
         <GlassCard hoverLift={false}>
            <p className="tiny muted">TOTAL VISITS</p>
            <h2 style={{ fontSize: "2rem", margin: "8px 0" }}>{upcoming.length + history.length}</h2>
            <div style={{ width: "40px", height: "4px", background: "var(--secondary)", borderRadius: "2px" }}></div>
         </GlassCard>
      </div>

      <div className="tab-container" style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
         <button className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>Upcoming</button>
         <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Past Visits</button>
      </div>

      <div className="dashboard-content">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center", padding: "60px" }}>
              <div className="spinner"></div>
            </motion.div>
          ) : activeTab === "upcoming" ? (
            <motion.div 
              key="upcoming" 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: 20 }}
              className="bookings-list"
            >
              {upcoming.length > 0 ? (
                upcoming.map((b, idx) => (
                  <GlassCard key={b.id} delay={idx * 0.1} className="booking-row" style={{ marginBottom: "16px", padding: "24px" }}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                           <h3>{b.business.name}</h3>
                           <p className="small muted">📅 {b.date} &nbsp; 🕒 {b.start_time}</p>
                           <p className="tiny" style={{ marginTop: "8px", background: "rgba(99,102,241,0.1)", color: "var(--primary)", padding: "4px 10px", borderRadius: "6px", display: "inline-block" }}>
                             {b.service || "Standard Session"}
                           </p>
                        </div>
                        <div style={{ display: "flex", gap: "12px" }}>
                           <button className="btn-ghost small" onClick={() => { setRescheduleTarget(b); setRescheduleDate(""); }}>Reschedule</button>
                           <button className="btn-primary small danger" onClick={() => handleCancel(b.id)} style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>Cancel</button>
                        </div>
                     </div>
                  </GlassCard>
                ))
              ) : (
                <GlassCard style={{ textAlign: "center", padding: "60px" }}>
                  <p className="muted">No upcoming appointments found.</p>
                  <button className="btn-primary" style={{ marginTop: "20px" }} onClick={() => navigate("/services")}>Book Now</button>
                </GlassCard>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="history" 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: 20 }}
              className="history-list"
            >
              {history.map((b, idx) => (
                <GlassCard key={b.id} delay={idx * 0.05} style={{ marginBottom: "12px", padding: "16px 24px", display: "flex", justifyContent: "space-between", opacity: 0.7 }}>
                   <div>
                      <h4 style={{ margin: 0 }}>{b.business.name}</h4>
                      <p className="tiny muted">{b.date} · {b.service}</p>
                   </div>
                   <div className="status-chip small">{b.status}</div>
                </GlassCard>
              ))}
              {history.length === 0 && <p className="muted" style={{ textAlign: "center" }}>No history available yet.</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {rescheduleTarget && (
          <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <GlassCard style={{ maxWidth: "500px", width: "100%" }}>
                <h3 style={{ marginBottom: "20px" }}>Reschedule Appointment</h3>
                <div className="field-group">
                  <label>Select New Date</label>
                  <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
                  <button className="btn-ghost full" style={{ marginTop: "12px", width: "100%" }} onClick={loadRescheduleSlots}>Find Available Times</button>
                </div>
                
                {rescheduleSlots.length > 0 && (
                  <div className="field-group">
                    <label>Select Time</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                      {rescheduleSlots.map(s => (
                        <button key={s.id} className={`slot-btn ${rescheduleSlotId === s.id ? 'selected' : ''} ${s.is_booked ? 'booked' : ''}`} onClick={() => !s.is_booked && setRescheduleSlotId(s.id)}>
                          {s.start_time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
                  <button className="btn-ghost full" onClick={() => setRescheduleTarget(null)}>Cancel</button>
                  <button className="btn-primary full" disabled={!rescheduleSlotId} onClick={confirmReschedule}>Confirm</button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .tab-btn {
          padding: 10px 24px;
          border-radius: 12px;
          background: transparent;
          border: 1px solid var(--glass-border);
          color: var(--text-muted);
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }
        .tab-btn.active {
          background: var(--glass-bg);
          color: white;
          border-color: var(--primary);
        }
        .slot-btn {
          padding: 10px;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          background: transparent;
          color: white;
          cursor: pointer;
        }
        .slot-btn.selected { background: var(--primary); }
        .slot-btn.booked { opacity: 0.3; cursor: not-allowed; }
        .status-chip {
          padding: 4px 12px;
          border-radius: 99px;
          background: var(--glass-bg);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
      `}} />
    </PageWrapper>
  );
};

export default DashboardPage;