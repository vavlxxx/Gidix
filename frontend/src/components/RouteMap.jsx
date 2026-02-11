import React from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";

const typeColors = {
  museum: "#7a5b44",
  temple: "#8a6a52",
  monument: "#6c4f3b",
  nature: "#4d7a5b",
  park: "#5c8a5a",
  cafe: "#b37a4c",
  other: "#6a6a6a"
};

export default function RouteMap({ points }) {
  if (!points || points.length === 0) {
    return <div className="map-placeholder">Карта появится после добавления точек.</div>;
  }
  const center = [points[0].lat, points[0].lng];
  const polyline = points.map((point) => [point.lat, point.lng]);

  return (
    <MapContainer center={center} zoom={13} className="map-frame" scrollWheelZoom={false}>
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={polyline} pathOptions={{ color: "#7a5b44", weight: 4 }} />
      {points.map((point) => (
        <CircleMarker
          key={point.id || `${point.lat}-${point.lng}`}
          center={[point.lat, point.lng]}
          radius={8}
          pathOptions={{ color: typeColors[point.point_type] || "#6a6a6a", fillOpacity: 0.9 }}
        >
          <Popup>
            <strong>{point.title}</strong>
            <p>{point.description}</p>
            <p>Время на точке: {point.visit_minutes} мин.</p>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
