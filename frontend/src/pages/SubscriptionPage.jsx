import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { showToast } from "../components/ToastHost";
import { useAuth } from "../AuthContext";

const SubscriptionPage = () => {
  const { user, login } = useAuth();
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const { data } = await api.get("/subscription/plans");
        setPlans(data);
      } catch (err) {
        showToast("Unable to load subscription plans.", "error");
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, []);

  const subscribe = async (planName) => {
    setSubmitting(planName);
    try {
      const { data } = await api.post("/subscription/subscribe", { plan: planName });
      showToast(`Successfully subscribed to ${planName}!`, "success");
      
      if (user) {
        const updatedUser = { 
          ...user, 
          subscription_plan: data.plan,
          subscription_expiry: data.expiry
        };
        login(updatedUser, localStorage.getItem("apointz_token"));
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Error subscribing to plan.", "error");
    } finally {
      setSubmitting(null);
    }
  };

  const planFeatures = {
    BASIC: ["Priority Booking", "Standard Support", "Email Reminders"],
    PRO: ["Everything in Basic", "SMS Reminders", "24/7 Priority Support", "Direct Chat with Providers"],
    PREMIUM: ["Unlimited Scaling", "Dedicated Account Manager", "White-label Reports", "Early Access to Features"],
  };

  return (
    <div className="page services-page-wrapper">
      <div className="business-bg-animated">
        <div className="glow-sphere"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="services-page-layout-modern glass-card"
        style={{ padding: '60px 40px' }}
      >
        <header style={{ textAlign: 'center', marginBottom: '60px' }}>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ fontSize: '3rem', fontWeight: '900', color: 'white', marginBottom: '16px' }}
          >
            Upgrade Your Experience
          </motion.h1>
          <p className="muted" style={{ fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            Choose a plan that fits your needs. Get priority slots, better support, and exclusive features.
          </p>
        </header>

        {loading ? (
          <div className="loader-row-modern">
            <div className="spinner-modern"></div>
            <p>Retrieving plans...</p>
          </div>
        ) : (
          <div className="services-grid-modern" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            {Object.keys(plans || {}).map((plan) => (
              <motion.div
                key={plan}
                whileHover={{ y: -10 }}
                className="glass-card"
                style={{ 
                  padding: '40px', 
                  position: 'relative',
                  border: user?.subscription_plan === plan ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: user?.subscription_plan === plan ? '0 0 40px rgba(168, 85, 247, 0.2)' : 'none'
                }}
              >
                {user?.subscription_plan === plan && (
                  <div style={{ 
                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--primary)', color: 'white', padding: '4px 20px', borderRadius: '20px',
                    fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px'
                  }}>
                    Current Plan
                  </div>
                )}
                
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '12px' }}>{plan}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '32px' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--primary)' }}>₹{plans[plan].price}</span>
                    <span className="muted" style={{ fontWeight: '600' }}>/ {plans[plan].days} days</span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px 0' }}>
                  {(planFeatures[plan] || []).map((feature, i) => (
                    <li key={i} style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '0.95rem' }}>
                      <span style={{ color: 'var(--primary)' }}>✓</span>
                      <span className="muted">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => subscribe(plan)}
                  disabled={submitting === plan || user?.subscription_plan === plan}
                  className="btn-primary full-width"
                  style={{ 
                    padding: '16px', fontWeight: '800',
                    background: user?.subscription_plan === plan ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                    color: user?.subscription_plan === plan ? 'rgba(255,255,255,0.3)' : 'white'
                  }}
                >
                  {submitting === plan ? (
                    <div className="spinner-modern small"></div>
                  ) : user?.subscription_plan === plan ? (
                    "Active Plan"
                  ) : (
                    "Select Plan"
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SubscriptionPage;
