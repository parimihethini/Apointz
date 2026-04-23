import React from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { showToast } from "../components/ToastHost";

const SelectRolePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Data passed from LoginPage via navigate(..., { state: { ... } })
  const { email, name, picture } = location.state || {};

  if (!email) {
    // If someone visits this page directly without proper state, send them back
    return <Navigate to="/login" replace />;
  }

  const handleRoleSelection = async (role) => {
    try {
      const { data } = await api.post("/auth/complete-google-signup", {
        email,
        name,
        role,
        picture
      });

      console.log("GOOGLE SIGNUP COMPLETED:", data);

      const token = data.token || data.access_token;
      if (!token) throw new Error("No token received");

      localStorage.setItem("apointz_token", token);
      
      const userData = data.user || {
        id: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role,
        is_admin: data.is_admin,
      };

      login(userData, token);
      showToast(`Welcome to Apointz, ${userData.name}!`, "success");

      if (userData.role === "business") {
        navigate("/business/setup"); // Guide business users to set up profile
      } else {
        navigate("/services");
      }
    } catch (err) {
      console.error("Signup completion error:", err);
      const msg = err.response?.data?.message || "Failed to complete signup.";
      showToast(msg, "error");
    }
  };

  return (
    <div className="page auth-page">
      <section className="auth-card glass fade-in" style={{ maxWidth: "500px" }}>
        <h2 style={{ marginBottom: "8px" }}>Finish Setting Up</h2>
        <p className="muted small" style={{ marginBottom: "24px" }}>
          Welcome <strong>{name}</strong>! How would you like to use Apointz?
        </p>

        <div className="role-selection-grid">
          <button 
            className="role-card glass hover-lift"
            onClick={() => handleRoleSelection("customer")}
          >
            <div className="role-icon">👤</div>
            <h3>Continue as Customer</h3>
            <p className="tiny muted">Book appointments at salons, hospitals, and banks.</p>
          </button>

          <button 
            className="role-card glass hover-lift"
            onClick={() => handleRoleSelection("business")}
          >
            <div className="role-icon">🏢</div>
            <h3>Continue as Business</h3>
            <p className="tiny muted">Manage your schedule, services, and customers.</p>
          </button>
        </div>

        <p className="tiny muted" style={{ marginTop: "24px" }}>
          Signed in as {email}
        </p>
      </section>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .role-selection-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr 1fr;
        }
        .role-card {
          padding: 24px 16px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
        }
        .role-card:hover {
          background: rgba(255,255,255,0.08);
          border-color: var(--primary-color, #a855f7);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .role-icon {
          font-size: 32px;
        }
        .role-card h3 {
          font-size: 16px;
          margin: 0;
          color: white;
        }
        .role-card p {
          margin: 0;
          line-height: 1.4;
        }
        @media (max-width: 480px) {
          .role-selection-grid {
            grid-template-columns: 1fr;
          }
        }
      `}} />
    </div>
  );
};

export default SelectRolePage;
