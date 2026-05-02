import React from "react";
import { useParams } from "react-router-dom";
import { CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Users, WalletCards } from "lucide-react";
import { adminApi, bookingsApi, excursionsApi, mediaUrl } from "../../api/client";
import { RouteMap, MapLegend } from "../../components/map/RouteMap";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { MasonryGallery } from "../../components/ui/MasonryGallery";
import { EmptyState, ErrorState, LoadingState, SuccessState } from "../../components/ui/State";
import { useToast } from "../../context/ToastContext";
import { availablePlacesTotal, cleanPayload, formatDate, formatTime, mediaGallery, minutes, money, placeholderImage, sortedRoutePoints } from "../../utils/format";

const emptyForm = { session_id: "", participants_count: 1, customer_name: "", customer_phone: "", customer_email: "", comment: "" };

export function ExcursionDetailPage() {
  const { id } = useParams();
  const notify = useToast();
  const [item, setItem] = React.useState(null);
  const [sessions, setSessions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [form, setForm] = React.useState(emptyForm);
  const [success, setSuccess] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [calendarMonth, setCalendarMonth] = React.useState(startOfMonth(new Date()));

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const detail = await excursionsApi.get(id);
        const sessionList = await adminApi.excursionSessions(id).catch(() => detail.sessions || []);
        setItem(detail);
        setSessions(sessionList);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const dates = [...new Set(sessions.map((session) => session.session_date))].sort();
  const selectedSession = sessions.find((session) => String(session.id) === String(form.session_id));
  const selectedDate = selectedSession?.session_date || "";
  const times = selectedDate ? sessions.filter((session) => session.session_date === selectedDate) : [];
  const routePoints = sortedRoutePoints(item?.route);
  const nearest = sessions[0];
  const heroImages = React.useMemo(() => {
    const images = [...mediaGallery(item), ...(routePoints || []).flatMap((link) => mediaGallery(link.point))].filter(Boolean);
    return images.length ? images : [placeholderImage];
  }, [item, routePoints]);

  function setDate(date) {
    const first = sessions.find((session) => session.session_date === date);
    setForm((prev) => ({ ...prev, session_id: first ? String(first.id) : "" }));
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const booking = await bookingsApi.create(cleanPayload({
        ...form,
        excursion_id: Number(id),
        session_id: Number(form.session_id),
        participants_count: Number(form.participants_count)
      }));
      setSuccess(booking);
      setForm(emptyForm);
      notify.success("Заявка отправлена менеджеру.");
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState text="Загрузка экскурсии" />;
  if (error) return <ErrorState text={error} />;
  if (!item) return <EmptyState title="Экскурсия не найдена" />;

  return (
    <article className="excursion-detail">
      <section className="detail-hero detail-hero--photo">
        <HeroCarouselBackground images={heroImages} />
        <div className="detail-hero__content">
          <span className="eyebrow">Карточка экскурсии</span>
          <h1>{item.title}</h1>
          <p>{item.description || item.route?.description || "Описание экскурсии будет уточнено менеджером."}</p>
          <div className="detail-badges" aria-label="Краткая информация об экскурсии">
            <span><WalletCards size={17} /> {money(item.base_price)}</span>
            <span><Clock3 size={17} /> {minutes(item.duration_min || item.route?.estimated_duration_min)}</span>
            <span><CalendarCheck size={17} /> {nearest ? formatDate(nearest.session_date, { day: "2-digit", month: "short" }) : "дат пока нет"}</span>
          </div>
        </div>
      </section>

      <section className="detail-story-section">
        <div className="detail-story detail-story--single">
          <div>
            <div className="section-header">
              <div>
                <h2>Описание экскурсии</h2>
                <p>{item.meeting_point ? `Место встречи: ${item.meeting_point}` : "Место встречи уточнит менеджер после подтверждения заявки."}</p>
              </div>
            </div>
            <p className="detail-description">{item.description || item.route?.description || "Описание экскурсии будет уточнено менеджером."}</p>
          </div>
        </div>
        <MasonryGallery images={heroImages} />
      </section>

      <section className="detail-map-section">
        <RouteMap route={item.route} excursion={item} className="detail-map" />
        <MapLegend />
      </section>

      <section className="route-timeline">
        <h2>Точки маршрута</h2>
        <ol>
          {routePoints.map((link, index) => (
            <li key={link.id || link.point_id}>
              <span>{index + 1}</span>
              <img src={mediaUrl(link.point?.image_url || placeholderImage)} alt="" />
              <div>
                <h3>{link.point?.name || `Точка ${link.point_id}`}</h3>
                <p>{link.point?.short_description || link.note || "Точка маршрута"}</p>
                <small>{minutes(link.visit_duration_min || link.point?.visit_duration_min)}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="booking-flow" id="booking">
        <div className="section-header">
          <div>
            <h2>Записаться на экскурсию</h2>
            <p>Последовательно выберите дату, время, количество участников и оставьте контакты.</p>
          </div>
        </div>

        {success ? (
          <SuccessState
            title={`Заявка №${success.id} создана`}
            text="Статус: ожидает подтверждения. Менеджер свяжется с вами для согласования деталей."
            action={<Button type="button" tone="neutral" onClick={() => setSuccess(null)}>Оставить ещё одну заявку</Button>}
          />
        ) : (
          <form className="booking-steps" onSubmit={submit}>
            <div className="booking-calendar-panel">
              <div className="booking-calendar">
                <div className="calendar-head">
                  <button type="button" aria-label="Предыдущий месяц" onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}><ChevronLeft size={18} /></button>
                  <h3>{formatDate(calendarMonth, { month: "long", year: "numeric" })}</h3>
                  <button type="button" aria-label="Следующий месяц" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}><ChevronRight size={18} /></button>
                </div>
                <div className="calendar-grid calendar-grid--weekdays">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day}>{day}</span>)}</div>
                <div className="calendar-grid">
                  {calendarDays(calendarMonth).map((day) => {
                    const date = isoDate(day);
                    const daySessions = sessions.filter((session) => session.session_date === date);
                    return (
                      <button type="button" key={date} disabled={!daySessions.length} className={`${date === selectedDate ? "is-active" : ""} ${day.getMonth() !== calendarMonth.getMonth() ? "is-muted" : ""}`} onClick={() => setDate(date)}>
                        <strong>{day.getDate()}</strong>
                        {!!daySessions.length && <span>{daySessions.length} время</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {!dates.length && <EmptyState title="Дат пока нет" text="Оставьте заявку позже, когда менеджер опубликует расписание." />}
              <div className="time-slots">
                <strong>Доступное время</strong>
                {times.map((session) => <button type="button" key={session.id} className={String(session.id) === String(form.session_id) ? "is-active" : ""} onClick={() => setForm({ ...form, session_id: String(session.id) })}>{formatTime(session.start_time)} · {session.available_places ?? session.capacity} мест</button>)}
                {!times.length && <span>Выберите день с доступной записью.</span>}
              </div>
            </div>
            <div className="booking-participants">
              <strong><Users size={18} /> Участники</strong>
              <FormField label="Количество участников" required>
                <input type="number" min="1" max={selectedSession?.available_places || item.max_participants} value={form.participants_count} onChange={(event) => setForm({ ...form, participants_count: event.target.value })} required />
              </FormField>
            </div>
            <div className="booking-contact-grid">
              <div className="booking-contact-fields">
                <FormField label="ФИО" required><input value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} required /></FormField>
                <FormField label="Телефон"><input value={form.customer_phone} placeholder="+7..." onChange={(event) => setForm({ ...form, customer_phone: event.target.value })} /></FormField>
                <FormField label="Email"><input type="email" value={form.customer_email} placeholder="name@example.ru" onChange={(event) => setForm({ ...form, customer_email: event.target.value })} /></FormField>
              </div>
              <FormField label="Сообщение или комментарий"><textarea value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} /></FormField>
            </div>
            <div className="booking-submit">
              <strong><CheckCircle2 size={18} /> Подтверждение</strong>
              <p>Свободных мест по выбранной дате: {selectedSession?.available_places ?? availablePlacesTotal(sessions, item.max_participants)}</p>
              <Button type="submit" tone="primary" disabled={!form.session_id || !form.customer_name || submitting}>{submitting ? "Отправляем..." : "Отправить заявку"}</Button>
            </div>
          </form>
        )}
      </section>
    </article>
  );
}

function HeroCarouselBackground({ images }) {
  const list = images.length ? images : [placeholderImage];
  const doubled = [...list, ...list];
  return (
    <div className="hero-carousel-bg" aria-hidden>
      <div className="hero-carousel-track">
        {doubled.map((image, index) => <img key={`${image}-${index}`} src={mediaUrl(image)} alt="" />)}
      </div>
    </div>
  );
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarDays(month) {
  const first = startOfMonth(month);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}
