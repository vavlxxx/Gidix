import React from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { mediaUrl } from "../../api/client";
import { mediaGallery, placeholderImage, routeLine, sortedRoutePoints } from "../../utils/format";
import { pointIcon, pointPosition, tileAttribution, tileUrl } from "../../utils/map";

export function RouteMap({ route, excursion, highlightedPointId, className = "route-map" }) {
  const points = React.useMemo(() => sortedRoutePoints(route).filter((link) => pointPosition(link?.point)), [route]);
  const line = React.useMemo(() => routeLine(route), [route?.geometry_geojson]);
  const markerPositions = React.useMemo(() => points.map((link) => pointPosition(link.point)).filter(Boolean), [points]);
  const fitPositions = line.positions.length ? line.positions : markerPositions;
  const center = line.positions[0] || markerPositions[0] || [54.7351, 55.9587];
  const [fitSignal, setFitSignal] = React.useState(0);

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom className={className}>
      <TileLayer attribution={tileAttribution} url={tileUrl} />
      <FitBounds positions={fitPositions} routeId={route?.id || "new"} fitSignal={fitSignal} />
      <button type="button" className="map-fit-button" onClick={() => setFitSignal((value) => value + 1)} disabled={!fitPositions.length}>
        Показать весь маршрут
      </button>
      {!line.positions.length && (
        <div className="map-empty-note">
          <strong>Маршрут ещё не построен</strong>
          <span>На карте показаны только места посещения.</span>
        </div>
      )}
      {line.positions.length > 1 && (
        <Polyline positions={line.positions} pathOptions={{ color: "#207bfb", weight: 6, opacity: 0.92, lineCap: "round", lineJoin: "round" }} />
      )}
      {points.map((link, index) => {
        const gallery = mediaGallery(link.point);
        return (
          <Marker
            key={link.id || `${link.point_id}-${index}`}
            position={pointPosition(link.point)}
            icon={pointIcon({
              imageUrl: mediaUrl(gallery[0] || link.point?.image_url || ""),
              label: index + 1,
              selected: true,
              active: highlightedPointId === link.point_id,
            })}
          >
            <Tooltip>{index + 1}. {link.point.name}</Tooltip>
            <Popup autoPan={false}>
              <article className="map-popup">
                <PopupCarousel images={gallery.length ? gallery : [placeholderImage]} />
                <strong>{link.point.name}</strong>
                <p>{link.point.short_description || link.note || "Точка маршрута"}</p>
                {link.point.address && <small>{link.point.address}</small>}
                <small>Время посещения: {link.visit_duration_min || link.point.visit_duration_min || 15} мин</small>
                {excursion && <Link className="popup-link" to={`/excursions/${excursion.id}`}>Открыть экскурсию</Link>}
              </article>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
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

export function MapLegend() {
  return (
    <div className="map-legend" aria-label="Легенда карты">
      <span><i className="legend-dot" /> Место посещения</span>
      <span><i className="legend-line" /> Маршрут экскурсии</span>
    </div>
  );
}

function FitBounds({ positions, routeId, fitSignal }) {
  const map = useMap();
  const lastRouteId = React.useRef(null);
  React.useEffect(() => {
    const shouldFit = lastRouteId.current !== routeId || fitSignal > 0;
    if (!shouldFit) return;
    const valid = positions.filter((position) => Number.isFinite(position?.[0]) && Number.isFinite(position?.[1]));
    if (valid.length > 1) map.fitBounds(valid, { padding: [42, 42], maxZoom: 15 });
    else if (valid.length === 1) map.setView(valid[0], 14);
    lastRouteId.current = routeId;
  }, [map, positions, routeId, fitSignal]);
  return null;
}
