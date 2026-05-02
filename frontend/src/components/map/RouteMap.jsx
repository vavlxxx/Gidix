import React from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { mediaUrl } from "../../api/client";
import { placeholderImage, routeLine, sortedRoutePoints } from "../../utils/format";
import { pointIcon, tileAttribution, tileUrl } from "../../utils/map";

export function RouteMap({ route, excursion, highlightedPointId, className = "route-map" }) {
  const points = sortedRoutePoints(route).filter((link) => Number.isFinite(Number(link?.point?.latitude)) && Number.isFinite(Number(link?.point?.longitude)));
  const manualLine = points.map((link) => [Number(link.point.latitude), Number(link.point.longitude)]);
  const line = routeLine(route);
  const center = line.positions[0] || manualLine[0] || [54.7351, 55.9587];

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom className={className}>
      <TileLayer attribution={tileAttribution} url={tileUrl} />
      <FitBounds positions={line.positions.length ? line.positions : manualLine} />
      {manualLine.length > 1 && <Polyline positions={manualLine} pathOptions={{ color: "#73808a", weight: 4, opacity: .62, dashArray: "7 7" }} />}
      {line.positions.length > 1 && (
        <Polyline
          positions={line.positions}
          pathOptions={{ color: line.source === "osrm" ? "#1f7a5c" : "#315f8c", weight: 6, opacity: .86, lineCap: "round" }}
        />
      )}
      {points.map((link, index) => {
        const tone = index === 0 ? "start" : index === points.length - 1 ? "finish" : highlightedPointId === link.point_id ? "active" : "default";
        return (
          <Marker key={link.id || `${link.point_id}-${index}`} position={[Number(link.point.latitude), Number(link.point.longitude)]} icon={pointIcon(index + 1, tone)}>
            <Tooltip>{index + 1}. {link.point.name}</Tooltip>
            <Popup>
              <article className="map-popup">
                <img src={mediaUrl(link.point.image_url || placeholderImage)} alt="" />
                <strong>{link.point.name}</strong>
                <p>{link.point.short_description || link.note || "Точка маршрута"}</p>
                {excursion && <Link className="popup-link" to={`/excursions/${excursion.id}`}>Открыть экскурсию</Link>}
              </article>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export function MapLegend() {
  return (
    <div className="map-legend" aria-label="Легенда карты">
      <span><i className="legend-dot legend-dot--start" /> Начало маршрута</span>
      <span><i className="legend-dot" /> Место посещения</span>
      <span><i className="legend-dot legend-dot--finish" /> Завершение</span>
      <span><i className="legend-line" /> Маршрут экскурсии</span>
    </div>
  );
}

function FitBounds({ positions }) {
  const map = useMap();
  React.useEffect(() => {
    const valid = positions.filter((position) => Number.isFinite(position?.[0]) && Number.isFinite(position?.[1]));
    if (valid.length > 1) map.fitBounds(valid, { padding: [42, 42], maxZoom: 15 });
    else if (valid.length === 1) map.setView(valid[0], 14);
  }, [map, positions]);
  return null;
}
