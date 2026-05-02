import React from "react";
import { Edit3, Save, Trash2 } from "lucide-react";
import { adminApi } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { FormField } from "../../components/ui/FormField";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/State";
import { useAdminData } from "../../hooks/useAdminData";
import { useToast } from "../../context/ToastContext";
import { cleanPayload, formatDate, formatTime } from "../../utils/format";

const empty = { excursion_id: "", session_date: "", start_time: "12:00", capacity: 20, status: "scheduled" };

export function SessionsPage() {
  const notify = useToast();
  const { state, loading, refresh } = useAdminData();
  const [form, setForm] = React.useState(empty);
  const [editingId, setEditingId] = React.useState(null);

  function edit(session) {
    setEditingId(session.id);
    setForm({ ...session, start_time: formatTime(session.start_time) });
  }

  async function submit(event) {
    event.preventDefault();
    try {
      const payload = cleanPayload({ ...form, excursion_id: Number(form.excursion_id), capacity: Number(form.capacity), start_time: form.start_time.length === 5 ? `${form.start_time}:00` : form.start_time });
      if (editingId) await adminApi.updateSession(editingId, payload);
      else await adminApi.createSession(payload);
      notify.success(editingId ? "Сеанс обновлён." : "Сеанс создан.");
      setForm(empty);
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
    { key: "capacity", title: "Мест" },
    { key: "status", title: "Статус" },
    { key: "actions", title: "Действия", render: (row) => <div className="actions-row"><Button type="button" onClick={() => edit(row)}><Edit3 size={15} /> Изменить</Button><Button type="button" tone="danger" onClick={() => remove(row.id)}><Trash2 size={15} /> Удалить</Button></div> }
  ];

  return (
    <div>
      <PageHeader eyebrow="Календарь" title="Сеансы и вместимость" description="Менеджер публикует доступные даты, а заявки занимают места в расписании." />
      {loading && <LoadingState text="Загрузка календаря" />}
      <section className="admin-columns">
        <form className="panel stack" onSubmit={submit}>
          <h2>{editingId ? "Редактирование сеанса" : "Новый сеанс"}</h2>
          <FormField label="Экскурсия" required><select value={form.excursion_id} onChange={(event) => setForm({ ...form, excursion_id: event.target.value })} required><option value="">Выберите экскурсию</option>{state.excursions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></FormField>
          <div className="form-grid"><FormField label="Дата" required><input type="date" value={form.session_date} onChange={(event) => setForm({ ...form, session_date: event.target.value })} required /></FormField><FormField label="Время" required><input type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} required /></FormField></div>
          <FormField label="Количество мест"><input type="number" min="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></FormField>
          <FormField label="Статус"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="scheduled">Запланирован</option><option value="active">Активен</option><option value="completed">Проведён</option><option value="cancelled">Отменён</option></select></FormField>
          <Button type="submit" tone="primary"><Save size={17} /> Сохранить сеанс</Button>
        </form>
        <DataTable columns={columns} rows={state.sessions} emptyText="Сеансов пока нет" />
      </section>
    </div>
  );
}
