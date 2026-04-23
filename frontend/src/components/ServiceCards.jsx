import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { formatRating } from "../utils";

const ServiceCards = ({ onSelect }) => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  const getCategoryImage = (category = "") => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("salon") || cat.includes("spa")) return "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80";
    if (cat.includes("health") || cat.includes("clinic")) return "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80";
    if (cat.includes("dental")) return "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80";
    if (cat.includes("finance") || cat.includes("bank")) return "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80";
    return "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80";
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await api.get("/businesses");
        setBusinesses((res.data || []).slice(0, 6));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return (
    <div className="loader-container" style={{ textAlign: "center", padding: "60px" }}>
      <div className="spinner"></div>
    </div>
  );

  return (
    <section className="featured-services" style={{ marginTop: "80px" }}>
      <div className="section-header" style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "2rem", color: "white" }}>Featured <span className="primary-gradient-text">Providers</span></h2>
        <p className="muted">Top-rated services available for instant booking near you.</p>
      </div>

      <div className="cards-grid">
        <AnimatePresence>
          {businesses.map((b, idx) => (
            <motion.div 
              key={b.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="card"
              onClick={() => navigate(`/business/${b.id}`)}
              style={{ cursor: "pointer" }}
            >
              <div className="card-image">
                <img src={getCategoryImage(b.category)} alt={b.name} />
                <div className="overlay"></div>
                <span className="badge">Featured</span>
                <span className="rating">⭐ {formatRating(b.average_rating)}</span>
              </div>

              <div className="card-body">
                <h3>{b.name}</h3>
                <span className="tag">{b.category || "Service"}</span>
                <p>
                  {b.address}, {b.city}
                </p>
              </div>

              <button className="cta-btn" onClick={(e) => { e.stopPropagation(); navigate(`/business/${b.id}`); }}>
                Book Appointment
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default ServiceCards;
