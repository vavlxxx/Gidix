import React from "react";
import { CalendarCheck, CheckCircle2, CreditCard, Search, UserCheck, XCircle } from "lucide-react";
import { bookingsApi } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { Drawer } from "../../components/ui/Drawer";
import { FormField } from "../../components/ui/FormField";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusPill } from "../../components/ui/StatusPill";
import { EmptyState, LoadingState } from "../../components/ui/State";
import { useAdminData } from "../../hooks/useAdminData";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatTime } from "../../utils/format";

export function BookingsPage() {
  const notify = useToast();
  const { state, loading, refresh } = useAdminData();
  const [selected, setSelected] = React.useState(null);
  const [filters, setFilters] = React.useState({ q: "", status: "all", payment: "all", date: "", excursion: "all" });

  const rows = state.bookings.filter((booking) => {
    const text = [booking.customer_name, booking.customer_phone, booking.customer_email, booking.excursion_title].filter(Boolean).join(" ").toLowerCase();
    return text.includes(filters.q.toLowerCase())
      && (filters.status === "all" || booking.status === filters.status)
      && (filters.payment === "all" || booking.payment_status === filters.payment)
      && (!filters.date || booking.session_date === filters.date)
      && (filters.excursion === "all" || String(booking.excursion_id) === filters.excursion);
  });

  async function update(booking, patch, message = "Заявка обновлена.") {
    try {
      await bookingsApi.updateStatus(booking.id, patch);
      notify.success(message);
      const data = await refresh();
      const fresh = data?.bookings?.find((item) => item.id === booking.id);
      setSelected(fresh || null);
    } catch (err) {
      notify.error(err.message);
    }
  }

  async function remove(booking) {
    if (!confirm("Удалить заявку?")) return;
    try {
      await bookingsApi.delete(booking.id);
      notify.success("Заявка удалена.");
      setSelected(null);
      refresh();
    } catch (err) {
      notify.error(err.message);
    }
  }

  const columns = [
    { key: "customer", title: "Клиент", render: (row) => <button className="table-link" type="button" onClick={() => setSelected(row)}>{row.customer_name}</button> },
    { key: "excursion", title: "Экскурсия", render: (row) => row.excursion_title || row.excursion_id || "—" },
    { key: "contacts", title: "Контакты", render: (row) => row.customer_phone || row.customer_email || "—" },
    { key: "date", title: "Дата", render: (row) => row.session_date ? `${formatDate(row.session_date)} ${formatTime(row.start_time)}` : "—" },
    { key: "status", title: "Статус", render: (row) => <><StatusPill status={row.status} /> <StatusPill status={row.payment_status} type="payment" /></> },
    { key: "next", title: "Что дальше", render: (row) => nextAction(row) }
  ];

  return (
    <div className="bookings-workspace">
      <PageHeader eyebrow="Заявки" title="Рабочий инструмент диспетчера и менеджера" description="Фильтруйте обращения, открывайте карточку заявки и фиксируйте следующий шаг согласования." />
      <section className="filters-panel">
        <label className="search-field"><Search size={17} /><input placeholder="Клиент, телефон или email" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} /></label>
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} aria-label="Статус заявки">
          <option value="all">Все заявки</option>
          <option value="pending">Новые</option>
          <option value="checking">Проверяется</option>
          <option value="confirmed">Подтверждена</option>
          <option value="completed">Проведена</option>
          <option value="cancelled">Отменена</option>
        </select>
        <select value={filters.payment} onChange={(event) => setFilters({ ...filters, payment: event.target.value })} aria-label="Статус оплаты">
          <option value="all">Любая оплата</option>
          <option value="pending">Ожидает оплаты</option>
          <option value="paid">Оплачено</option>
          <option value="failed">Ошибка оплаты</option>
        </select>
        <input type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} aria-label="Дата сеанса" />
        <select value={filters.excursion} onChange={(event) => setFilters({ ...filters, excursion: event.target.value })} aria-label="Экскурсия">
          <option value="all">Все экскурсии</option>
          {state.excursions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </section>
      {loading && <LoadingState text="Загрузка заявок" />}
      {!loading && !rows.length && <EmptyState title="Заявки не найдены" text="Измените фильтры или дождитесь новых обращений клиентов." />}
      {!!rows.length && <DataTable columns={columns} rows={rows} />}
      <Drawer title={selected ? `Заявка №${selected.id}` : "Заявка"} onClose={() => setSelected(null)}>
        {selected && (
          <div className="booking-drawer">
            <StatusPill status={selected.status} />
            <StatusPill status={selected.payment_status} type="payment" />
            <dl>
              <div><dt>Клиент</dt><dd>{selected.customer_name}</dd></div>
              <div><dt>Контакты</dt><dd>{selected.customer_phone || selected.customer_email || "не указаны"}</dd></div>
              <div><dt>Экскурсия</dt><dd>{selected.excursion_title || selected.excursion_id}</dd></div>
              <div><dt>Участники</dt><dd>{selected.participants_count}</dd></div>
              <div><dt>Комментарий</dt><dd>{selected.comment || "—"}</dd></div>
            </dl>
            <section className="next-box">
              <h3>Что дальше?</h3>
              <p>{nextAction(selected)}</p>
            </section>
            <div className="drawer-actions">
              <Button type="button" tone="primary" onClick={() => update(selected, { status: "confirmed" }, "Заявка подтверждена.")}><CheckCircle2 size={17} /> Подтвердить</Button>
              <Button type="button" tone="neutral" onClick={() => update(selected, { status: "checking" })}><UserCheck size={17} /> Проверяется</Button>
              <Button type="button" tone="neutral" onClick={() => update(selected, { payment_status: "paid" }, "Оплата подтверждена.")}><CreditCard size={17} /> Оплачено</Button>
              <Button type="button" tone="neutral" onClick={() => update(selected, { status: "completed" }, "Экскурсия отмечена проведённой.")}><CalendarCheck size={17} /> Проведена</Button>
              <Button type="button" tone="danger" onClick={() => update(selected, { status: "cancelled" })}><XCircle size={17} /> Отменить</Button>
              <Button type="button" tone="danger" onClick={() => remove(selected)}>Удалить</Button>
            </div>
            <FormField label="Изменить оплату">
              <select value={selected.payment_status} onChange={(event) => update(selected, { payment_status: event.target.value })}>
                <option value="pending">Ожидает оплаты</option>
                <option value="paid">Оплачено</option>
                <option value="failed">Ошибка оплаты</option>
              </select>
            </FormField>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function nextAction(booking) {
  if (booking.status === "cancelled") return "Заявка отменена. Действий не требуется.";
  if (booking.status === "completed") return "Экскурсия проведена. Можно запросить отзыв.";
  if (booking.payment_status === "pending" && booking.status === "confirmed") return "Ожидается оплата или подтверждение бухгалтера.";
  if (booking.status === "pending") return "Проверить контакты клиента и подтвердить заявку.";
  if (booking.status === "checking") return "Связаться с клиентом и уточнить детали.";
  return "Назначить экскурсовода и подготовить маршрутное задание.";
}
