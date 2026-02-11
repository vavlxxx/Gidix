import React from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer } from "react-leaflet";

const typeColors = {
  museum: "#8c5b42",
  temple: "#9a6a4e",
  monument: "#735046",
  nature: "#2f6f6d",
  park: "#4d8a74",
  cafe: "#c77a4e",
  other: "#7a6d63"
};

export default function RouteMap({ points }) {
  if (!points || points.length === 0) {
    return <div className="map-placeholder">Карта появится после добавления точек.</div>;
  }
  const center = [points[0].lat, points[0].lng];
  const polyline = points.map((point) => [point.lat, point.lng]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="map-frame"
      scrollWheelZoom
      dragging
      doubleClickZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
      tap={false}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={polyline} pathOptions={{ color: "#d07a48", weight: 4 }} />
      {points.map((point) => (
        <CircleMarker
          key={point.id || `${point.lat}-${point.lng}`}
          center={[point.lat, point.lng]}
          radius={8}
          pathOptions={{ color: typeColors[point.point_type] || "#6a6a6a", fillOpacity: 0.9 }}
          interactive={false}
        />
      ))}
    </MapContainer>
  );
}
