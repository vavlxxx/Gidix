import React, { useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip } from "react-leaflet";

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

export default function RouteMap({ points, activePointKey, geometryGeojson }) {
  const hasPoints = Boolean(points?.length);
  const polyline = useMemo(() => (points || []).map((point) => [point.lat, point.lng]), [points]);
  const routeLine = useMemo(() => {
    const coordinates = geometryGeojson?.coordinates || geometryGeojson?.geometry?.coordinates;
    if (!coordinates || !Array.isArray(coordinates)) {
      return null;
    }
    return coordinates.map(([lng, lat]) => [lat, lng]);
  }, [geometryGeojson]);
  const defaultIcon = useMemo(() => createMarkerIcon(), []);
  const activeIcon = useMemo(() => createMarkerIcon("route-marker--active"), []);

  if (!hasPoints) {
    return <div className="map-placeholder">Карта появится после добавления точек.</div>;
  }

  const center = [points[0].lat, points[0].lng];

  return (
    <MapContainer
      center={center}
      zoom={13}
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
            positions={routeLine || polyline}
            pathOptions={{ color: "#1b6dff", weight: 6, opacity: 0.2, lineCap: "round" }}
          />
          <Polyline
            positions={routeLine || polyline}
            pathOptions={{ color: "#1b6dff", weight: 2, opacity: 0.9, lineCap: "round" }}
          />
        </>
      )}
      {points.map((point, index) => {
        const pointKey = point._key ?? point.id ?? `${point.lat}-${point.lng}-${index}`;
        const isActive = pointKey === activePointKey;
        const icon = isActive ? activeIcon : defaultIcon;

        return (
          <Marker
            key={pointKey}
            position={[point.lat, point.lng]}
            icon={icon}
            zIndexOffset={isActive ? 800 : 0}
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
        );
      })}
    </MapContainer>
  );
}
