import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
import { adminApi } from "../../api/client";
import { AdminRouteBuilderMap } from "../../components/map/AdminRouteBuilderMap";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { MultiImageUploadField } from "../../components/ui/MultiImageUploadField";
import { PageHeader } from "../../components/ui/PageHeader";
import { ErrorState, LoadingState } from "../../components/ui/State";
import { useToast } from "../../context/ToastContext";
import { useAdminData } from "../../hooks/useAdminData";
import { cleanPayload, km, mediaGallery, minutes } from "../../utils/format";

const empty = { title: "Новый маршрут", description: "", media_urls: [], cover_image_url: "" };

export function RouteEditorPage({ mode = "create" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const { state, loading: listsLoading, refresh } = useAdminData();
  const [form, setForm] = React.useState(empty);
  const [selected, setSelected] = React.useState([]);
  const [geometry, setGeometry] = React.useState(null);
  const [estimated, setEstimated] = React.useState({ estimated_length_km: null, estimated_duration_min: null });
  const [loading, setLoading] = React.useState(mode === "edit");
  const [saving, setSaving] = React.useState(false);
  const [building, setBuilding] = React.useState(false);
  const [error, setError] = React.useState("");
  const [geometryDirty, setGeometryDirty] = React.useState(false);
  const [manualGeometry, setManualGeometry] = React.useState(false);

  React.useEffect(() => {
    if (mode !== "edit" || !id) {
      setLoading(false);
      return;
    }
    async function load() {
      setLoading(true);
      setError("");
      try {
        const route = await adminApi.getRoute(id);
        const gallery = mediaGallery(route);
        setForm({
          title: route.title,
          description: route.description || "",
          media_urls: gallery,
          cover_image_url: route.route_metadata?.cover_image_url || gallery[0] || ""
        });
        setSelected([...(route.points || [])].sort((a, b) => a.position - b.position).map((link) => link.point_id));
        setGeometry(route.geometry_geojson || null);
        setEstimated({ estimated_length_km: route.estimated_length_km, estimated_duration_min: route.estimated_duration_min });
        setGeometryDirty(false);
        setManualGeometry(false);
      } catch (err) {
        setError(err.message || "Не удалось загрузить маршрут.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, mode]);

  function changeSelected(nextSelected) {
    setSelected(nextSelected);
    setGeometry(null);
    setEstimated({ estimated_length_km: null, estimated_duration_min: null });
    setGeometryDirty(true);
    setManualGeometry(false);
  }

  function togglePoint(pointId) {
    changeSelected(selected.includes(pointId) ? selected.filter((item) => item !== pointId) : [...selected, pointId]);
  }

  function movePoint(index, direction) {
    const next = [...selected];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    changeSelected(next);
  }

  function reorderPoint(source, target) {
    if (source === target) return;
    const next = [...selected];
    const [item] = next.splice(source, 1);
    next.splice(target, 0, item);
    changeSelected(next);
  }

  function updateGeometry(nextGeometry) {
    setGeometry(nextGeometry);
    setManualGeometry(true);
    setGeometryDirty(false);
  }

  async function upload(file) {
    return adminApi.upload(file);
  }

  async function save(event) {
    event.preventDefault();
    if (selected.length < 2) {
      notify.error("Для маршрута нужны минимум две точки.");
      return;
    }
    setSaving(true);
    try {
      let nextGeometry = geometry;
      let nextEstimated = estimated;
      if (!manualGeometry) {
        setBuilding(true);
        notify.info("Строим маршрут по пешеходным дорогам.");
        const preview = await adminApi.previewRoute({ title: form.title, point_ids: selected });
        nextGeometry = preview.geometry_geojson || null;
        nextEstimated = { estimated_length_km: preview.estimated_length_km, estimated_duration_min: preview.estimated_duration_min };
        setGeometry(nextGeometry);
        setEstimated(nextEstimated);
        setGeometryDirty(false);
      }
      const media = form.media_urls.filter(Boolean);
      const payload = cleanPayload({
        title: form.title,
        description: form.description,
        formation_type: "road_plan",
        optimization_algorithm: null,
        geometry_geojson: nextGeometry,
        estimated_duration_min: nextEstimated.estimated_duration_min,
        estimated_length_km: nextEstimated.estimated_length_km,
        route_metadata: { cover_image_url: form.cover_image_url || media[0] || null, media_urls: media, geometry_format: "geojson" },
        points: selected.map((point_id, index) => ({ point_id, position: index + 1 }))
      });
      const saved = mode === "edit" ? await adminApi.updateRoute(id, payload) : await adminApi.createRoute(payload);
      notify.success(mode === "edit" ? "Маршрут обновлён." : "Маршрут создан.");
      refresh();
      navigate(`/admin/routes/${saved.id}/edit`, { replace: true });
    } catch (err) {
      notify.error(err.message || "Не удалось сохранить маршрут.");
    } finally {
      setBuilding(false);
      setSaving(false);
    }
  }

  if (loading || listsLoading) return <LoadingState text="Загрузка конструктора маршрута" />;
  if (error) return <ErrorState text={error} />;

  return (
    <div>
      <PageHeader
        eyebrow="Маршруты"
        title={mode === "edit" ? "Редактирование маршрута" : "Создание маршрута"}
        description="Выберите точки и сохраните маршрут: линия по пешеходным дорогам построится при сохранении. Существующую линию можно уточнять вершинами на карте."
        actions={<Button as="link" to="/admin/routes" tone="neutral"><ArrowLeft size={17} /> К списку</Button>}
      />
      <AdminRouteBuilderMap
        points={state.points}
        selectedIds={selected}
        onTogglePoint={togglePoint}
        onMovePoint={movePoint}
        onReorderPoint={reorderPoint}
        routeGeometry={geometry}
        onGeometryChange={updateGeometry}
        loading={building}
      />
      <section className="route-editor panel">
        <form className="stack" onSubmit={save}>
          <div className="form-grid">
            <FormField label="Название маршрута" required><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></FormField>
            <FormField label="Обложка маршрута"><input value={form.cover_image_url || ""} onChange={(event) => setForm({ ...form, cover_image_url: event.target.value })} placeholder="URL главной фотографии" /></FormField>
          </div>
          <FormField label="Описание"><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Кратко опишите логику маршрута и ключевые темы экскурсии" /></FormField>
          <MultiImageUploadField label="Фотографии маршрута" values={form.media_urls} onChange={(media_urls) => setForm({ ...form, media_urls, cover_image_url: form.cover_image_url || media_urls[0] || "" })} onUpload={upload} />
          <div className="actions-row">
            <Button type="submit" tone="primary" disabled={saving || building}><Save size={17} /> {saving ? "Сохраняем..." : "Сохранить маршрут"}</Button>
            <span className="inline-hint">{geometryDirty ? "Линия будет построена при сохранении" : geometry ? `Путь: ${km(estimated.estimated_length_km)} · ${minutes(estimated.estimated_duration_min)}` : "Выберите минимум две точки"}</span>
            {building && <span className="inline-loader"><Sparkles className="spin" size={17} /> Строим линию по дорогам</span>}
          </div>
        </form>
      </section>
      {(saving || building) && <div className="loading-overlay"><span className="loader-orbit" /> {building ? "Строим план экскурсии" : "Сохраняем маршрут"}</div>}
    </div>
  );
}
