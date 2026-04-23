import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { showToast } from "../components/ToastHost";
import { GoogleLogin } from "@react-oauth/google";
import PageWrapper from "../components/PageWrapper";
import GlassCard from "../components/GlassCard";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  // ── Email / Password login ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res  = await api.post("/auth/login", form);
      const data = res.data;
      const token = data.token || data.access_token;

      if (!token) throw new Error("No token received from server");

      const userData = data.user || {
        id:    data.user_id,
        name:  data.name,
        email: form.email,
        role:  data.role || "customer",
      };

      // login() handles both localStorage AND React state atomically
      login(userData, token);

      const role = (userData.role || "customer").toLowerCase();
      navigate(role === "business" ? "/business" : "/book", { replace: true });
    } catch (err) {
      showToast(
        err.response?.data?.message || err.message || "Login failed",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth login ─────────────────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res  = await api.post("/auth/google-login", {
        token: credentialResponse.credential,
      });
      const data  = res.data;
      const token = data.token || data.access_token;

      if (!token) throw new Error("No token received from Google login");

      const userData = data.user || {
        id:    data.user_id,
        name:  data.name,
        email: data.email,
        role:  data.role || "customer",
      };

      // login() persists both user AND token — no duplicate localStorage calls
      login(userData, token);

      const role = (userData.role || "customer").toLowerCase();
      navigate(role === "business" ? "/business" : "/book", { replace: true });
    } catch (err) {
      showToast(
        err.response?.data?.message || "Google login failed",
        "error"
      );
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <div className="page auth-page">
        <div className="auth-form-side">
          <GlassCard className="auth-entry-card" hoverLift={false}>
            <h2>Sign In</h2>
            <p className="muted small">Enter your details to continue</p>

            <form onSubmit={handleSubmit} style={{ marginTop: "32px" }}>
              <div className="field-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="field-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>

              <button
                className="btn-primary full"
                type="submit"
                disabled={loading}
                style={{ width: "100%", height: "48px" }}
              >
                {loading ? "Signing in…" : "Login"}
              </button>
            </form>

            {/* Divider */}
            <div
              style={{
                margin: "24px 0",
                textAlign: "center",
                position: "relative",
              }}
            >
              <span
                style={{
                  background: "rgba(15, 23, 42, 0.8)",
                  padding: "0 12px",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  zIndex: 1,
                  position: "relative",
                }}
              >
                OR CONTINUE WITH
              </span>
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  width: "100%",
                  height: "1px",
                  background: "var(--glass-border)",
                }}
              />
            </div>

            {/* Google */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => showToast("Google login failed", "error")}
                theme="filled_black"
                shape="pill"
              />
            </div>

            <p
              className="small muted"
              style={{ marginTop: "32px", textAlign: "center" }}
            >
              Don't have an account?{" "}
              <Link to="/register" style={{ fontWeight: 600 }}>
                Create one
              </Link>
            </p>
          </GlassCard>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          .auth-page {
            min-height: calc(100vh - 100px);
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `,
        }}
      />
    </PageWrapper>
  );
};

export default LoginPage;