import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import AuthGate from "./components/AuthGate";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import ToastHost from "./components/ToastHost";
import { useAuth } from "./AuthContext";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyOTPPage from "./pages/VerifyOTPPage";
import ServicesPage from "./pages/ServicesPage";
import BookingPage from "./pages/BookingPage";
import DashboardPage from "./pages/DashboardPage";
import BusinessDashboardPage from "./pages/BusinessDashboardPage";
import BusinessProfilePage from "./pages/BusinessProfilePage";
import BusinessEditPage from "./pages/BusinessEditPage";
import BusinessDetailsPage from "./pages/BusinessDetailsPage";
import AdminPage from "./pages/AdminPage";
import SubscriptionPage from "./pages/SubscriptionPage";

// ── Admin-only guard ─────────────────────────────────────────────────────────
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !user.is_admin) return <Navigate to="/" replace />;
  return children;
};

// ── All routes, rendered only after auth is ready (AuthGate) ─────────────────
const AppShell = () => (
  <ErrorBoundary>
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        {/* AuthGate ensures loading is false before any route logic runs */}
        <AuthGate>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<VerifyOTPPage />} />

            {/* Customer routes */}
            <Route
              path="/services"
              element={
                <RoleProtectedRoute allowedRoles={["customer"]} redirectTo="/business" requireAuth>
                  <ServicesPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/book"
              element={
                <RoleProtectedRoute allowedRoles={["customer"]} redirectTo="/business" requireAuth>
                  <BookingPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={["customer"]} redirectTo="/business" requireAuth>
                  <DashboardPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <RoleProtectedRoute allowedRoles={["customer"]} redirectTo="/business" requireAuth>
                  <DashboardPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/subscription"
              element={
                <RoleProtectedRoute allowedRoles={["customer"]} redirectTo="/business" requireAuth>
                  <SubscriptionPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/business/:id"
              element={
                <RoleProtectedRoute allowedRoles={["customer"]} redirectTo="/business" requireAuth>
                  <BusinessProfilePage />
                </RoleProtectedRoute>
              }
            />

            {/* Business routes */}
            <Route
              path="/business"
              element={
                <RoleProtectedRoute allowedRoles={["business"]} redirectTo="/services" requireAuth>
                  <BusinessDashboardPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/business/edit/:id"
              element={
                <RoleProtectedRoute allowedRoles={["business"]} redirectTo="/services" requireAuth>
                  <BusinessEditPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/business/details/:id"
              element={
                <RoleProtectedRoute allowedRoles={["business"]} redirectTo="/services" requireAuth>
                  <BusinessDetailsPage />
                </RoleProtectedRoute>
              }
            />
            <Route path="/business-dashboard" element={<Navigate to="/business" replace />} />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthGate>
      </main>
      <ToastHost />
    </div>
  </ErrorBoundary>
);

// ── Root ─────────────────────────────────────────────────────────────────────
const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
