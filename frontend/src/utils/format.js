import { geoJsonToLeafletLatLngs } from "./geojson";

export const placeholderImage = import.meta.env.VITE_PLACEHOLDER_IMAGE || "https://placehold.co/900x600/e7eef0/284252?text=GIDIX";

export function money(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
}

export function formatDate(value, options = { day: "2-digit", month: "long", year: "numeric" }) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", options).format(new Date(value));
}

export function formatTime(value) {
  return value ? String(value).slice(0, 5) : "—";
}

export function minutes(value) {
  return value ? `${value} мин` : "—";
}

export function km(value) {
  return value ? `${value} км` : "—";
}

export function coverForExcursion(item) {
  return mediaGallery(item)[0] || item?.image_url || item?.route?.route_metadata?.cover_image_url || firstPointImage(item?.route) || placeholderImage;
}

export function firstPointImage(route) {
  return sortedRoutePoints(route).find((link) => link.point?.image_url)?.point?.image_url;
}

export function sortedRoutePoints(route) {
  return [...(route?.points || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
}

export function routeLine(route) {
  return { positions: geoJsonToLeafletLatLngs(route?.geometry_geojson), source: "geojson" };
}

export function yandexRouteUrl(route) {
  const customUrl = String(route?.route_metadata?.yandex_maps_url || "").trim();
  if (customUrl) return customUrl;
  const routePoints = sortedRoutePoints(route)
    .map((link) => link.point)
    .filter((point) => Number.isFinite(Number(point?.latitude)) && Number.isFinite(Number(point?.longitude)))
    .map((point) => ({ latitude: Number(point.latitude), longitude: Number(point.longitude) }));
  const points = routePoints;
  if (points.length < 2) return "";
  const rtext = points.map((point) => `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`).join("~");
  const centerLat = points.reduce((sum, point) => sum + point.latitude, 0) / points.length;
  const centerLon = points.reduce((sum, point) => sum + point.longitude, 0) / points.length;
  const params = new URLSearchParams({
    ll: `${centerLon.toFixed(6)},${centerLat.toFixed(6)}`,
    mode: "routes",
    rtext,
    rtt: "pd",
    z: "14"
  });
  return `https://yandex.ru/maps/?${params.toString()}`;
}

export function mediaGallery(entity) {
  const raw = [
    ...(Array.isArray(entity?.media_urls) ? entity.media_urls : []),
    ...(Array.isArray(entity?.extra?.media_urls) ? entity.extra.media_urls : []),
    ...(Array.isArray(entity?.route_metadata?.media_urls) ? entity.route_metadata.media_urls : []),
    ...(entity?.image_url ? [entity.image_url] : []),
    ...(entity?.route?.route_metadata?.cover_image_url ? [entity.route.route_metadata.cover_image_url] : [])
  ];
  return [...new Set(raw.map((item) => String(item || "").trim()).filter(Boolean))];
}

export function parseMediaText(text) {
  return [...new Set(String(text || "").split(/\n|,/).map((value) => value.trim()).filter(Boolean))];
}

export function availablePlacesTotal(sessions, fallback) {
  if (!sessions?.length) return fallback || 0;
  return sessions.reduce((sum, session) => sum + Number(session.available_places ?? session.capacity ?? 0), 0);
}

export function nearestSession(sessions = []) {
  const now = new Date();
  return [...sessions]
    .filter((session) => new Date(`${session.session_date}T${formatTime(session.start_time)}`) >= now)
    .sort((a, b) => `${a.session_date} ${a.start_time}`.localeCompare(`${b.session_date} ${b.start_time}`))[0];
}

export function cleanPayload(payload) {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, value === "" ? null : value]));
}

export function statusTitle(status) {
  return ({
    pending: "Новая",
    checking: "Проверяется",
    confirmed: "Подтверждена",
    awaiting_payment: "Ожидает оплаты",
    paid: "Оплачена",
    assigned: "Назначен экскурсовод",
    completed: "Проведена",
    cancelled: "Отменена",
    active: "Активна",
    scheduled: "Запланирована"
  })[status] || status || "—";
}

export function paymentTitle(status) {
  return ({
    pending: "Ожидает оплаты",
    paid: "Оплачено",
    failed: "Ошибка оплаты",
    refunded: "Возврат"
  })[status] || status || "—";
}

export function roleTitle(role) {
  return ({
    client: "Клиент",
    admin: "Администратор",
    superuser: "Администратор",
    manager: "Менеджер",
    dispatcher: "Диспетчер",
    guide: "Экскурсовод",
    accountant: "Бухгалтер",
    it_specialist: "IT-специалист"
  })[role] || role;
}

export function userHasRole(user, roles) {
  return Boolean(user?.roles?.some((role) => roles.includes(role)));
}
