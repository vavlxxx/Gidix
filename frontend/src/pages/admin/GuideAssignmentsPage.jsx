import React from "react";
import { CalendarCheck, MapPinned, Users } from "lucide-react";
import { adminApi } from "../../api/client";
import { RouteMap } from "../../components/map/RouteMap";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusPill } from "../../components/ui/StatusPill";
import { EmptyState, LoadingState } from "../../components/ui/State";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatTime, sortedRoutePoints } from "../../utils/format";

export function GuideAssignmentsPage() {
  const notify = useToast();
  const [sessions, setSessions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  async function load() {
    setLoading(true);
    try {
      setSessions(await adminApi.mySessions());
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function complete(session) {
    try {
      await adminApi.updateSession(session.id, { status: "completed" });
      notify.success("Экскурсия отмечена проведённой.");
      load();
    } catch (err) {
      notify.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Экскурсовод" title="Маршрутные задания" description="Назначенные сеансы, порядок посещения точек и список участников для проведения экскурсии." />
      {loading && <LoadingState text="Загрузка маршрутных заданий" />}
      {!loading && !sessions.length && <EmptyState title="Назначенных сеансов нет" text="Когда менеджер назначит экскурсовода на сеанс, задание появится здесь." />}
      <section className="guide-session-list">
        {sessions.map((session) => {
          const route = session.excursion?.route;
          const bookings = session.bookings || [];
          const participants = bookings
            .filter((booking) => !["cancelled", "rejected"].includes(booking.status))
            .reduce((sum, booking) => sum + Number(booking.participants_count || 0), 0);
          return (
            <article className="guide-session-card" key={session.id}>
              <div className="guide-session-card__summary">
                <div>
                  <span className="eyebrow">{formatDate(session.session_date)} · {formatTime(session.start_time)}</span>
                  <h2>{session.excursion?.title || `Сеанс №${session.id}`}</h2>
                  <p>{route?.title || "Маршрут не выбран"}</p>
                </div>
                <div className="guide-session-card__facts">
                  <span><Users size={17} /> {participants} участников</span>
                  <StatusPill status={session.status} />
                </div>
              </div>
              {route?.geometry_geojson ? (
                <div className="guide-mini-map"><RouteMap route={route} excursion={session.excursion} className="guide-map" /></div>
              ) : (
                <div className="panel-hint"><MapPinned size={17} /> Геометрия маршрута не построена, используйте список точек.</div>
              )}
              <section className="guide-task-grid">
                <div>
                  <h3>Порядок посещения</h3>
                  <ol className="mini-route-list">
                    {sortedRoutePoints(route).map((link, index) => <li key={link.id || link.point_id}><span>{index + 1}</span>{link.point?.name || `Точка ${link.point_id}`}</li>)}
                  </ol>
                </div>
                <div>
                  <h3>Заявки и участники</h3>
                  <div className="compact-list">
                    {bookings.map((booking) => (
                      <div className="participant-row" key={booking.id}>
                        <strong>{booking.customer_name}</strong>
                        <span>{booking.participants_count} чел. · {booking.customer_phone || booking.customer_email || "контакт не указан"}</span>
                      </div>
                    ))}
                    {!bookings.length && <p className="muted-text">Подтверждённых участников пока нет.</p>}
                  </div>
                </div>
              </section>
              <div className="actions-row">
                <Button type="button" tone="primary" disabled={session.status === "completed"} onClick={() => complete(session)}><CalendarCheck size={17} /> Отметить экскурсию проведённой</Button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
