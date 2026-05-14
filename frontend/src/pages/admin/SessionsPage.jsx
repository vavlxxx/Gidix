import React from "react";
import { ChevronLeft, ChevronRight, Edit3, Save, Trash2 } from "lucide-react";
import { adminApi } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { FormField } from "../../components/ui/FormField";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/State";
import { useAdminData } from "../../hooks/useAdminData";
import { useToast } from "../../context/ToastContext";
import { cleanPayload, formatDate, formatTime } from "../../utils/format";

const empty = { excursion_id: "", guide_id: "", session_date: isoDate(new Date()), start_time: "12:00", capacity: 20, status: "scheduled" };

export function SessionsPage() {
  const notify = useToast();
  const { state, loading, refresh } = useAdminData();
  const [form, setForm] = React.useState(empty);
  const [editingId, setEditingId] = React.useState(null);
  const [month, setMonth] = React.useState(startOfMonth(new Date()));
  const selectedDaySessions = state.sessions.filter((session) => session.session_date === form.session_date);

  function edit(session) {
    setEditingId(session.id);
    setForm({ ...session, start_time: formatTime(session.start_time) });
    setMonth(startOfMonth(new Date(session.session_date)));
  }

  function hasDuplicate() {
    return state.sessions.some((session) =>
      session.id !== editingId &&
      String(session.excursion_id) === String(form.excursion_id) &&
      session.session_date === form.session_date &&
      formatTime(session.start_time) === form.start_time
    );
  }

  async function submit(event) {
    event.preventDefault();
    if (form.session_date < isoDate(new Date())) {
      notify.warning("Нельзя создать сеанс на прошедшую дату.");
      return;
    }
    if (hasDuplicate()) {
      notify.warning("На это время для выбранной экскурсии уже есть сеанс.");
      return;
    }
    try {
      const payload = cleanPayload({ ...form, excursion_id: Number(form.excursion_id), guide_id: form.guide_id ? Number(form.guide_id) : null, capacity: Number(form.capacity), start_time: form.start_time.length === 5 ? `${form.start_time}:00` : form.start_time });
      if (editingId) await adminApi.updateSession(editingId, payload);
      else await adminApi.createSession(payload);
      notify.success(editingId ? "Сеанс обновлён." : "Сеанс создан.");
      setForm((prev) => ({ ...empty, session_date: prev.session_date }));
      setEditingId(null);
      refresh();
    } catch (err) {
      notify.error(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("Удалить сеанс?")) return;
    try {
      await adminApi.deleteSession(id);
      notify.success("Сеанс удалён.");
      refresh();
    } catch (err) {
      notify.error(err.message);
    }
  }

  const columns = [
    { key: "excursion", title: "Экскурсия", render: (row) => state.excursions.find((item) => item.id === row.excursion_id)?.title || row.excursion_id },
    { key: "date", title: "Дата", render: (row) => formatDate(row.session_date) },
    { key: "time", title: "Время", render: (row) => formatTime(row.start_time) },
    { key: "guide", title: "Экскурсовод", render: (row) => row.guide_id || "не назначен" },
    { key: "capacity", title: "Мест" },
    { key: "status", title: "Статус" },
    { key: "actions", title: "Действия", render: (row) => <div className="actions-row"><Button type="button" onClick={() => edit(row)}><Edit3 size={15} /> Изменить</Button><Button type="button" tone="danger" onClick={() => remove(row.id)}><Trash2 size={15} /> Удалить</Button></div> }
  ];

  return (
    <div>
      <PageHeader eyebrow="Календарь" title="Сеансы и вместимость" description="Выберите дату в календаре и добавьте доступное время записи на экскурсию." />
      {loading && <LoadingState text="Загрузка календаря" />}
      <section className="calendar-workspace">
        <div className="schedule-calendar panel">
          <div className="calendar-head">
            <button type="button" aria-label="Предыдущий месяц" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft size={18} /></button>
            <h2>{formatDate(month, { month: "long", year: "numeric" })}</h2>
            <button type="button" aria-label="Следующий месяц" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={18} /></button>
          </div>
          <div className="calendar-grid calendar-grid--weekdays">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">
            {calendarDays(month).map((day) => {
              const date = isoDate(day);
              const sessions = state.sessions.filter((session) => session.session_date === date);
              const outside = day.getMonth() !== month.getMonth();
              const isPast = date < isoDate(new Date());
              return (
                <button type="button" key={date} disabled={isPast} className={`${date === form.session_date ? "is-active" : ""} ${outside ? "is-muted" : ""}`} onClick={() => setForm({ ...form, session_date: date })}>
                  <strong>{day.getDate()}</strong>
                  {!!sessions.length && <span>{sessions.length} сеанс.</span>}
                </button>
              );
            })}
          </div>
        </div>
        <form className="panel stack session-editor" onSubmit={submit}>
          <h2>{editingId ? "Редактирование сеанса" : "Новый сеанс"}</h2>
          <FormField label="Экскурсия" required><select value={form.excursion_id} onChange={(event) => setForm({ ...form, excursion_id: event.target.value })} required><option value="">Выберите экскурсию</option>{state.excursions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></FormField>
          <div className="form-grid"><FormField label="Дата" required><input type="date" min={isoDate(new Date())} value={form.session_date} onChange={(event) => setForm({ ...form, session_date: event.target.value })} required /></FormField><FormField label="Время" required><input type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} required /></FormField></div>
          <div className="form-grid"><FormField label="Количество мест"><input type="number" min="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></FormField><FormField label="ID экскурсовода"><input type="number" min="1" value={form.guide_id || ""} onChange={(event) => setForm({ ...form, guide_id: event.target.value })} placeholder="Например, 5" /></FormField></div>
          <FormField label="Статус"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="scheduled">Запланирован</option><option value="active">Активен</option><option value="completed">Проведён</option><option value="cancelled">Отменён</option></select></FormField>
          <Button type="submit" tone="primary"><Save size={17} /> Сохранить сеанс</Button>
          {!!selectedDaySessions.length && (
            <div className="day-session-list">
              <strong>Сеансы на выбранный день</strong>
              {selectedDaySessions.map((session) => <button type="button" key={session.id} onClick={() => edit(session)}>{formatTime(session.start_time)} · {state.excursions.find((item) => item.id === session.excursion_id)?.title || "Экскурсия"}</button>)}
            </div>
          )}
        </form>
      </section>
      <DataTable columns={columns} rows={state.sessions} emptyText="Сеансов пока нет" />
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
