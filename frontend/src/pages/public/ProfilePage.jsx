import React from "react";
import { Link, Navigate } from "react-router-dom";
import { CalendarCheck, Mail, Save, ShieldCheck, Star, UserRound } from "lucide-react";
import { bookingsApi, reviewsApi } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusPill } from "../../components/ui/StatusPill";
import { EmptyState, LoadingState } from "../../components/ui/State";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { cleanPayload, formatDate, formatTime, money, roleTitle, userHasRole } from "../../utils/format";

export function ProfilePage() {
  const auth = useAuth();
  const notify = useToast();
  const [form, setForm] = React.useState(null);
  const [bookings, setBookings] = React.useState([]);
  const [reviews, setReviews] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!auth.user) return;
    setForm({
      email: auth.user.email || "",
      username: auth.user.username || "",
      first_name: auth.user.first_name || "",
      last_name: auth.user.last_name || "",
      middle_name: auth.user.middle_name || "",
      phone: auth.user.phone || ""
    });
  }, [auth.user]);

  React.useEffect(() => {
    if (!auth.user) return;
    async function load() {
      setLoading(true);
      try {
        const [bookingList, reviewList] = await Promise.all([
          bookingsApi.mine().catch(() => []),
          reviewsApi.mine().catch(() => [])
        ]);
        setBookings(bookingList);
        setReviews(reviewList);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [auth.user]);

  if (auth.ready && !auth.user) return <Navigate to="/login" replace />;
  if (!auth.ready || !form) return <LoadingState text="Загрузка профиля" />;

  const isStaff = userHasRole(auth.user, ["admin", "superuser", "manager", "dispatcher", "guide", "accountant", "it_specialist"]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await auth.updateProfile(cleanPayload(form));
      notify.success("Профиль обновлён.");
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-page">
      <PageHeader
        eyebrow="Профиль"
        title={auth.user.full_name || auth.user.email}
        description="Личные данные, заявки и отзывы собраны в одном кабинете."
      />

      <section className="profile-layout">
        <aside className="profile-card panel">
          <div className="profile-avatar"><UserRound size={34} /></div>
          <h2>{auth.user.full_name || "Пользователь GIDIX"}</h2>
          <p><Mail size={16} /> {auth.user.email}</p>
          <div className="profile-roles">
            {auth.user.roles?.map((role) => <span key={role}>{roleTitle(role)}</span>)}
          </div>
          {isStaff && (
            <div className="staff-shortcuts">
              <strong><ShieldCheck size={17} /> Рабочий доступ</strong>
              <Link to="/admin">Панель управления</Link>
              <Link to="/admin/bookings">Заявки</Link>
            </div>
          )}
        </aside>

        <form className="panel stack" onSubmit={submit}>
          <h2>Данные аккаунта</h2>
          <div className="form-grid">
            <FormField label="Email"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></FormField>
            <FormField label="Телефон"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></FormField>
            <FormField label="Фамилия"><input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></FormField>
            <FormField label="Имя"><input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></FormField>
            <FormField label="Отчество"><input value={form.middle_name} onChange={(event) => setForm({ ...form, middle_name: event.target.value })} /></FormField>
            <FormField label="Логин"><input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></FormField>
          </div>
          <div className="actions-row">
            <Button type="submit" tone="primary" disabled={saving}><Save size={17} /> {saving ? "Сохраняем..." : "Сохранить"}</Button>
          </div>
        </form>
      </section>

      {loading ? <LoadingState text="Загрузка истории" /> : (
        <section className="profile-history">
          <div className="profile-history__block">
            <h2><CalendarCheck size={20} /> Мои заявки</h2>
            {!bookings.length && <EmptyState title="Заявок пока нет" text="Когда вы запишетесь на экскурсию из аккаунта, запись появится здесь." />}
            <div className="profile-list">
              {bookings.map((booking) => (
                <article key={booking.id} className="profile-list-card">
                  <div>
                    <strong>{booking.excursion_title || `Экскурсия #${booking.excursion_id}`}</strong>
                    <span>{booking.session_date ? `${formatDate(booking.session_date)} ${formatTime(booking.start_time)}` : "Дата уточняется"}</span>
                  </div>
                  <span>{booking.participants_count} чел · {money(booking.total_price)}</span>
                  <div><StatusPill status={booking.status} /> <StatusPill status={booking.payment_status} type="payment" /></div>
                </article>
              ))}
            </div>
          </div>

          <div className="profile-history__block">
            <h2><Star size={20} /> Мои отзывы</h2>
            {!reviews.length && <EmptyState title="Отзывов пока нет" text="После проведённой экскурсии вы сможете оставить оценку на странице экскурсии." />}
            <div className="profile-list">
              {reviews.map((review) => (
                <article key={review.id} className="profile-list-card">
                  <div>
                    <strong>{review.excursion_title || `Экскурсия #${review.excursion_id}`}</strong>
                    <span>{Array.from({ length: 5 }, (_, index) => index < review.rating ? "★" : "☆").join("")}</span>
                  </div>
                  <p>{review.text || "Без комментария"}</p>
                  <StatusPill status={review.published ? "active" : "checking"} />
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
