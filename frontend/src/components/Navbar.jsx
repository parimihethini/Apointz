import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import NotificationsPanel from "./NotificationsPanel";
import { motion } from "framer-motion";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || "U";
  };

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="navbar"
    >
      <div className="nav-container">
        <Link to="/" className="brand" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <div className="brand-mark" style={{ 
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            color: "white",
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold"
          }}>A</div>
          <span className="brand-text" style={{ color: "white", fontWeight: "700", fontSize: "1.25rem" }}>Apointz</span>
        </Link>

        <nav className="nav-links" style={{ display: "flex", gap: "24px" }}>
          <NavLink to="/" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Home
          </NavLink>
          {user?.role !== "business" && (
            <>
              <NavLink to="/services" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                Services
              </NavLink>
              <NavLink to="/book" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                Book
              </NavLink>
              <NavLink to="/subscription" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                Pricing
              </NavLink>
            </>
          )}
          {user?.role === "business" && (
            <NavLink to="/business" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Dashboard
            </NavLink>
          )}
        </nav>

        <div className="nav-auth" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {user ? (
            <>
              <NotificationsPanel />
              <div className="user-profile-nav" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="user-avatar" style={{ 
                  width: "36px", 
                  height: "36px", 
                  borderRadius: "50%", 
                  overflow: "hidden",
                  border: "2px solid var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--glass-bg)"
                }}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "0.8rem", fontWeight: "600" }}>{getInitials(user.name)}</span>
                  )}
                </div>
                <button className="btn-ghost" onClick={handleLogout} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn-ghost" onClick={() => navigate("/login")}>Login</button>
              <button className="btn-primary" onClick={() => navigate("/register")}>Sign up</button>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
