import { Link } from "react-router-dom";
import { AlertTriangle, CalendarDays, CreditCard, MapPinned, Route, Ticket } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/State";
import { useAdminData } from "../../hooks/useAdminData";
import { formatDate, formatTime } from "../../utils/format";

export function AdminDashboardPage() {
  const { state, loading } = useAdminData();
  const newBookings = state.bookings.filter((booking) => booking.status === "pending");
  const awaitingPayment = state.bookings.filter((booking) => booking.payment_status === "pending");
  const routesWithoutPoints = state.routes.filter((route) => !route.points?.length);
  const excursionsWithoutDates = state.excursions.filter((item) => !item.sessions?.length);
  const upcoming = [...state.sessions].sort((a, b) => `${a.session_date} ${a.start_time}`.localeCompare(`${b.session_date} ${b.start_time}`)).slice(0, 5);

  return (
    <div>
      <PageHeader eyebrow="Рабочий стол" title="Операционный обзор GIDIX" description="Сводка показывает, какие заявки, маршруты и сеансы требуют действий сотрудников." />
      {loading && <LoadingState text="Загрузка рабочего стола" />}
      <section className="dashboard-grid">
        <Metric icon={<CreditCard />} value={newBookings.length} label="новые заявки" to="/admin/bookings" />
        <Metric icon={<CalendarDays />} value={upcoming.length} label="ближайшие сеансы" to="/admin/sessions" />
        <Metric icon={<Ticket />} value={state.excursions.length} label="экскурсии" to="/" />
        <Metric icon={<Route />} value={state.routes.length} label="маршруты" to="/admin/routes" />
      </section>
      <section className="admin-columns">
        <article className="panel">
          <h2>Что требует внимания</h2>
          <ul className="issue-list">
            <li><AlertTriangle size={16} /> {awaitingPayment.length} заявок ожидают оплаты</li>
            <li><AlertTriangle size={16} /> {routesWithoutPoints.length} маршрутов без точек</li>
            <li><AlertTriangle size={16} /> {excursionsWithoutDates.length} экскурсий без дат</li>
          </ul>
        </article>
        <article className="panel">
          <h2>Ближайшие сеансы</h2>
          <div className="compact-list">
            {upcoming.map((session) => (
              <Link key={session.id} to="/admin/sessions">
                <strong>{formatDate(session.session_date)} · {formatTime(session.start_time)}</strong>
                <span>{session.capacity} мест</span>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function Metric({ icon, value, label, to }) {
  return <Link className="metric-card" to={to}>{icon}<strong>{value}</strong><span>{label}</span></Link>;
}
