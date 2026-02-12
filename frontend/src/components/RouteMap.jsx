import React from "react";
import {
  CircleMarker,
  LayerGroup,
  LayersControl,
  MapContainer,
  Polyline,
  TileLayer,
  ZoomControl
} from "react-leaflet";

const typeColors = {
  museum: "#36e7ff",
  temple: "#92affa",
  monument: "#536eff",
  nature: "#1df0f0",
  park: "#7bd7ff",
  cafe: "#ffc700",
  other: "#8aa0c4"
};

const OSM_ATTR = "&copy; OpenStreetMap";
const ESRI_ATTR = "Tiles &copy; Esri";

export default function RouteMap({ points }) {
  if (!points || points.length === 0) {
    return <div className="map-placeholder">Карта появится после добавления точек.</div>;
  }
  const center = [points[0].lat, points[0].lng];
  const polyline = points.map((point) => [point.lat, point.lng]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="map-frame"
      scrollWheelZoom
      dragging
      doubleClickZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
      tap={false}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Карта">
          <TileLayer attribution={OSM_ATTR} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Спутник">
          <TileLayer
            attribution={ESRI_ATTR}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Гибрид">
          <LayerGroup>
            <TileLayer
              attribution={ESRI_ATTR}
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <TileLayer
              attribution={ESRI_ATTR}
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            />
          </LayerGroup>
        </LayersControl.BaseLayer>
      </LayersControl>
      <ZoomControl position="topright" />
      <Polyline positions={polyline} pathOptions={{ color: "#36e7ff", weight: 4 }} />
      {points.map((point) => (
        <CircleMarker
          key={point.id || `${point.lat}-${point.lng}`}
          center={[point.lat, point.lng]}
          radius={8}
          pathOptions={{ color: typeColors[point.point_type] || "#6a6a6a", fillOpacity: 0.9 }}
          interactive={false}
        />
      ))}
    </MapContainer>
  );
}
