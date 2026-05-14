import React from "react";
import { AlertTriangle, CheckCircle2, FileText, Search } from "lucide-react";
import { bookingsApi } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusPill } from "../../components/ui/StatusPill";
import { EmptyState, LoadingState } from "../../components/ui/State";
import { useAdminData } from "../../hooks/useAdminData";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatTime, money } from "../../utils/format";

export function PaymentsPage() {
  const notify = useToast();
  const { state, loading, refresh } = useAdminData();
  const [filters, setFilters] = React.useState({ q: "", payment: "all" });
  const rows = state.bookings.filter((booking) => {
    const text = [booking.customer_name, booking.customer_phone, booking.customer_email, booking.excursion_title].filter(Boolean).join(" ").toLowerCase();
    return Number(booking.total_price || 0) >= 0
      && text.includes(filters.q.toLowerCase())
      && (filters.payment === "all" || booking.payment_status === filters.payment);
  });

  async function update(booking, payment_status, message) {
    try {
      await bookingsApi.updateStatus(booking.id, { payment_status });
      notify.success(message);
      refresh();
    } catch (err) {
      notify.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Оплата" title="Оплата заявок" description="Контроль выставления счетов и подтверждения оплаты по заявкам клиентов." />
      <section className="filters-panel">
        <label className="search-field"><Search size={17} /><input placeholder="Клиент, экскурсия или контакт" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} /></label>
        <select value={filters.payment} onChange={(event) => setFilters({ ...filters, payment: event.target.value })} aria-label="Статус оплаты">
          <option value="all">Все оплаты</option>
          <option value="pending">Ожидает оплаты</option>
          <option value="invoice_sent">Счёт выставлен</option>
          <option value="paid">Оплачено</option>
          <option value="failed">Ошибка оплаты</option>
        </select>
      </section>
      {loading && <LoadingState text="Загрузка оплат" />}
      {!loading && !rows.length && <EmptyState title="Заявки не найдены" text="Нет заявок с выбранным статусом оплаты." />}
      <section className="payment-grid">
        {rows.map((booking) => (
          <article className="payment-card" key={booking.id}>
            <div className="payment-card__head">
              <div>
                <strong>Заявка №{booking.id}</strong>
                <span>{booking.excursion_title || "Экскурсия"} · {booking.session_date ? `${formatDate(booking.session_date)} ${formatTime(booking.start_time)}` : "дата не выбрана"}</span>
              </div>
              <StatusPill status={booking.payment_status} type="payment" />
            </div>
            <dl className="details-list">
              <div><dt>Клиент</dt><dd>{booking.customer_name}</dd></div>
              <div><dt>Контакты</dt><dd>{booking.customer_phone || booking.customer_email || "не указаны"}</dd></div>
              <div><dt>Участники</dt><dd>{booking.participants_count}</dd></div>
              <div><dt>Сумма</dt><dd>{money(booking.total_price)}</dd></div>
            </dl>
            <div className="actions-row">
              <Button type="button" tone="neutral" onClick={() => update(booking, "invoice_sent", "Счёт выставлен.")}><FileText size={17} /> Выставить счёт</Button>
              <Button type="button" tone="primary" onClick={() => update(booking, "paid", "Оплата подтверждена.")}><CheckCircle2 size={17} /> Подтвердить оплату</Button>
              <Button type="button" tone="danger" onClick={() => update(booking, "failed", "Отмечена ошибка оплаты.")}><AlertTriangle size={17} /> Ошибка оплаты</Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
