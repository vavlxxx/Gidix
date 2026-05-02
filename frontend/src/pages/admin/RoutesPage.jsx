import React from "react";
import { Save } from "lucide-react";
import { adminApi } from "../../api/client";
import { AdminRouteBuilderMap } from "../../components/map/AdminRouteBuilderMap";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/State";
import { UploadField } from "../../components/ui/UploadField";
import { useAdminData } from "../../hooks/useAdminData";
import { useToast } from "../../context/ToastContext";
import { cleanPayload } from "../../utils/format";

const empty = { title: "Новый маршрут", description: "", cover_image_url: "", routingMode: "manual", algorithm: "nearest_neighbor_2opt" };

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
      routingMode: route.formation_type === "osrm" || route.route_metadata?.routing_source === "osrm" ? "osrm" : "manual",
      algorithm: route.optimization_algorithm || "nearest_neighbor_2opt"
    });
    setSelected([...route.points].sort((a, b) => a.position - b.position).map((link) => link.point_id));
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
      if (form.routingMode === "osrm") {
        const generated = await adminApi.generateRoute({ title: form.title, point_ids: selected, algorithm: form.algorithm });
        saved = editingId
          ? await adminApi.updateRoute(editingId, { ...common, formation_type: "osrm", optimization_algorithm: form.algorithm, geometry_geojson: generated.geometry_geojson, estimated_duration_min: generated.estimated_duration_min, estimated_length_km: generated.estimated_length_km, points: generated.points.map(({ point_id, position, visit_duration_min, note }) => ({ point_id, position, visit_duration_min, note })) })
          : generated;
      } else {
        const payload = cleanPayload({ ...common, formation_type: "manual", optimization_algorithm: null, points: selected.map((point_id, index) => ({ point_id, position: index + 1 })) });
        saved = editingId ? await adminApi.updateRoute(editingId, payload) : await adminApi.createRoute(payload);
      }
      notify.success("Маршрут сохранён.");
      setActiveRoute(saved);
      reset();
      refresh();
    } catch (err) {
      notify.error(err.message || "Не удалось рассчитать или сохранить маршрут.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Маршруты" title="Конструктор маршрутных программ" description="Выбирайте точки на карте, меняйте порядок и сохраняйте ручную линию или OSRM-расчёт." />
      {loading && <LoadingState text="Загрузка маршрутов" />}
      <AdminRouteBuilderMap points={state.points} selectedIds={selected} onTogglePoint={togglePoint} onMovePoint={movePoint} routeGeometry={activeRoute?.geometry_geojson} />
      <section className="route-editor panel">
        <form className="stack" onSubmit={save}>
          <div className="form-grid">
            <FormField label="Название маршрута" required><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></FormField>
            <FormField label="Режим построения">
              <select value={form.routingMode} onChange={(event) => setForm({ ...form, routingMode: event.target.value })}>
                <option value="manual">Ручной порядок</option>
                <option value="osrm">Рассчитать через OSRM</option>
              </select>
            </FormField>
            <FormField label="Алгоритм OSRM">
              <select value={form.algorithm} disabled={form.routingMode !== "osrm"} onChange={(event) => setForm({ ...form, algorithm: event.target.value })}>
                <option value="nearest_neighbor_2opt">Ближайший сосед + 2-opt</option>
                <option value="nearest_neighbor">Ближайший сосед</option>
                <option value="held_karp">Held-Karp</option>
                <option value="bruteforce">Полный перебор</option>
              </select>
            </FormField>
          </div>
          <FormField label="Описание"><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FormField>
          <UploadField label="Обложка маршрута" value={form.cover_image_url} onChange={(value) => setForm({ ...form, cover_image_url: value })} onUpload={upload} />
          <div className="route-preview">
            <span>Точек: {selected.length}</span>
            <span>Длина: {activeRoute?.estimated_length_km || "будет рассчитана"} км</span>
            <span>Длительность: {activeRoute?.estimated_duration_min || "будет рассчитана"} мин</span>
            <span>Геометрия: {form.routingMode === "osrm" ? "OSRM" : "ручная"}</span>
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
            <span>{route.points?.length || 0} точек · {route.estimated_length_km || "—"} км</span>
          </button>
        ))}
      </section>
    </div>
  );
}
