import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock3, Edit3, Search, SlidersHorizontal, WalletCards } from "lucide-react";
import { mediaUrl } from "../../api/client";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/State";
import { useAuth } from "../../context/AuthContext";
import { useExcursions } from "../../hooks/useExcursions";
import { coverForExcursion, formatDate, minutes, money, nearestSession } from "../../utils/format";

export function CatalogPage() {
  const auth = useAuth();
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
          <span className="eyebrow">Экскурсии по Башкортостану</span>
          <h1>Выберите экскурсию, посмотрите программу и удобную дату</h1>
          <p>Научно-популярные маршруты, городские прогулки и тематические экскурсии для знакомства с культурой, историей и природой региона.</p>
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
                <div className="card-tags" aria-label="Параметры экскурсии">
                  <span><WalletCards size={15} /> {money(item.base_price)}</span>
                  <span><Clock3 size={15} /> {minutes(item.duration_min || item.route?.estimated_duration_min)}</span>
                  <span><CalendarDays size={15} /> {next ? formatDate(next.session_date, { day: "2-digit", month: "short" }) : "даты уточняются"}</span>
                </div>
              </div>
              <div className="excursion-card__actions">
                <Link to={`/excursions/${item.id}`}>Подробнее</Link>
                <Link to={`/excursions/${item.id}#booking`}>Записаться</Link>
                {auth.isStaff && <Link className="card-edit-link" to={`/admin/excursions/${item.id}/edit`} aria-label={`Редактировать экскурсию ${item.title}`}><Edit3 size={17} /></Link>}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
