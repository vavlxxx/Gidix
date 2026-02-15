import L from "leaflet";

const MARKER_ICON_URL = "https://www.ippc.int/static/leaflet/images/marker-icon-2x.png";

const baseOptions = {
  iconUrl: MARKER_ICON_URL,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28]
};

export const createMarkerIcon = (extraClass = "") =>
  L.icon({
    ...baseOptions,
    className: `route-marker${extraClass ? ` ${extraClass}` : ""}`
  });
