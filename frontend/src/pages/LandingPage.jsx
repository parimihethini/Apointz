import React from "react";
import { useNavigate } from "react-router-dom";
import Hero from "../components/Hero";
import ServiceCards from "../components/ServiceCards";
import { useAuth } from "../AuthContext";

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isBusiness = user?.role === "business";

  const handleSelect = (idOrType) => {
    if (isBusiness) return;
    if (!user) {
      navigate("/login");
    } else {
      navigate("/book", { state: { preselectedServiceType: type } });
    }
  };

  return (
    <div className="page landing-page">
      <Hero />
      {isBusiness ? (
        <section className="glass" style={{ marginTop: 24, padding: 24, textAlign: "center" }}>
          <p className="muted">You are logged in as a business owner. Use the dashboard to manage appointments.</p>
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate("/business")}
          >
            Go to Dashboard
          </button>
        </section>
      ) : (
        <ServiceCards onSelect={handleSelect} />
      )}
    </div>
  );
};

export default LandingPage;

