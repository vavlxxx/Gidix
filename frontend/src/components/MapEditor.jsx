import React from "react";
import {
  CircleMarker,
  LayerGroup,
  LayersControl,
  MapContainer,
  Polyline,
  TileLayer,
  ZoomControl,
  useMapEvents
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

function MapClickHandler({ onAddPoint }) {
  useMapEvents({
    click(event) {
      if (!onAddPoint) return;
      const { lat, lng } = event.latlng;
      onAddPoint({ lat, lng });
    }
  });
  return null;
}

export default function MapEditor({ points, onAddPoint, onSelectPoint }) {
  const center = points.length ? [points[0].lat, points[0].lng] : [55.751244, 37.618423];
  const polyline = points.map((point) => [point.lat, point.lng]);

  return (
    <MapContainer
      center={center}
      zoom={12}
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
      <MapClickHandler onAddPoint={onAddPoint} />
      {polyline.length > 1 && (
        <Polyline positions={polyline} pathOptions={{ color: "#36e7ff", weight: 4 }} />
      )}
      {points.map((point, index) => (
        <CircleMarker
          key={`${point.lat}-${point.lng}-${index}`}
          center={[point.lat, point.lng]}
          radius={8}
          pathOptions={{ color: typeColors[point.point_type] || "#6a6a6a", fillOpacity: 0.9 }}
          interactive={Boolean(onSelectPoint)}
          eventHandlers={
            onSelectPoint
              ? {
                  click: (event) => {
                    event?.originalEvent?.stopPropagation();
                    onSelectPoint(index);
                  }
                }
              : undefined
          }
        />
      ))}
    </MapContainer>
  );
}
