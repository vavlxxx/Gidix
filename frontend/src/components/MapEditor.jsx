import React from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip } from "react-leaflet";

const typeColors = {
  museum: "#0056b3",
  temple: "#0f3aaa",
  monument: "#536eff",
  nature: "#36e7ff",
  park: "#007bff",
  cafe: "#ffc700",
  other: "#828283"
};

const typeLabels = {
  museum: "Музей",
  temple: "Храм",
  monument: "Памятник",
  nature: "Природная достопримечательность",
  park: "Зона отдыха",
  cafe: "Кафе/ресторан",
  other: "Другое"
};

export default function MapEditor({ points }) {
  const center = points.length ? [points[0].lat, points[0].lng] : [54.7388, 55.9721];
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
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {polyline.length > 1 && (
        <Polyline positions={polyline} pathOptions={{ color: "#0f3aaa", weight: 3 }} />
      )}
      {points.map((point, index) => (
        <CircleMarker
          key={`${point.lat}-${point.lng}-${index}`}
          center={[point.lat, point.lng]}
          radius={8}
          pathOptions={{
            color: typeColors[point.point_type] || "#828283",
            fillColor: typeColors[point.point_type] || "#828283",
            fillOpacity: 0.9,
            weight: 2
          }}
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
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
