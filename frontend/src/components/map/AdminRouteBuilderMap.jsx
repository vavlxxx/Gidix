import React from "react";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { Button } from "../ui/Button";
import { pointIcon, pointPosition, tileAttribution, tileUrl } from "../../utils/map";

export function AdminRouteBuilderMap({ points, selectedIds, onTogglePoint, onMovePoint, routeGeometry }) {
  const selectedPoints = selectedIds.map((id) => points.find((point) => point.id === id)).filter(Boolean);
  const selectedLine = selectedPoints.map(pointPosition).filter(Boolean);
  const osrmLine = routeGeometry?.coordinates?.map(([lon, lat]) => [lat, lon]) || [];
  const allPositions = points.map(pointPosition).filter(Boolean);
  const center = selectedLine[0] || allPositions[0] || [54.7351, 55.9587];

  return (
    <section className="route-builder">
      <div className="route-builder__map">
        <MapContainer center={center} zoom={12} scrollWheelZoom className="builder-map">
          <TileLayer attribution={tileAttribution} url={tileUrl} />
          <FitBounds positions={selectedLine.length ? selectedLine : allPositions} />
          {selectedLine.length > 1 && <Polyline positions={selectedLine} pathOptions={{ color: "#6a7680", weight: 4, opacity: .65, dashArray: "7 7" }} />}
          {osrmLine.length > 1 && <Polyline positions={osrmLine} pathOptions={{ color: "#1f7a5c", weight: 6, opacity: .86 }} />}
          {points.map((point, index) => {
            const selectedIndex = selectedIds.indexOf(point.id);
            const selected = selectedIndex >= 0;
            const position = pointPosition(point);
            if (!position) return null;
            return (
              <Marker key={point.id} position={position} icon={pointIcon(selected ? selectedIndex + 1 : index + 1, selected ? "active" : "default")} eventHandlers={{ click: () => onTogglePoint(point.id) }}>
                <Tooltip>{point.name}</Tooltip>
                <Popup>
                  <strong>{point.name}</strong>
                  <p>{point.short_description || point.address || "Точка интереса"}</p>
                  <Button type="button" tone={selected ? "neutral" : "primary"} onClick={() => onTogglePoint(point.id)}>
                    {selected ? "Убрать из маршрута" : "Добавить в маршрут"}
                  </Button>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      <aside className="route-builder__panel">
        <h2>Выбранные точки</h2>
        <p>Порядок точек определяет ручной маршрут и отправляется в OSRM при расчёте.</p>
        <ol className="selected-points">
          {selectedPoints.map((point, index) => (
            <li key={point.id}>
              <span>{index + 1}</span>
              <strong>{point.name}</strong>
              <div>
                <button type="button" aria-label="Переместить выше" onClick={() => onMovePoint(index, -1)} disabled={index === 0}><ArrowUp size={15} /></button>
                <button type="button" aria-label="Переместить ниже" onClick={() => onMovePoint(index, 1)} disabled={index === selectedPoints.length - 1}><ArrowDown size={15} /></button>
                <button type="button" aria-label="Удалить точку из маршрута" onClick={() => onTogglePoint(point.id)}><X size={15} /></button>
              </div>
            </li>
          ))}
        </ol>
        {!selectedPoints.length && <div className="panel-hint">Выберите точки на карте или в списке ниже.</div>}
        <div className="route-preview">
          <span><Check size={16} /> Точек: {selectedPoints.length}</span>
          <span>Источник: {osrmLine.length > 1 ? "OSRM" : "ручной порядок"}</span>
        </div>
      </aside>
    </section>
  );
}

function FitBounds({ positions }) {
  const map = useMap();
  React.useEffect(() => {
    const valid = positions.filter((position) => Number.isFinite(position?.[0]) && Number.isFinite(position?.[1]));
    if (valid.length > 1) map.fitBounds(valid, { padding: [42, 42], maxZoom: 14 });
    else if (valid.length === 1) map.setView(valid[0], 14);
  }, [map, positions]);
  return null;
}
