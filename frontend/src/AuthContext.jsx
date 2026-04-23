import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const USER_KEY  = "apointz_user";
const TOKEN_KEY = "apointz_token";

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true); // true until localStorage is read

  // ── Restore session on mount ────────────────────────────────────────────────
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser  = localStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // Corrupted data – clear it so we start fresh
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setLoading(false); // always unblock the UI
    }
  }, []);

  // ── login ───────────────────────────────────────────────────────────────────
  const login = useCallback((userData, jwtToken) => {
    // Persist first so any concurrent reads (e.g. api interceptor) see the token
    localStorage.setItem(TOKEN_KEY, jwtToken);
    localStorage.setItem(USER_KEY,  JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
  }, []);

  // ── logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // ── Listen for 401 events fired by api.js ───────────────────────────────────
  useEffect(() => {
    const handle = () => logout();
    window.addEventListener("apointz:unauthorized", handle);
    return () => window.removeEventListener("apointz:unauthorized", handle);
  }, [logout]);

  const value = { user, token, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
