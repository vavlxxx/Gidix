import React, { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip } from "react-leaflet";

const typeLabels = {
  museum: "Музей",
  temple: "Храм",
  monument: "Памятник",
  nature: "Природная достопримечательность",
  park: "Зона отдыха",
  cafe: "Кафе/ресторан",
  other: "Другое"
};

export default function RouteMap({ points, activePointKey }) {
  const hasPoints = Boolean(points?.length);
  const polyline = useMemo(() => (points || []).map((point) => [point.lat, point.lng]), [points]);
  const defaultIcon = useMemo(() => new L.Icon.Default({ className: "route-marker" }), []);
  const activeIcon = useMemo(() => new L.Icon.Default({ className: "route-marker route-marker--active" }), []);
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

        return (
          <Marker
            key={pointKey}
            position={[point.lat, point.lng]}
            icon={isActive ? activeIcon : defaultIcon}
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
