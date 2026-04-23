import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { showToast } from "../components/ToastHost";
import HospitalForm from "../components/HospitalForm";
import SalonForm from "../components/SalonForm";
import BankForm from "../components/BankForm";

const BusinessEditPage = () => {
  const { id } = useParams();
  const isCreate = !id;
  const navigate = useNavigate();
  const [business, setBusiness] = useState(isCreate ? {
    name: "", owner_name: "", phone: "", category: "",
    address: "", city: "", state: "", pincode: "",
    services_offered: "", service_id: "", opening_time: "", closing_time: "",
    map_url: "", extra_data: {}
  } : null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [{ data: bus }, { data: serv }] = await Promise.all([
          api.get(`/business/${id}`),   // owner-auth route (has full data incl. extra_data)
          api.get("/services"),
        ]);
        setBusiness({
          ...bus,
          extra_data: bus.extra_data || {}
        });
        setServices(serv || []);
      } catch (err) {
        console.error("[BusinessEditPage] load error:", err.response?.status, err.response?.data);
        showToast("Failed to load business data.", "error");
        navigate("/business");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate, isCreate]);

  const handleUpdateSection = async (fields) => {
    setSaving(true);
    try {
      const payload = {};
      fields.forEach((f) => {
        payload[f] = business[f];
      });
      console.log("[Save Extended Info] Saving fields:", fields);
      console.log("[Save Extended Info] Sending payload:", payload);
      
      const res = await api.put(`/business/${id}`, payload);
      console.log("[Save Extended Info] Success response:", res.data);
      showToast("Section updated successfully.", "success");
      
      // Re-fetch to sync state with what's now in the DB
      try {
        const { data: fresh } = await api.get(`/business/${id}`);
        console.log("[Save Extended Info] Re-fetched business data:", fresh);
        setBusiness((prev) => ({ 
          ...prev, 
          ...fresh, 
          extra_data: fresh.extra_data || {} 
        }));
      } catch (refetchErr) {
        console.warn("[Save Extended Info] Re-fetch failed (non-blocking):", refetchErr);
        // Still consider it a success since the API saved the data
      }
    } catch (err) {
      console.error("[handleUpdateSection] Error:", err.response?.status, err.response?.data || err.message);
      showToast(err.response?.data?.message || "Failed to update section.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!business) return;
    setSaving(true);

    try {
      const payload = {
        name:             business?.name             || "",
        owner_name:       business?.owner_name       || "",
        phone:            business?.phone            || "",
        category:         business?.category         || "",
        address:          business?.address          || "",
        city:             business?.city             || "",
        state:            business?.state            || "",
        pincode:          business?.pincode          || "",
        services_offered: business?.services_offered || "",
        service_id:       business?.service_id       || null,
        latitude:         business?.latitude         || null,
        longitude:        business?.longitude        || null,
        opening_time:     business?.opening_time     || "",
        closing_time:     business?.closing_time     || "",
        map_url:          business?.map_url          || "",
      };

      console.log("[Save Changes] Sending:", payload);
      // /api/business/<id> is the authenticated owner route — supports PUT, PATCH, DELETE
      const res = await api.put(`/business/${id}`, payload);
      console.log("[Save Changes] Response:", res.data);
      showToast("Business updated successfully.", "success");
      navigate("/business");
    } catch (err) {
      console.error("[handleSubmit] error:", err.response?.status, err.response?.data);
      showToast(err.response?.data?.message || "Failed to update business.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBusiness(prev => prev ? { ...prev, [name]: value } : null);
  };

  return (
    <div className="business-page-wrapper">
      <div className="business-bg-animated">
        <div className="glow-sphere"></div>
      </div>

      <div className="dashboard-main-modern" style={{ paddingLeft: '24px', paddingRight: '24px' }}>
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
              <p>Fetching profile data...</p>
            </motion.div>
          ) : (
            <motion.div 
              key="form"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="edit-profile-container"
              style={{ maxWidth: '900px', margin: '0 auto' }}
            >
              <div className="dashboard-header" style={{ marginBottom: '40px' }}>
                <motion.h1 variants={itemVariants}>Edit Business Profile</motion.h1>
                <motion.p variants={itemVariants}>Refine your business details and service offerings</motion.p>
              </div>

              <form onSubmit={handleSubmit} className="premium-form">
                <motion.div className="glass-card" variants={itemVariants} style={{ marginBottom: '32px' }}>
                  <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', opacity: 0.9 }}>Basic Information</h2>
                  <div className="form-row-modern">
                    <div className="form-group">
                      <label>Business Name *</label>
                      <input
                        type="text"
                        name="name"
                        className="form-input-modern"
                        value={business.name || ""}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Owner Name</label>
                      <input
                        type="text"
                        name="owner_name"
                        className="form-input-modern"
                        value={business.owner_name || ""}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="form-row-modern">
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        className="form-input-modern"
                        value={business.phone || ""}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <input
                        type="text"
                        name="category"
                        className="form-input-modern"
                        value={business.category || ""}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div className="glass-card" variants={itemVariants} style={{ marginBottom: '32px' }}>
                  <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', opacity: 0.9 }}>Location & Address</h2>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label>Street Address *</label>
                    <input
                      type="text"
                      name="address"
                      className="form-input-modern"
                      value={business.address || ""}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-row-modern">
                    <div className="form-group">
                      <label>City *</label>
                      <input
                        type="text"
                        name="city"
                        className="form-input-modern"
                        value={business.city || ""}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>State</label>
                      <input
                        type="text"
                        name="state"
                        className="form-input-modern"
                        value={business.state || ""}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div className="glass-card" variants={itemVariants} style={{ marginBottom: '32px' }}>
                  <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', opacity: 0.9 }}>Operational Details</h2>
                  <div className="form-row-modern">
                    <div className="form-group">
                      <label>Opening Time</label>
                      <input
                        type="time"
                        name="opening_time"
                        className="form-input-modern"
                        value={business.opening_time || ""}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Closing Time</label>
                      <input
                        type="time"
                        name="closing_time"
                        className="form-input-modern"
                        value={business.closing_time || ""}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '20px' }}>
                    <label>Service Category</label>
                    <select
                      name="service_id"
                      className="form-input-modern"
                      value={business.service_id || ""}
                      onChange={handleChange}
                    >
                      <option value="">Select a service category</option>
                      {(services || []).map((service) => (
                        <option key={service?.id || Math.random()} value={service?.id}>
                          {service?.name || "Service"}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>

                <motion.div className="glass-card" variants={itemVariants} style={{ marginBottom: '40px' }}>
                  <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', opacity: 0.9 }}>Extended Info</h2>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label>Services Offered (Details)</label>
                    <textarea
                      name="services_offered"
                      className="form-input-modern"
                      value={business.services_offered || ""}
                      onChange={handleChange}
                      rows={4}
                      placeholder="List your specific treatments, services, etc."
                    />
                  </div>
                  <div className="form-group">
                    <label>Google Maps Embed URL</label>
                    <input
                      type="text"
                      name="map_url"
                      className="form-input-modern"
                      value={business.map_url || ""}
                      onChange={handleChange}
                      placeholder="Paste iframe src from Google Maps"
                    />
                  </div>
                  <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      className="btn-primary small"
                      onClick={() => handleUpdateSection(['services_offered', 'map_url'])}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Extended Info"}
                    </motion.button>
                  </div>
                </motion.div>

                <motion.div className="form-actions-modern" variants={itemVariants}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="btn-outline-modern"
                    onClick={() => navigate("/business")}
                  >
                    Discard Changes
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="btn-primary large"
                    disabled={saving}
                  >
                    {saving ? "Publishing Updates..." : "Save Changes"}
                  </motion.button>
                </motion.div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BusinessEditPage;