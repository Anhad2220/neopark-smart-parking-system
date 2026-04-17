import axios from "axios";

// Points to your API Gateway.
// In development the Vite proxy forwards /api/* → http://localhost:5000
// so VITE_API_URL can just be "" (empty) and the browser uses the proxy.
// In production set VITE_API_URL=https://your-gateway-domain.com/api
const BASE = "http://localhost:5000/api";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ── Attach JWT on every request ──────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("neopark_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Auto-logout on 401 (expired/invalid token) ───────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("neopark_token");
      localStorage.removeItem("neopark_user");
      window.location.href = "/";   // redirect to landing
    }
    return Promise.reject(error);
  }
);

export default api;
