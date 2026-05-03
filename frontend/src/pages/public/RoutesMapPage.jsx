import React from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/State";
import { RoutesExplorerMap } from "../../components/map/RoutesExplorerMap";
import { PageHeader } from "../../components/ui/PageHeader";
import { useExcursions } from "../../hooks/useExcursions";

export function RoutesMapPage() {
  const { excursions, loading, error } = useExcursions();
  const [params] = useSearchParams();
  const initial = Number(params.get("excursion"));
  const [selectedId, setSelectedId] = React.useState(initial || null);
  const [hoveredPointId] = React.useState(null);

  React.useEffect(() => {
    if (!selectedId && excursions.length) setSelectedId(excursions[0].id);
  }, [excursions, selectedId]);

  return (
    <div className="map-page">
      <PageHeader
        eyebrow="Карта маршрутов"
        title="Карта экскурсий"
        description="Выберите экскурсию слева: карта покажет прогулочную линию маршрута и места посещения."
      />
      {loading && <LoadingState text="Загрузка маршрутов" />}
      {error && <ErrorState text={error} />}
      {!loading && !excursions.length && <EmptyState title="Маршрутов пока нет" text="Создайте точки и маршрут в рабочем кабинете." />}
      {!!excursions.length && <RoutesExplorerMap excursions={excursions} selectedId={selectedId} hoveredPointId={hoveredPointId} onSelect={setSelectedId} />}
    </div>
  );
}
