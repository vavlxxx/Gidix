import { divIcon } from "leaflet";

export const pinGlyphs = {
  museum: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M3 10l9-5 9 5v1H3z\"/><path d=\"M5 10h14v2H5z\"/><path d=\"M6 12h2v6H6zM11 12h2v6h-2zM16 12h2v6h-2z\"/><path d=\"M4 18h16v2H4z\"/></svg>",
  temple: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3l7 6h-2v8H7V9H5z\"/><path d=\"M10 13h4v6h-4z\"/></svg>",
  monument: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M11 3h2l2 5-2 13h-2L9 8z\"/><path d=\"M8 20h8v2H8z\"/></svg>",
  nature: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M3 20l7-10 4 6 3-4 7 8H3z\"/></svg>",
  park: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3l5 7h-3l3 5h-4l2 4h-6l2-4H7l3-5H7z\"/></svg>",
  cafe: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z\"/><path d=\"M16 9h3a2 2 0 0 1 0 4h-3z\"/><path d=\"M6 20h10v1H6z\"/></svg>",
  other: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z\"/></svg>"
};

export const createPinIcon = (type, extraClass = "") =>
  divIcon({
    className: `map-pin map-pin--${type || "other"}${extraClass ? ` ${extraClass}` : ""}`,
    html: pinGlyphs[type] || pinGlyphs.other,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -26],
    tooltipAnchor: [0, -22]
  });
