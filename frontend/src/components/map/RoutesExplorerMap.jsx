import { RouteMap, MapLegend } from "./RouteMap";

export function RoutesExplorerMap({ excursions, selectedId, hoveredPointId, onSelect }) {
  const selected = excursions.find((item) => item.id === selectedId) || excursions[0];

  return (
    <section className="routes-explorer">
      <div className="routes-explorer__list" aria-label="Список маршрутов">
        {excursions.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`route-list-item ${selected?.id === item.id ? "is-active" : ""}`}
            onClick={() => onSelect(item.id)}
          >
            <strong>{item.title}</strong>
            <span>{item.route?.points?.length || 0} точек · {item.route?.estimated_length_km || "—"} км</span>
          </button>
        ))}
      </div>
      <div className="routes-explorer__map">
        {selected?.route ? <RouteMap route={selected.route} excursion={selected} highlightedPointId={hoveredPointId} className="explorer-map" /> : <div className="map-placeholder">Выберите экскурсию с маршрутом</div>}
        <MapLegend />
      </div>
    </section>
  );
}
