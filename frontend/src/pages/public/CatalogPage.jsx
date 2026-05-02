import React from "react";
import { Link } from "react-router-dom";
import { MapPinned, Search, SlidersHorizontal } from "lucide-react";
import { mediaUrl } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/State";
import { useExcursions } from "../../hooks/useExcursions";
import { coverForExcursion, formatDate, minutes, money, nearestSession } from "../../utils/format";

export function CatalogPage() {
  const { excursions, loading, error } = useExcursions();
  const [query, setQuery] = React.useState("");
  const [withDatesOnly, setWithDatesOnly] = React.useState(false);

  const filtered = excursions.filter((item) => {
    const haystack = [item.title, item.description, item.meeting_point].filter(Boolean).join(" ").toLowerCase();
    const byQuery = haystack.includes(query.toLowerCase());
    const byDate = !withDatesOnly || Boolean(item.sessions?.length);
    return byQuery && byDate;
  });

  return (
    <div className="catalog-page">
      <section className="catalog-hero">
        <div>
          <span className="eyebrow">АИС экскурсионных маршрутов</span>
          <h1>Экскурсии по Башкортостану с понятным маршрутом, датой и заявкой</h1>
          <p>GIDIX показывает программу экскурсии как управляемый маршрут: точки интереса, расписание, вместимость и статус заявки связаны в один сценарий.</p>
          <div className="hero-actions">
            <Button as="link" to="/map" tone="primary"><MapPinned size={18} /> Карта маршрутов</Button>
            <Button as="link" to="/how-it-works" tone="neutral">Как записаться</Button>
          </div>
        </div>
        <div className="hero-facts" aria-label="Ключевые возможности">
          <span><strong>{excursions.length}</strong> экскурсии</span>
          <span><strong>{excursions.reduce((sum, item) => sum + (item.route?.points?.length || 0), 0)}</strong> точек</span>
          <span><strong>5 шагов</strong> заявка</span>
        </div>
      </section>

      <section className="catalog-tools" aria-label="Поиск и фильтры">
        <label className="search-field">
          <Search size={18} aria-hidden />
          <input value={query} placeholder="Поиск по названию, описанию или месту встречи" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="toggle-filter">
          <input type="checkbox" checked={withDatesOnly} onChange={(event) => setWithDatesOnly(event.target.checked)} />
          <SlidersHorizontal size={17} aria-hidden /> Только с доступными датами
        </label>
      </section>

      {loading && <LoadingState text="Загрузка каталога экскурсий" />}
      {error && <ErrorState text={error} />}
      {!loading && !filtered.length && <EmptyState title="Экскурсии не найдены" text="Попробуйте изменить запрос или убрать фильтр по датам." />}

      <section className="excursion-grid">
        {filtered.map((item) => {
          const next = nearestSession(item.sessions);
          return (
            <article className="excursion-card" key={item.id}>
              <img src={mediaUrl(coverForExcursion(item))} alt="" />
              <div className="excursion-card__body">
                <h2>{item.title}</h2>
                <p>{item.description || "Описание экскурсии пока не заполнено."}</p>
                <dl className="fact-grid">
                  <div><dt>Цена</dt><dd>{money(item.base_price)}</dd></div>
                  <div><dt>Длительность</dt><dd>{minutes(item.duration_min || item.route?.estimated_duration_min)}</dd></div>
                  <div><dt>Точек</dt><dd>{item.route?.points?.length || 0}</dd></div>
                  <div><dt>Ближайшая дата</dt><dd>{next ? formatDate(next.session_date, { day: "2-digit", month: "short" }) : "нет дат"}</dd></div>
                </dl>
              </div>
              <div className="excursion-card__actions">
                <Link to={`/excursions/${item.id}`}>Записаться</Link>
                <Link to={`/map?excursion=${item.id}`}>Посмотреть маршрут</Link>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
