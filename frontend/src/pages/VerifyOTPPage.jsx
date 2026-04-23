import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { showToast } from "../components/ToastHost";

const VerifyOTPPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const queryEmail = new URLSearchParams(location.search).get("email");
    const stateEmail = location.state?.email;
    if (stateEmail) {
      setEmail(stateEmail);
    } else if (queryEmail) {
      setEmail(queryEmail);
    } else {
      showToast("No email provided for verification.", "error");
      navigate("/login");
    }
  }, [location, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      showToast("Please enter a 6-digit code.", "error");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/verify-code", { email, code });
      showToast("Email verified successfully! You can now log in.", "success");
      navigate("/login");
    } catch (err) {
      const msg = err.response?.data?.message || "Verification failed";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email });
      showToast("New verification code sent to your email.", "success");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to resend code";
      showToast(msg, "error");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="page auth-page">
      <section className="auth-card glass">
        <div className="auth-header">
          <h2>Verify Your Email</h2>
          <p>We've sent a 6-digit code to <strong>{email}</strong></p>
        </div>

        <form onSubmit={handleVerify} className="otp-form">
          <div className="otp-input-container">
            <input
              type="text"
              placeholder="000000"
              maxLength="6"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="otp-input"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </form>

        <div className="auth-footer">
          <p>Didn't receive the code?</p>
          <button 
            onClick={handleResend} 
            className="btn-link" 
            disabled={resending}
          >
            {resending ? "Resending..." : "Resend Code"}
          </button>
        </div>
        
        <div style={{ marginTop: '20px' }}>
            <button onClick={() => navigate('/login')} className="btn-link">Back to Login</button>
        </div>
      </section>

      <style jsx>{`
        .otp-form {
          margin-top: 2rem;
        }
        .otp-input-container {
          margin-bottom: 2rem;
          display: flex;
          justify-content: center;
        }
        .otp-input {
          font-size: 2.5rem;
          letter-spacing: 0.5rem;
          text-align: center;
          width: 100%;
          max-width: 200px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.2);
          background: transparent;
          color: white;
          padding: 10px;
        }
        .otp-input:focus {
          border-bottom-color: var(--primary-color, #4facfe);
          outline: none;
        }
        .btn-link {
          background: none;
          border: none;
          color: #4facfe;
          cursor: pointer;
          font-size: 0.9rem;
          text-decoration: underline;
        }
        .btn-link:disabled {
          color: #888;
          cursor: not-allowed;
        }
        .auth-header p {
            margin-top: 10px;
            opacity: 0.8;
            font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
};

export default VerifyOTPPage;
