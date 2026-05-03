import L from "leaflet";
import { mediaUrl } from "../api/client";
import { mediaGallery } from "./format";
import { geoJsonToLeafletLatLngs } from "./geojson";

export const tileUrl = import.meta.env.VITE_TILE_URL || "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
export const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function getPoiMarkerIcon(options = {}) {
  const { imageUrl = "", selected = false, active = false, label = "" } = options || {};
  const safeImage = String(imageUrl || "").trim();
  const imageHtml = safeImage
    ? `<img class="poi-pin-marker__image" src="${escapeHtml(safeImage)}" alt="" onerror="this.remove();this.parentElement.classList.add('poi-pin-marker__circle--empty')">`
    : "";
  const labelHtml = label ? `<span class="poi-pin-marker__label">${escapeHtml(label)}</span>` : "";
  return L.divIcon({
    className: `poi-pin-icon ${selected ? "poi-pin-icon--selected" : ""} ${active ? "poi-pin-icon--active" : ""}`,
    html: `
      <div class="poi-pin-marker">
        <div class="poi-pin-marker__circle ${safeImage ? "" : "poi-pin-marker__circle--empty"}">
          ${imageHtml}
        </div>
        ${labelHtml}
      </div>
    `,
    iconSize: [56, 76],
    iconAnchor: [28, 76],
    popupAnchor: [0, -72],
  });
}

export function createPoiMarkerIcon(point, options = {}) {
  const gallery = mediaGallery(point);
  return getPoiMarkerIcon({
    ...options,
    imageUrl: options.imageUrl || mediaUrl(gallery[0] || point?.image_url || ""),
  });
}

export function pointIcon(options = {}, tone = "default", compact = false) {
  if (typeof options !== "object" || Array.isArray(options)) {
    options = { label: options, selected: tone === "active", compact };
  }
  const { imageUrl = "", label = "", selected = false, active = false, variant = "point" } = options;
  if (variant === "vertex" || variant === "vertex-add" || variant === "draft-point") {
    const size = variant === "vertex-add" ? 18 : variant === "draft-point" ? 22 : 20;
    return L.divIcon({
      className: `gidix-marker gidix-marker--${variant}`,
      html: `<span>${escapeHtml(label)}</span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, variant === "draft-point" ? size : size / 2],
      popupAnchor: [0, -12]
    });
  }
  return getPoiMarkerIcon({ imageUrl, label, selected, active });
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
