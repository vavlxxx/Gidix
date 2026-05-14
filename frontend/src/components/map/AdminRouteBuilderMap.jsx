import React from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { mediaUrl } from "../../api/client";
import { geoJsonToLeafletLatLngs, leafletLatLngsToGeoJson } from "../../utils/geojson";
import { mediaGallery, placeholderImage } from "../../utils/format";
import { createPoiMarkerIcon, pointIcon, pointPosition, tileAttribution, tileUrl } from "../../utils/map";
import { Button } from "../ui/Button";

export function AdminRouteBuilderMap({
  points,
  selectedIds,
  onTogglePoint,
  onMovePoint,
  onReorderPoint,
  routeGeometry,
  builtGeometry,
  onGeometryChange,
  onBuildPlan,
  onSaveGeometry,
  onResetGeometry,
  loading = false,
  savingGeometry = false,
  needsRebuild = false,
  routeGenerationEnabled = true,
}) {
  const selectedPoints = selectedIds.map((id) => points.find((point) => point.id === id)).filter(Boolean);
  const selectedPositions = selectedPoints.map(pointPosition).filter(Boolean);
  const plannedLine = React.useMemo(() => geoJsonToLeafletLatLngs(routeGeometry), [routeGeometry]);
  const allPositions = points.map(pointPosition).filter(Boolean);
  const center = selectedPositions[0] || plannedLine[0] || allPositions[0] || [54.7351, 55.9587];
  const [editing, setEditing] = React.useState(false);
  const [draftLine, setDraftLine] = React.useState([]);

  React.useEffect(() => {
    if (!editing) setDraftLine(plannedLine);
  }, [editing, plannedLine]);

  function startEditing() {
    setDraftLine(plannedLine);
    setEditing(true);
  }

  function finishEditing() {
    const geometry = leafletLatLngsToGeoJson(draftLine);
    if (geometry) onGeometryChange?.(geometry);
    setEditing(false);
  }

  function cancelEditing() {
    setDraftLine(plannedLine);
    setEditing(false);
  }

  function changeVertex(index, latlng) {
    setDraftLine((line) => line.map((point, current) => current === index ? [latlng.lat, latlng.lng] : point));
  }

  function insertVertex(index) {
    setDraftLine((line) => {
      const current = line[index];
      const next = line[index + 1];
      if (!current || !next) return line;
      const midpoint = [(current[0] + next[0]) / 2, (current[1] + next[1]) / 2];
      return [...line.slice(0, index + 1), midpoint, ...line.slice(index + 1)];
    });
  }

  function removeVertex(index) {
    setDraftLine((line) => line.length <= 2 || index === 0 || index === line.length - 1 ? line : line.filter((_, current) => current !== index));
  }

  const activeLine = editing ? draftLine : plannedLine;

  return (
    <section className="route-builder">
      <div className="route-builder__map">
        <MapContainer center={center} zoom={12} scrollWheelZoom className="builder-map">
          <TileLayer attribution={tileAttribution} url={tileUrl} />
          <FitBoundsOnce positions={plannedLine.length ? plannedLine : selectedPositions.length ? selectedPositions : allPositions} />
          {!plannedLine.length && !needsRebuild && (
            <div className="map-empty-note map-empty-note--builder">
              <strong>Маршрут ещё не построен</strong>
              <span>Выберите точки и постройте план экскурсии.</span>
            </div>
          )}
          {needsRebuild && !editing && <div className="map-warning-note">Порядок точек изменён. Постройте план экскурсии заново.</div>}
          {activeLine.length > 1 && (
            <Polyline positions={activeLine} pathOptions={{ color: editing ? "#3cb63a" : "#207bfb", weight: 6, opacity: 0.9, lineCap: "round", lineJoin: "round" }} />
          )}
          {editing && draftLine.slice(0, -1).map((position, index) => {
            const next = draftLine[index + 1];
            const midpoint = [(position[0] + next[0]) / 2, (position[1] + next[1]) / 2];
            return (
              <Marker key={`insert-${index}`} position={midpoint} icon={pointIcon({ label: "+", variant: "vertex-add" })} eventHandlers={{ click: () => insertVertex(index) }}>
                <Tooltip>Добавить вершину</Tooltip>
              </Marker>
            );
          })}
          {editing && draftLine.map((position, index) => (
            <Marker
              key={`vertex-${index}`}
              position={position}
              draggable
              icon={pointIcon({ variant: "vertex" })}
              eventHandlers={{ dragend: (event) => changeVertex(index, event.target.getLatLng()) }}
            >
              <Tooltip>Перетащите вершину линии</Tooltip>
              {index > 0 && index < draftLine.length - 1 && (
                <Popup autoPan={false}>
                  <button type="button" className="popup-action" onClick={() => removeVertex(index)}><Trash2 size={15} /> Удалить вершину</button>
                </Popup>
              )}
            </Marker>
          ))}
          {points.map((point) => {
            const selectedIndex = selectedIds.indexOf(point.id);
            const selected = selectedIndex >= 0;
            const position = pointPosition(point);
            if (!position) return null;
            return (
              <Marker
                key={point.id}
                position={position}
                icon={createPoiMarkerIcon(point, { label: selected ? selectedIndex + 1 : "", selected, active: selected })}
              >
                <Tooltip>{point.name}</Tooltip>
                <Popup autoPan={false}>
                  <PointPopup point={point} selected={selected} onToggle={() => onTogglePoint(point.id)} />
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        {loading && <div className="map-loading"><span className="loader-orbit loader-orbit--large" /> <span>Строим план экскурсии, подождите...</span></div>}
      </div>
      <div className="map-toolbar">
        <Button type="button" tone="primary" onClick={onBuildPlan} disabled={loading || selectedIds.length < 2 || !routeGenerationEnabled}>
          <Plus size={17} /> Построить план экскурсии
        </Button>
        {!routeGenerationEnabled && <span className="inline-hint">Автоматический расчёт маршрута отключён, порядок точек задаётся вручную</span>}
        {!editing ? (
          <Button type="button" tone="neutral" onClick={startEditing} disabled={plannedLine.length < 2 || loading}>
            <Pencil size={17} /> Редактировать линию
          </Button>
        ) : (
          <>
            <Button type="button" tone="primary" onClick={finishEditing}><Save size={17} /> Завершить редактирование</Button>
            <Button type="button" tone="neutral" onClick={cancelEditing}><RotateCcw size={17} /> Отменить</Button>
          </>
        )}
        <Button type="button" tone="neutral" onClick={onSaveGeometry} disabled={savingGeometry || !plannedLine.length || loading}>
          <Save size={17} /> {savingGeometry ? "Сохраняем..." : "Сохранить изменения"}
        </Button>
      </div>
      <aside className="route-builder__panel">
        <div className="route-builder__panel-head">
          <h2>Выбранные точки</h2>
          <p>Порядок точек можно менять перетаскиванием. Сохранённую линию маршрута можно уточнять прямо на карте.</p>
        </div>
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
              <span>{index + 1}</span>
              <img src={mediaUrl(mediaGallery(point)[0] || point.image_url || placeholderImage)} alt="" />
              <div className="selected-point-copy">
                <strong>{point.name}</strong>
              </div>
              <div className="selected-point-actions">
                <button type="button" aria-label="Переместить выше" onClick={() => onMovePoint(index, -1)} disabled={index === 0}><ArrowUp size={15} /></button>
                <button type="button" aria-label="Переместить ниже" onClick={() => onMovePoint(index, 1)} disabled={index === selectedPoints.length - 1}><ArrowDown size={15} /></button>
                <button type="button" aria-label="Удалить точку из маршрута" onClick={() => onTogglePoint(point.id)}><X size={15} /></button>
              </div>
            </li>
          ))}
        </ol>
        {!selectedPoints.length && <div className="panel-hint">Откройте точку на карте и нажмите «Добавить в маршрут».</div>}
        {selectedPoints.length === 1 && <div className="panel-hint">Для маршрута нужны минимум две точки.</div>}
        {needsRebuild && <div className="panel-hint panel-hint--warning">Порядок изменён. Нажмите «Построить план экскурсии».</div>}
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
      {point.address && <small>{point.address}</small>}
      <small>Время посещения: {point.visit_duration_min || 15} мин</small>
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
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % images.length), 4000);
    return () => window.clearInterval(timer);
  }, [images.length]);
  return (
    <div className="map-popup__carousel">
      {images.map((image, imageIndex) => (
        <img key={`${image}-${imageIndex}`} className={imageIndex === index ? "is-active" : ""} src={mediaUrl(image || placeholderImage)} alt="" />
      ))}
    </div>
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
