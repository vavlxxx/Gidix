import React from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMapEvents } from "react-leaflet";

const typeColors = {
  museum: "#7a5b44",
  temple: "#8a6a52",
  monument: "#6c4f3b",
  nature: "#4d7a5b",
  park: "#5c8a5a",
  cafe: "#b37a4c",
  other: "#6a6a6a"
};

function MapClickHandler({ isAdding, onAdd }) {
  useMapEvents({
    click(event) {
      if (isAdding) {
        onAdd({ lat: event.latlng.lat, lng: event.latlng.lng });
      }
    }
  });
  return null;
}

export default function MapEditor({ points, isAdding, onAddPoint, onSelect }) {
  const center = points.length ? [points[0].lat, points[0].lng] : [55.751244, 37.618423];
  const polyline = points.map((point) => [point.lat, point.lng]);

  return (
    <MapContainer center={center} zoom={12} className="map-frame" scrollWheelZoom={false}>
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler isAdding={isAdding} onAdd={onAddPoint} />
      {polyline.length > 1 && <Polyline positions={polyline} pathOptions={{ color: "#7a5b44", weight: 4 }} />}
      {points.map((point, index) => (
        <CircleMarker
          key={`${point.lat}-${point.lng}-${index}`}
          center={[point.lat, point.lng]}
          radius={8}
          pathOptions={{ color: typeColors[point.point_type] || "#6a6a6a", fillOpacity: 0.9 }}
          eventHandlers={{
            click: () => onSelect(index)
          }}
        >
          <Popup>
            <strong>{point.title}</strong>
            <p>{point.description}</p>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
