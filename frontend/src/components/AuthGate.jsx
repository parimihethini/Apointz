import React from "react";
import { useAuth } from "../AuthContext";

/**
 * AuthGate — blocks the entire app from rendering until
 * authentication state has been restored from localStorage.
 * This prevents protected routes from firing premature redirects.
 */
const AuthGate = ({ children }) => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--bg-dark, #0f172a)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid rgba(255,255,255,0.15)",
            borderTopColor: "var(--primary, #4facfe)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return children;
};

export default AuthGate;
