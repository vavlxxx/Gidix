import React from "react";
import { Save, Sparkles } from "lucide-react";
import { adminApi } from "../../api/client";
import { AdminRouteBuilderMap } from "../../components/map/AdminRouteBuilderMap";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/State";
import { UploadField } from "../../components/ui/UploadField";
import { useAdminData } from "../../hooks/useAdminData";
import { useToast } from "../../context/ToastContext";
import { cleanPayload, km, minutes } from "../../utils/format";

const empty = { title: "Новый маршрут", description: "", cover_image_url: "", buildByRoads: false };

export function RoutesPage() {
  const notify = useToast();
  const { state, loading, refresh } = useAdminData();
  const [form, setForm] = React.useState(empty);
  const [selected, setSelected] = React.useState([]);
  const [editingId, setEditingId] = React.useState(null);
  const [activeRoute, setActiveRoute] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  function edit(route) {
    setEditingId(route.id);
    setActiveRoute(route);
    setForm({
      title: route.title,
      description: route.description || "",
      cover_image_url: route.route_metadata?.cover_image_url || "",
      buildByRoads: Boolean(route.geometry_geojson)
    });
    setSelected([...(route.points || [])].sort((a, b) => a.position - b.position).map((link) => link.point_id));
  }

  function reset() {
    setEditingId(null);
    setActiveRoute(null);
    setForm(empty);
    setSelected([]);
  }

  function togglePoint(id) {
    setSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  function movePoint(index, direction) {
    setSelected((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function upload(file) {
    const asset = await adminApi.upload(file);
    setForm((prev) => ({ ...prev, cover_image_url: asset.url }));
  }

  async function save(event) {
    event.preventDefault();
    if (selected.length < 2) {
      notify.error("Для маршрута нужны минимум две точки.");
      return;
    }
    setSaving(true);
    try {
      let saved;
      const common = { title: form.title, description: form.description, route_metadata: { cover_image_url: form.cover_image_url } };
      if (form.buildByRoads) {
        notify.info("Строим план экскурсии. Это может занять несколько секунд.");
        const generated = await adminApi.generateRoute({ title: form.title, point_ids: selected });
        const generatedPoints = generated.points?.map(({ point_id, position, visit_duration_min, note }) => ({ point_id, position, visit_duration_min, note })) || selected.map((point_id, index) => ({ point_id, position: index + 1 }));
        const payload = cleanPayload({ ...common, formation_type: "road_plan", optimization_algorithm: null, geometry_geojson: generated.geometry_geojson, estimated_duration_min: generated.estimated_duration_min, estimated_length_km: generated.estimated_length_km, points: generatedPoints });
        saved = editingId ? await adminApi.updateRoute(editingId, payload) : await adminApi.updateRoute(generated.id, payload);
        if (editingId && generated.id !== editingId) {
          await adminApi.deleteRoute(generated.id).catch(() => null);
        }
        notify.success("План экскурсии построен и сохранён.");
      } else {
        const payload = cleanPayload({ ...common, formation_type: "planned", optimization_algorithm: null, points: selected.map((point_id, index) => ({ point_id, position: index + 1 })) });
        saved = editingId ? await adminApi.updateRoute(editingId, payload) : await adminApi.createRoute(payload);
        notify.success("Маршрут сохранён.");
      }
      setActiveRoute(saved);
      reset();
      refresh();
    } catch (err) {
      notify.error(err.message || "Не удалось построить или сохранить маршрут.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Маршруты" title="Конструктор экскурсионных программ" description="Выбирайте точки на карте, меняйте порядок посещения и сохраняйте единый маршрут для экскурсии." />
      {loading && <LoadingState text="Загрузка маршрутов" />}
      <AdminRouteBuilderMap points={state.points} selectedIds={selected} onTogglePoint={togglePoint} onMovePoint={movePoint} routeGeometry={activeRoute?.geometry_geojson} loading={saving && form.buildByRoads} />
      <section className="route-editor panel">
        <form className="stack" onSubmit={save}>
          <div className="form-grid">
            <FormField label="Название маршрута" required><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></FormField>
            <FormField label="Построение по улицам">
              <label className="switch-line">
                <input type="checkbox" checked={form.buildByRoads} onChange={(event) => setForm({ ...form, buildByRoads: event.target.checked })} />
                <span>Построить план экскурсии по городской дорожной сети</span>
              </label>
            </FormField>
          </div>
          <FormField label="Описание"><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Кратко опишите логику маршрута и ключевые темы экскурсии" /></FormField>
          <UploadField label="Обложка маршрута" value={form.cover_image_url} onChange={(value) => setForm({ ...form, cover_image_url: value })} onUpload={upload} />
          <div className="route-preview">
            <span>Точек: {selected.length}</span>
            <span>Длина: {activeRoute?.estimated_length_km ? km(activeRoute.estimated_length_km) : "рассчитается после сохранения"}</span>
            <span>Время в пути: {activeRoute?.estimated_duration_min ? minutes(activeRoute.estimated_duration_min) : "рассчитается после сохранения"}</span>
            <span>{form.buildByRoads ? "Маршрут будет построен по улицам" : "Маршрут сохранит выбранный порядок посещения"}</span>
          </div>
          <div className="actions-row">
            <Button type="submit" tone="primary" disabled={saving}><Save size={17} /> {saving ? "Сохраняем..." : "Сохранить маршрут"}</Button>
            <Button type="button" tone="neutral" onClick={reset}>Новый маршрут</Button>
          </div>
        </form>
      </section>
      <section className="cards-grid">
        {state.routes.map((route) => (
          <button type="button" className="route-admin-card" key={route.id} onClick={() => edit(route)}>
            <strong>{route.title}</strong>
            <span>{route.points?.length || 0} точек · {route.estimated_length_km ? km(route.estimated_length_km) : "длина не рассчитана"}</span>
          </button>
        ))}
      </section>
      {saving && form.buildByRoads && <div className="loading-overlay"><Sparkles className="spin" size={22} /> Строим план экскурсии</div>}
    </div>
  );
}
