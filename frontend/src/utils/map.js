import L from "leaflet";

export const tileUrl = import.meta.env.VITE_TILE_URL || "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
export const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function pointIcon(label = "", tone = "default", compact = false) {
  return L.divIcon({
    className: `gidix-marker gidix-marker--${tone} ${compact ? "gidix-marker--compact" : ""}`,
    html: `<span>${label}</span>`,
    iconSize: compact ? [18, 18] : [28, 28],
    iconAnchor: compact ? [9, 9] : [14, 28],
    popupAnchor: [0, -24]
  });
}

export function pointPosition(point) {
  if (!Number.isFinite(Number(point?.latitude)) || !Number.isFinite(Number(point?.longitude))) return null;
  return [Number(point.latitude), Number(point.longitude)];
}

export function geoJsonLine(geometry) {
  return geometry?.coordinates?.map(([lon, lat]) => [lat, lon]) || [];
}
