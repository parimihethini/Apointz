import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

/**
 * Role-based route protection.
 *
 * @param {React.ReactNode} children    - Content to render if access is granted
 * @param {string[]}        allowedRoles - Roles permitted to see this route
 * @param {string}          redirectTo  - Where to send users whose role doesn't match
 * @param {boolean}         requireAuth - If true, unauthenticated users go to /login
 */
const RoleProtectedRoute = ({
  children,
  allowedRoles = [],
  redirectTo = "/",
  requireAuth = true,
}) => {
  const { user, loading } = useAuth();

  // ① Wait for auth restoration — never redirect during the loading phase
  if (loading) return null;

  // ② Unauthenticated user
  if (!user) {
    return requireAuth ? <Navigate to="/login" replace /> : children;
  }

  // ③ Authenticated — check role
  const role      = (user.role || "customer").toLowerCase();
  const isAllowed =
    allowedRoles.length === 0 ||
    allowedRoles.some((r) => r.toLowerCase() === role) ||
    user.is_admin;

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default RoleProtectedRoute;
