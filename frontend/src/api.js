import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

console.log("API BASE:", API_BASE);

export { API_BASE };

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
});

// ── Request interceptor: attach token ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("apointz_token");

    // Don't send auth header on public auth endpoints
    const isPublicAuth =
      config.url?.includes("/auth/login") ||
      config.url?.includes("/auth/register") ||
      config.url?.includes("/auth/google-login") ||
      config.url?.includes("/auth/verify-code") ||
      config.url?.includes("/auth/resend-verification");

    if (token && !isPublicAuth) {
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 globally ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorInfo = {
      status:  error.response?.status,
      message: error.response?.data?.message,
      data:    error.response?.data,
      code:    error.code,
      url:     error.config?.url,
    };

    console.error("API Error:", errorInfo);

    if (error.response?.status === 401) {
      // Clear persisted session
      localStorage.removeItem("apointz_token");
      localStorage.removeItem("apointz_user");

      // Notify the AuthProvider so React state is also cleared.
      // We use a custom window event so api.js stays decoupled from React context.
      window.dispatchEvent(new Event("apointz:unauthorized"));
    }

    return Promise.reject(error);
  }
);

export default API_BASE;