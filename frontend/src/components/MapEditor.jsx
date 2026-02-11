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

export default function MapEditor({ points }) {
  const center = points.length ? [points[0].lat, points[0].lng] : [55.751244, 37.618423];
  const polyline = points.map((point) => [point.lat, point.lng]);

  return (
    <MapContainer
      center={center}
      zoom={12}
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
      {polyline.length > 1 && (
        <Polyline positions={polyline} pathOptions={{ color: "#d07a48", weight: 4 }} />
      )}
      {points.map((point, index) => (
        <CircleMarker
          key={`${point.lat}-${point.lng}-${index}`}
          center={[point.lat, point.lng]}
          radius={8}
          pathOptions={{ color: typeColors[point.point_type] || "#6a6a6a", fillOpacity: 0.9 }}
          interactive={false}
        />
      ))}
    </MapContainer>
  );
}
