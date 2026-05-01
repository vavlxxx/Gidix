import React, { useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMapEvents } from "react-leaflet";

import { createMarkerIcon } from "./mapPins";

const typeLabels = {
  museum: "Музей",
  temple: "Храм",
  monument: "Памятник",
  nature: "Природная достопримечательность",
  park: "Зона отдыха",
  cafe: "Кафе/ресторан",
  other: "Другое"
};

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
  const markerIcon = useMemo(() => createMarkerIcon(), []);

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
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {polyline.length > 1 && (
        <>
          <Polyline
            positions={polyline}
            pathOptions={{ color: "#1b6dff", weight: 6, opacity: 0.2, lineCap: "round" }}
          />
          <Polyline
            positions={polyline}
            pathOptions={{ color: "#1b6dff", weight: 2, opacity: 0.9, lineCap: "round" }}
          />
        </>
      )}
      {points.map((point, index) => (
        <Marker
          key={`${point.lat}-${point.lng}-${index}`}
          position={[point.lat, point.lng]}
          icon={markerIcon}
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
