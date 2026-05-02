import React from "react";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { mediaUrl } from "../../api/client";
import { Button } from "../ui/Button";
import { placeholderImage } from "../../utils/format";
import { pointIcon, pointPosition, tileAttribution, tileUrl } from "../../utils/map";

export function AdminRouteBuilderMap({ points, selectedIds, onTogglePoint, onMovePoint, routeGeometry, loading = false }) {
  const selectedPoints = selectedIds.map((id) => points.find((point) => point.id === id)).filter(Boolean);
  const selectedLine = selectedPoints.map(pointPosition).filter(Boolean);
  const plannedLine = routeGeometry?.coordinates?.map(([lon, lat]) => [lat, lon]) || [];
  const allPositions = points.map(pointPosition).filter(Boolean);
  const center = selectedLine[0] || allPositions[0] || [54.7351, 55.9587];

  return (
    <section className="route-builder">
      <div className="route-builder__map">
        <MapContainer center={center} zoom={12} scrollWheelZoom className="builder-map">
          <TileLayer attribution={tileAttribution} url={tileUrl} />
          <FitBoundsOnce positions={allPositions.length ? allPositions : selectedLine} />
          {selectedLine.length > 1 && <Polyline positions={selectedLine} pathOptions={{ color: "#6a7680", weight: 4, opacity: .65, dashArray: "7 7" }} />}
          {plannedLine.length > 1 && <Polyline positions={plannedLine} pathOptions={{ color: "#207bfb", weight: 6, opacity: .86 }} />}
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
        {loading && <div className="map-loading">Строим план экскурсии...</div>}
      </div>
      <aside className="route-builder__panel">
        <h2>Выбранные точки</h2>
        <p>Порядок точек определяет программу посещения. Его можно менять кнопками или выбором точек на карте.</p>
        <ol className="selected-points">
          {selectedPoints.map((point, index) => (
            <li key={point.id}>
              <span>{index + 1}</span>
              <img src={mediaUrl(point.image_url || placeholderImage)} alt="" />
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
          <span>{plannedLine.length > 1 ? "План экскурсии построен" : "План будет построен при сохранении"}</span>
        </div>
      </aside>
    </section>
  );
}

function FitBoundsOnce({ positions }) {
  const map = useMap();
  const fitted = React.useRef(false);
  React.useEffect(() => {
    if (fitted.current) return;
    const valid = positions.filter((position) => Number.isFinite(position?.[0]) && Number.isFinite(position?.[1]));
    if (valid.length > 1) {
      map.fitBounds(valid, { padding: [42, 42], maxZoom: 14 });
      fitted.current = true;
    } else if (valid.length === 1) {
      map.setView(valid[0], 14);
      fitted.current = true;
    }
  }, [map, positions]);
  return null;
}
