import L from "leaflet";
import { geoJsonToLeafletLatLngs } from "./geojson";

export const tileUrl = import.meta.env.VITE_TILE_URL || "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
export const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function pointIcon(options = {}, tone = "default", compact = false) {
  if (typeof options !== "object" || Array.isArray(options)) {
    options = { label: options, selected: tone === "active", compact };
  }
  const { imageUrl = "", label = "", selected = false, active = false, variant = "point" } = options;
  if (variant === "vertex" || variant === "vertex-add") {
    const size = variant === "vertex-add" ? 18 : 20;
    return L.divIcon({
      className: `gidix-marker gidix-marker--${variant}`,
      html: `<span>${escapeHtml(label)}</span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -12]
    });
  }
  const body = selected
    ? `<span class="gidix-marker__label">${escapeHtml(label)}</span>`
    : imageUrl
      ? `<img class="gidix-marker__image" src="${escapeHtml(imageUrl)}" alt="">`
      : `<span class="gidix-marker__blank"></span>`;
  return L.divIcon({
    className: `gidix-marker gidix-marker--point ${selected ? "gidix-marker--selected" : ""} ${active ? "gidix-marker--active" : ""}`,
    html: `<span class="gidix-marker__pin">${body}</span>`,
    iconSize: [38, 48],
    iconAnchor: [19, 46],
    popupAnchor: [0, -44]
  });
}

export function pointPosition(point) {
  if (!Number.isFinite(Number(point?.latitude)) || !Number.isFinite(Number(point?.longitude))) return null;
  return [Number(point.latitude), Number(point.longitude)];
}

export function geoJsonLine(geometry) {
  return geoJsonToLeafletLatLngs(geometry);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
