import React from "react";
import { ArrowDown, ArrowUp, GripVertical, X } from "lucide-react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { mediaUrl } from "../../api/client";
import { Button } from "../ui/Button";
import { mediaGallery, placeholderImage } from "../../utils/format";
import { pointIcon, pointPosition, tileAttribution, tileUrl } from "../../utils/map";

export function AdminRouteBuilderMap({ points, selectedIds, onTogglePoint, onMovePoint, onReorderPoint, routeGeometry, onGeometryChange, loading = false }) {
  const selectedPoints = selectedIds.map((id) => points.find((point) => point.id === id)).filter(Boolean);
  const selectedLine = selectedPoints.map(pointPosition).filter(Boolean);
  const plannedLine = routeGeometry?.coordinates?.map(([lon, lat]) => [lat, lon]) || [];
  const allPositions = points.map(pointPosition).filter(Boolean);
  const center = selectedLine[0] || allPositions[0] || [54.7351, 55.9587];
  const editableIndexes = plannedLine.length > 2 ? plannedLine.map((_, index) => index).filter((index) => index === 0 || index === plannedLine.length - 1 || index % Math.ceil(plannedLine.length / 70) === 0) : [];

  function changeVertex(index, latlng) {
    const next = plannedLine.map(([lat, lon], current) => current === index ? [latlng.lat, latlng.lng] : [lat, lon]);
    onGeometryChange?.({ type: "LineString", coordinates: next.map(([lat, lon]) => [lon, lat]) });
  }

  return (
    <section className="route-builder">
      <div className="route-builder__map">
        <MapContainer center={center} zoom={12} scrollWheelZoom className="builder-map">
          <TileLayer attribution={tileAttribution} url={tileUrl} />
          <FitBoundsOnce positions={allPositions.length ? allPositions : selectedLine} />
          {plannedLine.length > 1 && <Polyline positions={plannedLine} pathOptions={{ color: "#207bfb", weight: 6, opacity: .88, lineCap: "round" }} />}
          {editableIndexes.map((index) => (
            <Marker
              key={`vertex-${index}`}
              position={plannedLine[index]}
              draggable
              icon={pointIcon("", "vertex", true)}
              eventHandlers={{ dragend: (event) => changeVertex(index, event.target.getLatLng()) }}
            >
              <Tooltip>Перетащите, чтобы уточнить линию маршрута</Tooltip>
            </Marker>
          ))}
          {points.map((point) => {
            const selectedIndex = selectedIds.indexOf(point.id);
            const selected = selectedIndex >= 0;
            const position = pointPosition(point);
            if (!position) return null;
            return (
              <Marker key={point.id} position={position} icon={pointIcon(selected ? selectedIndex + 1 : "", selected ? "active" : "default", !selected)}>
                <Tooltip>{point.name}</Tooltip>
                <Popup>
                  <PointPopup point={point} selected={selected} onToggle={() => onTogglePoint(point.id)} />
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        {loading && <div className="map-loading"><span className="loader-orbit" /> Строим план экскурсии...</div>}
      </div>
      <aside className="route-builder__panel">
        <h2>Выбранные точки</h2>
        <p>Порядок точек можно менять перетаскиванием. Сохранённую линию маршрута можно уточнять прямо на карте.</p>
        <ol className="selected-points">
          {selectedPoints.map((point, index) => (
            <li
              key={point.id}
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const source = Number(event.dataTransfer.getData("text/plain"));
                if (Number.isFinite(source)) onReorderPoint?.(source, index);
              }}
            >
              <GripVertical size={16} aria-hidden />
              <span>{index + 1}</span>
              <img src={mediaUrl(mediaGallery(point)[0] || placeholderImage)} alt="" />
              <strong>{point.name}</strong>
              <div>
                <button type="button" aria-label="Переместить выше" onClick={() => onMovePoint(index, -1)} disabled={index === 0}><ArrowUp size={15} /></button>
                <button type="button" aria-label="Переместить ниже" onClick={() => onMovePoint(index, 1)} disabled={index === selectedPoints.length - 1}><ArrowDown size={15} /></button>
                <button type="button" aria-label="Удалить точку из маршрута" onClick={() => onTogglePoint(point.id)}><X size={15} /></button>
              </div>
            </li>
          ))}
        </ol>
        {!selectedPoints.length && <div className="panel-hint">Откройте точку на карте и нажмите «Добавить в маршрут».</div>}
        <p className="panel-hint">{plannedLine.length > 1 ? "Линию маршрута можно уточнить перетаскиванием белых точек." : "Дорожная линия построится при сохранении маршрута."}</p>
      </aside>
    </section>
  );
}

function PointPopup({ point, selected, onToggle }) {
  const images = mediaGallery(point);
  return (
    <article className="map-popup map-popup--rich">
      <PopupCarousel images={images.length ? images : [placeholderImage]} />
      <strong>{point.name}</strong>
      <p>{point.short_description || point.address || "Точка интереса"}</p>
      <small>{point.address || "Адрес не указан"} · {point.visit_duration_min || 15} мин</small>
      <Button type="button" tone={selected ? "neutral" : "primary"} onClick={onToggle}>
        {selected ? "Убрать из маршрута" : "Добавить в маршрут"}
      </Button>
    </article>
  );
}

function PopupCarousel({ images }) {
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    if (images.length < 2) return undefined;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % images.length), 2000);
    return () => window.clearInterval(timer);
  }, [images.length]);
  return <img src={mediaUrl(images[index] || placeholderImage)} alt="" />;
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
