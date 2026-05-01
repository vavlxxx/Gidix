const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

let accessToken = localStorage.getItem("gidix_access_token") || "";

export function setAccessToken(token) {
  accessToken = token || "";
  if (accessToken) localStorage.setItem("gidix_access_token", accessToken);
  else localStorage.removeItem("gidix_access_token");
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers,
    credentials: "include"
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `HTTP ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const authApi = {
  login: (data) => api("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  profile: () => api("/auth/profile"),
  logout: () => api("/auth/logout", { method: "POST" })
};

export const excursionsApi = {
  list: () => api("/excursions"),
  get: (id) => api(`/excursions/${id}`),
  create: (data) => api("/excursions", { method: "POST", body: JSON.stringify(data) })
};

export const bookingsApi = {
  create: (data) => api("/bookings", { method: "POST", body: JSON.stringify(data) }),
  list: () => api("/bookings")
};

export const adminApi = {
  points: () => api("/points"),
  routes: () => api("/routes"),
  generateRoute: (data) => api("/routes/generate", { method: "POST", body: JSON.stringify(data) }),
  health: () => api("/integrations/health")
};
