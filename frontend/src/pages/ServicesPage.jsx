import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { showToast } from "../components/ToastHost";
import { useAuth } from "../AuthContext";
import PageWrapper from "../components/PageWrapper";
import MapView from "../components/MapView";
import { motion, AnimatePresence } from "framer-motion";
import { formatRating } from "../utils";

const ServicesPage = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const { user } = useAuth();
  const [ratingBusy, setRatingBusy] = useState(null);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [activeBusinessId, setActiveBusinessId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [{ data: srvs }, { data: biz }] = await Promise.all([
          api.get("/services"),
          api.get("/businesses")
        ]);
        // Normalise the rating field: backend sends 'rating', not 'average_rating'
        const normalised = (biz || []).map((b) => ({
          ...b,
          average_rating: b.average_rating ?? b.rating ?? 0,
        }));
        console.log("[businesses] raw from API:", biz);
        console.log("[businesses] normalised:", normalised);
        setServices(srvs);
        setBusinesses(normalised);
        setFiltered(normalised);
      } catch (err) {
        showToast("Unable to load services.", "error");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleBookNow = (business) => {
    if (!user) {
      navigate("/login");
    } else {
      navigate(`/business/${business.id}`);
    }
  };

  const handleRate = async (business, value) => {
    if (!user) {
      showToast("Please login to rate a business.", "error");
      return;
    }
    setRatingBusy(business.id);
    try {
      const { data } = await api.post(`/businesses/${business.id}/rating`, { rating: value });
      showToast(data.message || "Rating submitted!", "success");
      // Refresh business list to show updated average
      const { data: updatedBiz } = await api.get("/businesses");
      const normalised = (updatedBiz || []).map((b) => ({
        ...b,
        average_rating: b.average_rating ?? b.rating ?? 0,
      }));
      setBusinesses(normalised);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to submit rating.", "error");
    } finally {
      setRatingBusy(null);
    }
  };

  // ── Category keyword map ────────────────────────────────────────────────────
  // Keys are the service names in lowercase. Values are substrings that should
  // match a business's category field (or name as fallback).
  const CATEGORY_KEYWORDS = {
    hospital: ["hospital", "clinic", "dental", "medical", "doctor", "health", "care", "pharmacy", "ortho", "eye", "neuro"],
    salon:    ["salon", "beauty", "hair", "spa", "parlour", "parlor", "grooming", "barber", "nail"],
    bank:     ["bank", "finance", "atm", "credit", "loan", "insurance", "financial"],
  };

  useEffect(() => {
    let result = businesses;

    // ── Filter by service category ──────────────────────────────────────────
    if (selectedServiceId) {
      const service = services.find((s) => s.id === selectedServiceId);
      if (service) {
        const categoryKey = service.name.toLowerCase().trim();
        const keywords    = CATEGORY_KEYWORDS[categoryKey] || [categoryKey];

        result = result.filter((b) => {
          // Primary: match by service_id (business registered under that service tab)
          if (b.service_id === selectedServiceId) return true;

          // Fallback: keyword match on category field, then business name
          const haystack = [
            b.category    || "",
            b.name        || "",
            b.service_type || "",
          ].join(" ").toLowerCase();

          const match = keywords.some((kw) => haystack.includes(kw));
          console.debug(`[filter] ${b.name} | category="${b.category}" | service_id=${b.service_id} | key=${categoryKey} | match=${match}`);
          return match;
        });
      }
    }

    // ── Filter by name / category search ──────────────────────────────────
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (b) =>
          (b.name     || "").toLowerCase().includes(q) ||
          (b.category || "").toLowerCase().includes(q)
      );
    }

    // ── Filter by city ────────────────────────────────────────────────────
    if (city.trim()) {
      const c = city.trim().toLowerCase();
      result = result.filter(
        (b) =>
          (b.city    || "").toLowerCase().includes(c) ||
          (b.address || "").toLowerCase().includes(c)
      );
    }

    setFiltered(result);
  }, [selectedServiceId, search, city, businesses, services]);

  const filteredBusinesses = filtered;

  return (
    <div className="page services-page-wrapper">
      <div className="business-bg-animated">
        <div className="glow-sphere"></div>
      </div>
      
      <section className="glass-card services-page-layout-modern">
        <header className="services-header-modern">
          <h2>Find the Best Services</h2>
          <p className="muted">
            Precise appointment booking for salons, clinics, and more.
          </p>
        </header>

        {user && !user.subscription_plan && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="subscription-banner-modern"
            onClick={() => navigate("/subscription")}
            style={{ 
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              padding: '24px', borderRadius: '24px', marginBottom: '32px', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>Get Apointz Premium 🌟</h3>
              <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                Join our premium community for priority booking and exclusive benefits.
              </p>
            </div>
            <span className="btn-primary" style={{ background: 'white', color: 'var(--primary)', padding: '8px 20px' }}>
              Upgrade Now
            </span>
          </motion.div>
        )}

        <div className="services-toolbar-modern">
          <div className="toolbar-group">
            <label>Category</label>
            <div className="pill-row-modern">
              <button
                type="button"
                className={!selectedServiceId ? "pill-modern active" : "pill-modern"}
                onClick={() => setSelectedServiceId(null)}
              >
                All
              </button>
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={selectedServiceId === s.id ? "pill-modern active" : "pill-modern"}
                  onClick={() => setSelectedServiceId(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="toolbar-group flex-fill">
            <label>What/Where</label>
            <div className="search-row-modern">
              <input
                type="text"
                placeholder="Search business..."
                className="input-modern"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <input
                type="text"
                placeholder="City..."
                className="input-modern"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loader-row-modern">
            <div className="spinner-modern"></div>
            <p className="muted">Curating locations for you...</p>
          </div>
        ) : (
          <div className="services-grid-modern">
            {(filteredBusinesses || []).map((b) => (
              <article key={b?.id || Math.random()} className="service-card-modern glass-card" onClick={() => handleBookNow(b)}>
                <div className="card-top">
                  <h3>{b?.name || "Unknown Business"}</h3>
                  <span className="business-tag-modern">{(b?.category || "Service").toUpperCase()}</span>
                </div>
                <p className="location-text">📍 {b?.address || "Address unavailable"}, {b?.city || ""}</p>
                <div className="card-stats">
                  <div className="rating-mini">
                    <span className="star-icon">★</span>
                    <span>{b?.rating_count ? (b?.average_rating?.toFixed(1) || "0.0") : "N/A"}</span>
                  </div>
                  <span className="reviews-count-mini">{b?.rating_count || 0} reviews</span>
                </div>
                {user && (
                    <div className="rating-action-mini" onClick={(e) => e.stopPropagation()}>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          type="button"
                          className="star-btn-mini"
                          disabled={ratingBusy === b.id}
                          onClick={() => handleRate(b, v)}
                        >
                          {v <= Math.round(b.average_rating || 0) ? "★" : "☆"}
                        </button>
                      ))}
                    </div>
                  )}
                <button
                  type="button"
                  className="btn-primary small full-width"
                  style={{ marginTop: 'auto' }}
                  onClick={(e) => { e.stopPropagation(); handleBookNow(b); }}
                >
                  Book Appointment
                </button>
              </article>
            ))}
            {!filteredBusinesses.length && (
              <div className="empty-state-modern" style={{ gridColumn: '1 / -1' }}>
                <div className="empty-icon">🔍</div>
                <p>No matches found in this category.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default ServicesPage;
