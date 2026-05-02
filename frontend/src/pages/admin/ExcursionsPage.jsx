import React from "react";
import { Edit3, Save, Trash2 } from "lucide-react";
import { adminApi, mediaUrl } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { FormField } from "../../components/ui/FormField";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/State";
import { UploadField } from "../../components/ui/UploadField";
import { useAdminData } from "../../hooks/useAdminData";
import { useToast } from "../../context/ToastContext";
import { cleanPayload, coverForExcursion, money } from "../../utils/format";

const empty = { title: "Новая экскурсия", description: "", route_id: "", base_price: 1200, duration_min: 120, meeting_point: "", max_participants: 20, image_url: "" };

export function ExcursionsPage() {
  const notify = useToast();
  const { state, loading, refresh } = useAdminData();
  const [form, setForm] = React.useState(empty);
  const [editingId, setEditingId] = React.useState(null);

  function edit(item) {
    setEditingId(item.id);
    setForm({ ...empty, ...item, route_id: item.route_id || "", image_url: item.image_url || "" });
  }

  async function upload(file) {
    const asset = await adminApi.upload(file);
    setForm((prev) => ({ ...prev, image_url: asset.url }));
  }

  async function submit(event) {
    event.preventDefault();
    try {
      const payload = cleanPayload({ ...form, route_id: form.route_id ? Number(form.route_id) : null, base_price: String(form.base_price), duration_min: Number(form.duration_min), max_participants: Number(form.max_participants) });
      if (editingId) await adminApi.updateExcursion(editingId, payload);
      else await adminApi.createExcursion(payload);
      notify.success(editingId ? "Экскурсия обновлена." : "Экскурсия создана.");
      setForm(empty);
      setEditingId(null);
      refresh();
    } catch (err) {
      notify.error(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("Удалить экскурсию?")) return;
    try {
      await adminApi.deleteExcursion(id);
      notify.success("Экскурсия удалена.");
      refresh();
    } catch (err) {
      notify.error(err.message);
    }
  }

  const columns = [
    { key: "image", title: "Обложка", render: (row) => <img className="table-thumb" src={mediaUrl(coverForExcursion(row))} alt="" /> },
    { key: "title", title: "Название" },
    { key: "price", title: "Цена", render: (row) => money(row.base_price) },
    { key: "route", title: "Маршрут", render: (row) => row.route?.title || "не выбран" },
    { key: "actions", title: "Действия", render: (row) => <div className="actions-row"><Button type="button" onClick={() => edit(row)}><Edit3 size={15} /> Изменить</Button><Button type="button" tone="danger" onClick={() => remove(row.id)}><Trash2 size={15} /> Удалить</Button></div> }
  ];

  return (
    <div>
      <PageHeader eyebrow="Экскурсии" title="Программы для публикации" description="Экскурсия связывает маршрут, цену, вместимость, место встречи и расписание для клиента." />
      {loading && <LoadingState text="Загрузка экскурсий" />}
      <section className="admin-columns">
        <form className="panel stack" onSubmit={submit}>
          <h2>{editingId ? "Редактирование экскурсии" : "Создание экскурсии"}</h2>
          <FormField label="Название" required><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></FormField>
          <FormField label="Описание"><textarea value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FormField>
          <FormField label="Маршрут"><select value={form.route_id} onChange={(event) => setForm({ ...form, route_id: event.target.value })}><option value="">Без маршрута</option>{state.routes.map((route) => <option key={route.id} value={route.id}>{route.title}</option>)}</select></FormField>
          <div className="form-grid"><FormField label="Цена"><input type="number" min="0" value={form.base_price} onChange={(event) => setForm({ ...form, base_price: event.target.value })} /></FormField><FormField label="Длительность, мин"><input type="number" min="1" value={form.duration_min} onChange={(event) => setForm({ ...form, duration_min: event.target.value })} /></FormField></div>
          <FormField label="Место встречи"><input value={form.meeting_point || ""} onChange={(event) => setForm({ ...form, meeting_point: event.target.value })} /></FormField>
          <FormField label="Максимум участников"><input type="number" min="1" value={form.max_participants} onChange={(event) => setForm({ ...form, max_participants: event.target.value })} /></FormField>
          <UploadField label="Изображение экскурсии" value={form.image_url} onChange={(value) => setForm({ ...form, image_url: value })} onUpload={upload} />
          <Button type="submit" tone="primary"><Save size={17} /> Сохранить экскурсию</Button>
        </form>
        <DataTable columns={columns} rows={state.excursions} emptyText="Экскурсий пока нет" />
      </section>
    </div>
  );
}
