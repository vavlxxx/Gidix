import React from "react";
import { useParams } from "react-router-dom";
import { CalendarCheck, CheckCircle2, Users } from "lucide-react";
import { adminApi, bookingsApi, excursionsApi, mediaUrl } from "../../api/client";
import { RouteMap, MapLegend } from "../../components/map/RouteMap";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { EmptyState, ErrorState, LoadingState, SuccessState } from "../../components/ui/State";
import { useToast } from "../../context/ToastContext";
import { availablePlacesTotal, cleanPayload, formatDate, formatTime, km, minutes, money, placeholderImage, sortedRoutePoints } from "../../utils/format";

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
      <section className="detail-hero">
        <div>
          <span className="eyebrow">Карточка экскурсии</span>
          <h1>{item.title}</h1>
          <p>{item.description || item.route?.description || "Описание экскурсии будет уточнено менеджером."}</p>
          <dl className="detail-facts">
            <div><dt>Цена</dt><dd>{money(item.base_price)}</dd></div>
            <div><dt>Длительность</dt><dd>{minutes(item.duration_min || item.route?.estimated_duration_min)}</dd></div>
            <div><dt>Протяжённость</dt><dd>{km(item.route?.estimated_length_km)}</dd></div>
            <div><dt>Точек</dt><dd>{routePoints.length}</dd></div>
            <div><dt>Ближайшая дата</dt><dd>{nearest ? formatDate(nearest.session_date, { day: "2-digit", month: "short" }) : "нет дат"}</dd></div>
          </dl>
        </div>
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
            <div className="booking-step">
              <strong><CalendarCheck size={18} /> Шаг 1 — дата</strong>
              <div className="choice-grid">
                {dates.map((date) => <button type="button" key={date} className={date === selectedDate ? "is-active" : ""} onClick={() => setDate(date)}>{formatDate(date, { day: "2-digit", month: "long" })}</button>)}
              </div>
              {!dates.length && <EmptyState title="Дат пока нет" text="Оставьте заявку позже, когда менеджер опубликует расписание." />}
            </div>
            <div className="booking-step">
              <strong>Шаг 2 — время</strong>
              <div className="choice-grid">
                {times.map((session) => <button type="button" key={session.id} className={String(session.id) === String(form.session_id) ? "is-active" : ""} onClick={() => setForm({ ...form, session_id: String(session.id) })}>{formatTime(session.start_time)} · {session.available_places ?? session.capacity} мест</button>)}
              </div>
            </div>
            <div className="booking-step">
              <strong><Users size={18} /> Шаг 3 — участники</strong>
              <FormField label="Количество участников" required>
                <input type="number" min="1" max={selectedSession?.available_places || item.max_participants} value={form.participants_count} onChange={(event) => setForm({ ...form, participants_count: event.target.value })} required />
              </FormField>
            </div>
            <div className="booking-step">
              <strong>Шаг 4 — контакты</strong>
              <div className="form-grid">
                <FormField label="Имя" required><input value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} required /></FormField>
                <FormField label="Телефон"><input value={form.customer_phone} placeholder="+7..." onChange={(event) => setForm({ ...form, customer_phone: event.target.value })} /></FormField>
                <FormField label="Email"><input type="email" value={form.customer_email} placeholder="name@example.ru" onChange={(event) => setForm({ ...form, customer_email: event.target.value })} /></FormField>
                <FormField label="Комментарий"><textarea value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} /></FormField>
              </div>
            </div>
            <div className="booking-step booking-step--submit">
              <strong><CheckCircle2 size={18} /> Шаг 5 — подтверждение</strong>
              <p>Свободных мест по выбранной дате: {selectedSession?.available_places ?? availablePlacesTotal(sessions, item.max_participants)}</p>
              <Button type="submit" tone="primary" disabled={!form.session_id || !form.customer_name || submitting}>{submitting ? "Отправляем..." : "Отправить заявку"}</Button>
            </div>
          </form>
        )}
      </section>
    </article>
  );
}
