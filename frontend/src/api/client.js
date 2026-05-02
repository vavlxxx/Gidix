const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const API_ORIGIN = new URL(API_BASE, window.location.origin).origin;

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
  if (!navigator.onLine) return "Нет подключения к интернету или локальному серверу.";
  if (!payload) return readableStatus(fallback);
  if (typeof payload === "string") return readableStatus(payload);
  if (typeof payload.detail === "string") return readableStatus(payload.detail);
  if (Array.isArray(payload.detail)) {
    return payload.detail.map(formatValidationError).join(" ");
  }
  return "Не удалось выполнить действие. Проверьте поля и попробуйте ещё раз.";
}

function readableStatus(message) {
  const known = {
    "HTTP 400": "Запрос заполнен неверно. Проверьте данные и попробуйте ещё раз.",
    "HTTP 401": "Нужно войти в аккаунт.",
    "HTTP 403": "Недостаточно прав для этого действия.",
    "HTTP 404": "Запрашиваемые данные не найдены.",
    "HTTP 409": "Данные конфликтуют с уже сохранённой записью.",
    "HTTP 422": "Проверьте обязательные поля и формат данных.",
    "HTTP 500": "На сервере произошла ошибка. Попробуйте позже.",
    "At least two points are required": "Для маршрута нужны минимум две точки.",
    "Route not found": "Маршрут не найден.",
    "Point not found": "Точка не найдена.",
    "Excursion not found": "Экскурсия не найдена.",
    "Booking not found": "Заявка не найдена.",
    "Session time already exists": "На это время для выбранной экскурсии уже есть сеанс.",
    "Invalid credentials": "Неверный email или пароль.",
    "User already exists": "Пользователь с таким email уже зарегистрирован."
  };
  return known[message] || message || "Не удалось выполнить действие.";
}

function formatValidationError(item) {
  const field = fieldTitle(Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : item.loc);
  const msg = String(item.msg || "").toLowerCase();
  if (msg.includes("field required") || msg.includes("missing")) return `Поле «${field}» обязательно.`;
  if (msg.includes("valid email")) return "Введите корректный email.";
  if (msg.includes("greater than or equal")) return `Поле «${field}» меньше допустимого значения.`;
  if (msg.includes("less than or equal")) return `Поле «${field}» больше допустимого значения.`;
  if (msg.includes("string too long")) return `Поле «${field}» слишком длинное.`;
  return `Проверьте поле «${field}».`;
}

function fieldTitle(field) {
  const titles = {
    email: "Email",
    password: "Пароль",
    customer_name: "Имя",
    customer_phone: "Телефон",
    customer_email: "Email",
    participants_count: "Количество участников",
    excursion_id: "Экскурсия",
    session_id: "Дата и время",
    title: "Название",
    name: "Название",
    latitude: "Широта",
    longitude: "Долгота",
    base_price: "Цена",
    duration_min: "Длительность",
    max_participants: "Максимум участников",
    point_ids: "Точки маршрута"
  };
  return titles[field] || "данные";
}

export function mediaUrl(value) {
  if (!value) return "";
  const normalized = String(value).replaceAll("\\", "/").trim();
  if (/^(https?:)?\/\//i.test(normalized) || normalized.startsWith("data:") || normalized.startsWith("blob:")) return normalized;
  const mediaIndex = normalized.indexOf("/media/");
  if (mediaIndex >= 0) return `${API_ORIGIN}${normalized.slice(mediaIndex)}`;
  if (normalized.startsWith("media/")) return `${API_ORIGIN}/${normalized}`;
  if (normalized.startsWith("/media/")) return `${API_ORIGIN}${normalized}`;
  if (normalized.startsWith("/")) return `${API_ORIGIN}${normalized}`;
  return normalized;
}

export async function api(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {});
  const isForm = options.body instanceof FormData;
  if (!headers.has("Content-Type") && options.body && !isForm) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let response;
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers,
      credentials: "include"
    });
  } catch {
    throw new Error("Сервер недоступен. Проверьте, что backend запущен.");
  }

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
  list: (publicOnly = true) => api(`/excursions?public_only=${publicOnly ? "true" : "false"}`),
  get: (id) => api(`/excursions/${id}`),
  create: (data) => api("/excursions", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => api(`/excursions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => api(`/excursions/${id}`, { method: "DELETE" }),
  generateDescription: (id) => api(`/integrations/excursions/${id}/generate-description`, { method: "POST" })
};

export const bookingsApi = {
  create: (data) => api("/bookings", { method: "POST", body: JSON.stringify(data) }),
  list: () => api("/bookings"),
  updateStatus: (id, data) => api(`/bookings/${id}/status`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => api(`/bookings/${id}`, { method: "DELETE" }),
  pay: (id) => api(`/bookings/${id}/mock-payment`, { method: "POST" })
};

export const adminApi = {
  points: () => api("/points"),
  createPoint: (data) => api("/points", { method: "POST", body: JSON.stringify(data) }),
  updatePoint: (id, data) => api(`/points/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePoint: (id) => api(`/points/${id}`, { method: "DELETE" }),
  routes: () => api("/routes"),
  getRoute: (id) => api(`/routes/${id}`),
  createRoute: (data) => api("/routes", { method: "POST", body: JSON.stringify(data) }),
  updateRoute: (id, data) => api(`/routes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteRoute: (id) => api(`/routes/${id}`, { method: "DELETE" }),
  previewRoute: (data) => api("/routes/preview", { method: "POST", body: JSON.stringify(data) }),
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
