const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

let accessToken = localStorage.getItem("gidix_access_token") || "";

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || "";
  if (accessToken) localStorage.setItem("gidix_access_token", accessToken);
  else localStorage.removeItem("gidix_access_token");
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (typeof payload.detail === "string") return payload.detail;
  if (Array.isArray(payload.detail)) {
    return payload.detail.map((item) => `${item.loc?.join(".") || "field"}: ${item.msg}`).join("; ");
  }
  return JSON.stringify(payload.detail || payload);
}

export async function api(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {});
  const isForm = options.body instanceof FormData;
  if (!headers.has("Content-Type") && options.body && !isForm) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  if (response.status === 401 && retry && path !== "/auth/refresh") {
    const refreshed = await authApi.refresh().catch(() => null);
    if (refreshed?.access_token) {
      setAccessToken(refreshed.access_token);
      return api(path, options, false);
    }
  }

  const payload = await parseResponse(response);
  if (!response.ok) throw new Error(errorMessage(payload, `HTTP ${response.status}`));
  return payload;
}

export const authApi = {
  login: (data) => api("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  register: (data) => api("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  refresh: () => api("/auth/refresh", { method: "POST" }, false),
  profile: () => api("/auth/profile"),
  logout: () => api("/auth/logout", { method: "POST" })
};

export const excursionsApi = {
  list: () => api("/excursions"),
  get: (id) => api(`/excursions/${id}`),
  create: (data) => api("/excursions", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => api(`/excursions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => api(`/excursions/${id}`, { method: "DELETE" }),
  generateDescription: (id) => api(`/integrations/excursions/${id}/generate-description`, { method: "POST" })
};

export const bookingsApi = {
  create: (data) => api("/bookings", { method: "POST", body: JSON.stringify(data) }),
  list: () => api("/bookings"),
  pay: (id) => api(`/bookings/${id}/mock-payment`, { method: "POST" })
};

export const adminApi = {
  points: () => api("/points"),
  createPoint: (data) => api("/points", { method: "POST", body: JSON.stringify(data) }),
  updatePoint: (id, data) => api(`/points/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePoint: (id) => api(`/points/${id}`, { method: "DELETE" }),
  routes: () => api("/routes"),
  createRoute: (data) => api("/routes", { method: "POST", body: JSON.stringify(data) }),
  updateRoute: (id, data) => api(`/routes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteRoute: (id) => api(`/routes/${id}`, { method: "DELETE" }),
  generateRoute: (data) => api("/routes/generate", { method: "POST", body: JSON.stringify(data) }),
  createExcursion: (data) => api("/excursions", { method: "POST", body: JSON.stringify(data) }),
  updateExcursion: (id, data) => api(`/excursions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteExcursion: (id) => api(`/excursions/${id}`, { method: "DELETE" }),
  sessions: () => api("/guide/sessions"),
  excursionSessions: (id) => api(`/guide/excursions/${id}/sessions`),
  createSession: (data) => api("/guide/sessions", { method: "POST", body: JSON.stringify(data) }),
  updateSession: (id, data) => api(`/guide/sessions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSession: (id) => api(`/guide/sessions/${id}`, { method: "DELETE" }),
  generateDescription: (routeId) => api(`/integrations/routes/${routeId}/generate-description`, { method: "POST" }),
  health: () => api("/integrations/health"),
  importOsm: (data) => api("/integrations/osm/import", { method: "POST", body: JSON.stringify(data) }),
  upload: (file) => {
    const body = new FormData();
    body.append("file", file);
    return api("/uploads", { method: "POST", body });
  }
};
