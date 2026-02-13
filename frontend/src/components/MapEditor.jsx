import React, { useEffect, useMemo, useState } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMapEvents } from "react-leaflet";

const typeLabels = {
  museum: "Музей",
  temple: "Храм",
  monument: "Памятник",
  nature: "Природная достопримечательность",
  park: "Зона отдыха",
  cafe: "Кафе/ресторан",
  other: "Другое"
};

const pinGlyphs = {
  museum: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M3 10l9-5 9 5v1H3z\"/><path d=\"M5 10h14v2H5z\"/><path d=\"M6 12h2v6H6zM11 12h2v6h-2zM16 12h2v6h-2z\"/><path d=\"M4 18h16v2H4z\"/></svg>",
  temple: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3l7 6h-2v8H7V9H5z\"/><path d=\"M10 13h4v6h-4z\"/></svg>",
  monument: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M11 3h2l2 5-2 13h-2L9 8z\"/><path d=\"M8 20h8v2H8z\"/></svg>",
  nature: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M3 20l7-10 4 6 3-4 7 8H3z\"/></svg>",
  park: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3l5 7h-3l3 5h-4l2 4h-6l2-4H7l3-5H7z\"/></svg>",
  cafe: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z\"/><path d=\"M16 9h3a2 2 0 0 1 0 4h-3z\"/><path d=\"M6 20h10v1H6z\"/></svg>",
  other: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z\"/></svg>"
};

const createPinIcon = (type) => divIcon({
  className: `map-pin map-pin--${type || "other"}`,
  html: pinGlyphs[type] || pinGlyphs.other,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -11],
  tooltipAnchor: [0, -9]
});

function MapClickHandler({ onAddPoint }) {
  useMapEvents({
    click: (event) => {
      if (!onAddPoint) return;
      onAddPoint({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });
  return null;
}

export default function MapEditor({ points, onAddPoint }) {
  const center = points.length ? [points[0].lat, points[0].lng] : [54.7388, 55.9721];
  const polyline = useMemo(() => points.map((point) => [point.lat, point.lng]), [points]);
  const iconCache = useMemo(() => {
    const icons = {};
    points.forEach((point) => {
      const key = point.point_type || "other";
      if (!icons[key]) {
        icons[key] = createPinIcon(key);
      }
    });
    if (!icons.other) {
      icons.other = createPinIcon("other");
    }
    return icons;
  }, [points]);
  const [routeLine, setRouteLine] = useState(null);

  useEffect(() => {
    if (!points || points.length < 2) {
      setRouteLine(null);
      return;
    }
    const controller = new AbortController();
    const coords = points.map((point) => `${point.lng},${point.lat}`).join(";");
    fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`, {
      signal: controller.signal
    })
      .then((response) => response.json())
      .then((data) => {
        const geometry = data?.routes?.[0]?.geometry?.coordinates;
        if (!geometry) {
          setRouteLine(polyline);
          return;
        }
        setRouteLine(geometry.map(([lng, lat]) => [lat, lng]));
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRouteLine(polyline);
        }
      });
    return () => controller.abort();
  }, [points, polyline]);

  return (
    <MapContainer
      center={center}
      zoom={12}
      className="map-frame map-frame--dark"
      scrollWheelZoom
      dragging
      doubleClickZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
      tap={false}
      attributionControl={false}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap, &copy; CARTO"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {polyline.length > 1 && (
        <>
          <Polyline
            positions={routeLine || polyline}
            pathOptions={{ color: "#2be7ff", weight: 6, opacity: 0.35, lineCap: "round" }}
          />
          <Polyline
            positions={routeLine || polyline}
            pathOptions={{ color: "#7bb4ff", weight: 2, opacity: 0.95, lineCap: "round" }}
          />
        </>
      )}
      {points.map((point, index) => (
        <Marker
          key={`${point.lat}-${point.lng}-${index}`}
          position={[point.lat, point.lng]}
          icon={iconCache[point.point_type] || iconCache.other}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
            <strong>{point.title}</strong>
          </Tooltip>
          <Popup>
            <div className="popup-content">
              <div className="popup-title">{point.title}</div>
              <div className="popup-meta">
                {point.visit_minutes} мин · {typeLabels[point.point_type] || point.point_type}
              </div>
              <p>{point.description}</p>
            </div>
          </Popup>
        </Marker>
      ))}
      <MapClickHandler onAddPoint={onAddPoint} />
    </MapContainer>
  );
}
