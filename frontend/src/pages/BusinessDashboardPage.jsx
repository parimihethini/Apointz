import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { showToast } from "../components/ToastHost";
import PageWrapper from "../components/PageWrapper";
import GlassCard from "../components/GlassCard";


const BusinessDashboardPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [summary, setSummary] = useState({
    businesses: [],
    today_bookings: [],
    upcoming_bookings: [],
    stats: {},
  });
  const [loading, setLoading] = useState(true);
  const [slotForm, setSlotForm] = useState({
    business_id: "",
    date: "",
    start_time: "",
    end_time: "00:30",
  });
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [newBusinessForm, setNewBusinessForm] = useState({
    name: "",
    category: "",
    address: "",
    city: "",
  });
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/business/dashboard");
      setSummary(data);
    } catch {
      showToast("Unable to load business dashboard.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async () => {
    setLoadingSlots(true);
    try {
      const { data } = await api.get("/business/slots");
      setSlots(data);
    } catch {
      showToast("Unable to load slots.", "error");
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadSlots();
  }, []);

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    const [h, m] = slotForm.start_time.split(":").map(Number);
    const endMin = (h * 60 + m + 30) % (24 * 60);
    const endStr = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    const payload = {
      business_id: slotForm.business_id,
      date: slotForm.date,
      start_time: slotForm.start_time,
      end_time: endStr
    };
    try {
      await api.post("/business/slots", payload);
      showToast("Slot added.", "success");
      setSlotForm({ ...slotForm, start_time: "" });
      loadSlots();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add slot.", "error");
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm("Are you sure you want to delete this slot?")) return;
    try {
      await api.delete(`/business/slots/${slotId}`);
      showToast("Slot deleted.", "success");
      loadSlots();
    } catch (err) {
      const msg = err.response?.data?.message || "Unable to delete slot.";
      showToast(msg, "error");
    }
  };

  const handleDeleteAllSlots = async () => {
    if (!slots || slots.length === 0) {
      showToast("No slots to remove.", "error");
      return;
    }
    if (!window.confirm(`Remove all ${slots.length} slot(s)? This cannot be undone.`)) return;

    setLoadingSlots(true);
    let succeeded = 0;
    let failed = 0;

    for (const s of slots) {
      try {
        await api.delete(`/business/slots/${s.id}`);
        succeeded++;
      } catch (err) {
        failed++;
      }
    }

    if (succeeded > 0) {
      showToast(`${succeeded} slot(s) removed.`, "success");
    }
    if (failed > 0) {
      showToast(`${failed} slot(s) could not be removed (may be booked).`, "error");
    }

    await loadSlots(); // re-sync with backend
  };

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    setCreatingBusiness(true);
    try {
      await api.post("/business/create", newBusinessForm);
      showToast("Business created successfully.", "success");
      setShowAddBusiness(false);
      setNewBusinessForm({ name: "", category: "", address: "", city: "" });
      loadDashboard();
    } catch (err) {
      const msg = err.response?.data?.message || "Unable to create business.";
      showToast(msg, "error");
    } finally {
      setCreatingBusiness(false);
    }
  };

  const updateStatus = async (bookingId, status) => {
    try {
      await api.put("/business/booking-status", { booking_id: bookingId, status });
      showToast("Booking updated.", "success");
      loadDashboard();
    } catch (err) {
      showToast("Failed to update booking.", "error");
    }
  };

  const handleDeleteBusiness = async (businessId) => {
    if (!window.confirm("Are you sure you want to delete this business? All associated slots and bookings will be lost.")) return;
    try {
      await api.delete(`/business/${businessId}`);
      showToast("Business deleted successfully.", "success");
      loadDashboard();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete business.", "error");
    }
  };

  const renderDashboard = () => (
    <motion.div
      className="dashboard-content"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p>Your business performance at a glance</p>
      </div>

      <div className="stats-grid">
        <motion.div className="stat-card glass-card" variants={cardVariants} whileHover={{ y: -5 }}>
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <h3>{summary?.today_bookings?.length || 0}</h3>
            <p>Today's Bookings</p>
          </div>
        </motion.div>
        <motion.div className="stat-card glass-card" variants={cardVariants} whileHover={{ y: -5 }}>
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>{summary?.upcoming_bookings?.length || 0}</h3>
            <p>Upcoming Bookings</p>
          </div>
        </motion.div>
        <motion.div className="stat-card glass-card" variants={cardVariants} whileHover={{ y: -5 }}>
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{summary?.stats?.total_customers || 0}</h3>
            <p>Total Customers</p>
          </div>
        </motion.div>
      </div>

      <motion.div className="dashboard-section glass-card" variants={cardVariants}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Today's Appointments</h2>
          <span className="badge-modern">Live</span>
        </div>
        {summary?.today_bookings?.length ? (
          <div className="bookings-table">
            {(summary.today_bookings || []).map((b) => (
              <motion.div
                key={b?.id || Math.random()}
                className="booking-row-modern"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: 5, background: "rgba(255,255,255,0.08)" }}
              >
                <div className="booking-info">
                  <h4>{b?.customer_name || "Guest"}</h4>
                  <p className="muted">{b?.service || "General Service"} · {b?.start_time} - {b?.end_time}</p>
                </div>
                <div className="booking-status">
                  <span className={`status-badge-modern status-${(b?.status || "pending").toLowerCase()}`}>
                    {b?.status || "Pending"}
                  </span>
                </div>
                <div className="booking-actions">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-primary small"
                    disabled={updatingId === b?.id || b?.status?.toLowerCase() === "confirmed"}
                    onClick={() => updateStatus(b?.id, "confirmed")}
                  >
                    Confirm
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-outline-modern small"
                    disabled={updatingId === b?.id}
                    onClick={() => updateStatus(b?.id, "cancelled")}
                  >
                    Reject
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="empty-state-modern">
            <div className="empty-icon">📅</div>
            <p>No appointments scheduled for today.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );

  const renderBookings = () => (
    <motion.div
      className="dashboard-content"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="dashboard-header">
        <h1>All Bookings</h1>
        <p>View and manage all your appointments</p>
      </div>

      <div className="dashboard-section glass-card">
        {summary?.upcoming_bookings?.length ? (
          <div className="bookings-table">
            {(summary.upcoming_bookings || []).map((b) => (
              <motion.div
                key={b?.id || Math.random()}
                className="booking-row-modern"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: 5 }}
              >
                <div className="booking-info">
                  <h4>{b?.customer_name || "Guest"}</h4>
                  <p className="muted">{b?.service || "—"} · {b?.date} · {b?.start_time} - {b?.end_time}</p>
                  <p className="booking-contact-modern">
                    {b?.customer_phone && `📞 ${b.customer_phone}`}
                    {b?.customer_email && ` ✉️ ${b.customer_email}`}
                  </p>
                </div>
                <div className="booking-status">
                  <span className={`status-badge-modern status-${(b?.status || "pending").toLowerCase()}`}>
                    {b?.status || "Pending"}
                  </span>
                </div>
                <div className="booking-actions">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-primary small"
                    disabled={updatingId === b?.id || b?.status?.toLowerCase() === "confirmed"}
                    onClick={() => updateStatus(b?.id, "confirmed")}
                  >
                    Confirm
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-outline-modern small"
                    disabled={updatingId === b?.id}
                    onClick={() => updateStatus(b?.id, "cancelled")}
                  >
                    Reject
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="empty-state-modern">
            <div className="empty-icon">📋</div>
            <p>No upcoming bookings.</p>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderSlots = () => (
    <motion.div
      className="dashboard-content"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="dashboard-header">
        <h1>Manage Time Slots</h1>
        <p>Availability settings for your locations</p>
      </div>

      <motion.div className="dashboard-section glass-card" variants={cardVariants}>
        <form onSubmit={handleCreateSlot} className="slot-form-modern">
          <div className="form-row-modern">
            <div className="form-group">
              <label>Select Business Location</label>
              <select
                value={slotForm.business_id}
                onChange={(e) => setSlotForm({ ...slotForm, business_id: e.target.value })}
                required
                className="form-input-modern"
              >
                <option value="">Choose location...</option>
                {(summary?.businesses || []).map((b) => (
                  <option key={b?.id} value={b?.id}>
                    {b?.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Availability Date</label>
              <input
                type="date"
                value={slotForm.date}
                onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })}
                required
                className="form-input-modern"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          <div className="form-row-modern">
            <div className="form-group">
              <label>Start Time</label>
              <input
                type="time"
                value={slotForm.start_time}
                onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                required
                className="form-input-modern"
              />
            </div>
            <div className="form-group">
              <label>Default Duration</label>
              <input disabled value="30 Minutes (Standard)" className="form-input-modern blurred" />
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 10px 20px rgba(99, 102, 241, 0.2)" }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="btn-primary full-width"
            style={{ padding: '16px', fontWeight: '800' }}
          >
            Create New Availability Slot
          </motion.button>
        </form>
      </motion.div>

      <motion.div className="dashboard-section" style={{ marginTop: '3.5rem' }} variants={cardVariants}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Active Time Slots</h2>
            <p className="muted" style={{ marginTop: '4px' }}>Manage your published availability</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="badge-modern">{slots?.length || 0} Slots Published</span>
            {slots?.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05, background: 'rgba(239, 68, 68, 0.15)' }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDeleteAllSlots}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  padding: '8px 18px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                🗑️ Remove All
              </motion.button>
            )}
          </div>
        </div>

        {loadingSlots ? (
          <div className="loader-row-modern">
            <div className="spinner-modern" />
            <p className="muted">Retrieving slots...</p>
          </div>
        ) : (slots || []).length > 0 ? (
          <div className="slots-grid-modern">
            {(slots || []).map((s) => {
              // Safely extract YYYY-MM-DD without timezone shifting
              let formattedDate = "—";
              try {
                if (s?.date) {
                  // If already ISO string like "2026-04-14" or "2026-04-14T...", just slice
                  formattedDate = String(s.date).split("T")[0];
                }
              } catch (e) { }

              return (
                <motion.div
                  key={s?.id || Math.random()}
                  variants={itemVariants}
                  whileHover={{ y: -5, boxShadow: "0 15px 30px rgba(0,0,0,0.2)" }}
                  className="slot-card-modern glass-card"
                >
                  <div className="slot-card-header">
                    <h4>{s?.business_name || "Location"}</h4>
                    <span className={`status-badge-mini ${s?.is_booked ? 'booked' : 'available'}`}>
                      {s?.is_booked ? 'Reserved' : 'Available'}
                    </span>
                  </div>

                  <div className="slot-card-body">
                    <div className="slot-info-item">
                      <span className="icon">📅</span>
                      <span>{formattedDate || s?.date || "—"}</span>
                    </div>
                    <div className="slot-info-item">
                      <span className="icon">⏰</span>
                      <span>{s?.start_time} - {s?.end_time}</span>
                    </div>
                  </div>

                  <div className="slot-card-footer">
                    <motion.button
                      whileHover={{ scale: 1.05, color: "#ef4444", background: "rgba(239, 68, 68, 0.1)" }}
                      whileTap={{ scale: 0.95 }}
                      className="btn-delete-mini"
                      onClick={() => s?.id && handleDeleteSlot(s.id)}
                      disabled={s?.is_booked}
                    >
                      Remove Slot
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state-modern">
            <div className="empty-icon">⏰</div>
            <p>No availability slots defined for your businesses yet.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );

  const renderProfile = () => (
    <motion.div
      className="dashboard-content"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="dashboard-header flex-header">
        <div>
          <h1>Business Profiles</h1>
          <p>Manage your business branding and info</p>
        </div>
        {!showAddBusiness && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary"
            onClick={() => setShowAddBusiness(true)}
          >
            + New Business
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showAddBusiness && (
          <motion.div
            className="add-business-form glass-card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h3 style={{ marginBottom: '20px' }}>Add New Business</h3>
            <form onSubmit={handleCreateBusiness} className="form-vertical-modern">
              <div className="form-group">
                <label>Business Name</label>
                <input
                  required
                  className="form-input-modern"
                  value={newBusinessForm.name}
                  onChange={(e) => setNewBusinessForm({ ...newBusinessForm, name: e.target.value })}
                  placeholder="e.g. Dream Salon"
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  required
                  className="form-input-modern"
                  value={newBusinessForm.category}
                  onChange={(e) => setNewBusinessForm({ ...newBusinessForm, category: e.target.value })}
                  placeholder="e.g. Salon, Hospital, Bank"
                />
              </div>
              <div className="form-row-modern">
                <div className="form-group">
                  <label>Address</label>
                  <input
                    required
                    className="form-input-modern"
                    value={newBusinessForm.address}
                    onChange={(e) => setNewBusinessForm({ ...newBusinessForm, address: e.target.value })}
                    placeholder="Street address"
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input
                    required
                    className="form-input-modern"
                    value={newBusinessForm.city}
                    onChange={(e) => setNewBusinessForm({ ...newBusinessForm, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
              </div>
              <div className="form-actions-modern">
                <button type="button" className="btn-outline-modern" onClick={() => setShowAddBusiness(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creatingBusiness}>
                  {creatingBusiness ? "Creating..." : "Create Business"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="businesses-list-modern">
        {(summary?.businesses || []).map((business) => (
          <motion.div
            key={business?.id || Math.random()}
            className="business-card-modern glass-card"
            variants={cardVariants}
            whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
          >
            <div className="business-card-header">
              <h3>{business?.name || "Business"}</h3>
              <span className="business-category-tag">{business?.category || "Service"}</span>
            </div>
            <p className="business-location-modern">📍 {business?.address || "—"}, {business?.city || ""}</p>
            <div className="business-actions-modern" style={{ gap: '8px', display: 'flex', flexWrap: 'wrap' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-outline-modern small"
                onClick={() => business?.id && navigate(`/business/edit/${business.id}`)}
              >
                Edit Profile
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-ghost-modern small"
                onClick={() => business?.id && navigate(`/business/details/${business.id}`)}
              >
                View Details
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, background: 'rgba(239, 68, 68, 0.1)' }}
                whileTap={{ scale: 0.95 }}
                className="btn-outline-modern small"
                style={{ borderColor: '#ef4444', color: '#ef4444' }}
                onClick={() => business?.id && handleDeleteBusiness(business.id)}
              >
                Delete
              </motion.button>
            </div>
          </motion.div>
        ))}
        {(!summary?.businesses?.length && !showAddBusiness) && (
          <div className="empty-state-modern">
            <div className="empty-icon">🏢</div>
            <p>No business profile found. Create one to get started!</p>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="business-page-wrapper">
      <div className="business-bg-animated">
        <div className="glow-sphere"></div>
      </div>

      <div className="business-dashboard-container">
        <div className="dashboard-sidebar-modern">
          <div className="sidebar-header-modern">
            <div className="brand-dot"></div>
            <h2>Apointz Biz</h2>
          </div>
          <nav className="sidebar-nav">
            <button
              className={`sidebar-link-modern ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              <span className="nav-icon">📊</span> Dashboard
            </button>
            <button
              className={`sidebar-link-modern ${activeTab === "bookings" ? "active" : ""}`}
              onClick={() => setActiveTab("bookings")}
            >
              <span className="nav-icon">📅</span> Bookings
            </button>
            <button
              className={`sidebar-link-modern ${activeTab === "slots" ? "active" : ""}`}
              onClick={() => setActiveTab("slots")}
            >
              <span className="nav-icon">⏰</span> Manage Slots
            </button>
            <button
              className={`sidebar-link-modern ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <span className="nav-icon">🏢</span> Business Profiles
            </button>
          </nav>
        </div>

        <div className="dashboard-main-modern">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loader"
                className="loading-state-modern"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="loader-modern"></div>
                <p>Syncing your business data...</p>
              </motion.div>
            ) : (
              renderContent()
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  function renderContent() {
    switch (activeTab) {
      case "bookings": return renderBookings();
      case "slots": return renderSlots();
      case "profile": return renderProfile();
      default: return renderDashboard();
    }
  }
};

export default BusinessDashboardPage;