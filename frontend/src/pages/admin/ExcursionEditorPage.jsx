import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
import { adminApi, excursionsApi, mediaUrl } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { MediaGalleryManager } from "../../components/ui/MediaGalleryManager";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/State";
import { useToast } from "../../context/ToastContext";
import { useAdminData } from "../../hooks/useAdminData";
import { cleanPayload, coverForExcursion, mediaGallery, placeholderImage } from "../../utils/format";

const empty = {
  title: "Новая экскурсия",
  description: "",
  route_id: "",
  base_price: 1200,
  duration_min: 120,
  meeting_point: "",
  max_participants: 20,
  image_url: "",
  media_urls: [],
  active: true
};

export function ExcursionEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const { state, loading: listsLoading } = useAdminData();
  const [form, setForm] = React.useState(empty);
  const [loading, setLoading] = React.useState(Boolean(id));
  const [saving, setSaving] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    async function load() {
      setLoading(true);
      setError("");
      try {
        const item = await excursionsApi.get(id);
        setForm({
          ...empty,
          ...item,
          route_id: item.route_id || "",
          image_url: item.image_url || "",
          media_urls: mediaGallery(item),
          base_price: item.base_price || 0,
          duration_min: item.duration_min || item.route?.estimated_duration_min || empty.duration_min,
          max_participants: item.max_participants || empty.max_participants,
          active: item.active !== false
        });
      } catch (err) {
        setError(err.message || "Не удалось загрузить экскурсию.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const selectedRoute = state.routes.find((route) => String(route.id) === String(form.route_id));
  const previewImages = form.media_urls?.length ? form.media_urls : [form.image_url].filter(Boolean);
  const cover = form.image_url || previewImages[0] || coverForExcursion({ ...form, route: selectedRoute });

  async function upload(file) {
    return adminApi.upload(file);
  }

  async function generateDescription() {
    if (!id) {
      notify.warning("Сначала сохраните экскурсию, затем можно сгенерировать описание.");
      return;
    }
    setGenerating(true);
    try {
      notify.info("Генерируем описание экскурсии.");
      const result = await excursionsApi.generateDescription(id);
      setForm((prev) => ({ ...prev, description: result.text || prev.description }));
      notify.success("Описание экскурсии обновлено.");
    } catch (err) {
      notify.error(err.message || "Не удалось сгенерировать описание.");
    } finally {
      setGenerating(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const gallery = previewImages.length ? previewImages : [form.image_url].filter(Boolean);
      const payload = cleanPayload({
        title: form.title,
        description: form.description,
        route_id: form.route_id ? Number(form.route_id) : null,
        base_price: String(form.base_price || 0),
        duration_min: form.duration_min ? Number(form.duration_min) : null,
        meeting_point: form.meeting_point,
        max_participants: Number(form.max_participants || 1),
        image_url: form.image_url || gallery[0] || null,
        media_urls: gallery,
        active: Boolean(form.active)
      });
      const saved = id ? await adminApi.updateExcursion(id, payload) : await adminApi.createExcursion(payload);
      notify.success(id ? "Экскурсия обновлена." : "Экскурсия создана.");
      navigate(`/admin/excursions/${saved.id}/edit`, { replace: true });
    } catch (err) {
      notify.error(err.message || "Не удалось сохранить экскурсию.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || listsLoading) return <LoadingState text="Загрузка редактора экскурсии" />;
  if (error) return <ErrorState text={error} />;

  return (
    <div>
      <PageHeader
        eyebrow="Экскурсии"
        title={id ? "Редактирование экскурсии" : "Новая экскурсия"}
        description="Отдельная страница для программы, маршрута, расписания, цены и клиентского описания."
        actions={<Button as="link" to="/" tone="neutral"><ArrowLeft size={17} /> К каталогу</Button>}
      />

      <section className="editor-layout">
        <form className="panel stack" onSubmit={submit}>
          <div className="form-grid">
            <FormField label="Название экскурсии" required><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></FormField>
            <FormField label="Маршрут"><select value={form.route_id} onChange={(event) => setForm({ ...form, route_id: event.target.value })}><option value="">Маршрут пока не выбран</option>{state.routes.map((route) => <option key={route.id} value={route.id}>{route.title}</option>)}</select></FormField>
          </div>
          <FormField label="Описание для клиента">
            <textarea value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Расскажите, что увидит турист и почему программа интересна." />
          </FormField>
          <div className="actions-row">
            <Button type="button" tone="neutral" onClick={generateDescription} disabled={generating}><Sparkles size={17} /> {generating ? "Генерируем..." : "Сгенерировать описание"}</Button>
          </div>
          {generating && <LoadingState text="Описание готовится" />}
          <div className="form-grid">
            <FormField label="Цена, ₽" required><input type="number" min="0" value={form.base_price} onChange={(event) => setForm({ ...form, base_price: event.target.value })} required /></FormField>
            <FormField label="Длительность, минут"><input type="number" min="1" value={form.duration_min || ""} onChange={(event) => setForm({ ...form, duration_min: event.target.value })} /></FormField>
            <FormField label="Максимум участников"><input type="number" min="1" max="200" value={form.max_participants} onChange={(event) => setForm({ ...form, max_participants: event.target.value })} /></FormField>
            <FormField label="Публикация">
              <label className="switch-line"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> <span>Показывать экскурсию в каталоге</span></label>
            </FormField>
          </div>
          <FormField label="Место встречи"><input value={form.meeting_point || ""} onChange={(event) => setForm({ ...form, meeting_point: event.target.value })} placeholder="Например: у главного входа в музей" /></FormField>
          <MediaGalleryManager
            label="Фотографии экскурсии"
            values={form.media_urls || []}
            cover={form.image_url}
            onCoverChange={(image_url) => setForm((prev) => ({ ...prev, image_url }))}
            onChange={(media_urls) => setForm({ ...form, media_urls, image_url: form.image_url || media_urls[0] || "" })}
            onUpload={upload}
          />
          <div className="actions-row">
            <Button type="submit" tone="primary" disabled={saving}><Save size={17} /> {saving ? "Сохраняем..." : "Сохранить экскурсию"}</Button>
            <Button as="link" to="/admin/sessions" tone="neutral">Перейти к расписанию</Button>
          </div>
        </form>

        <aside className="editor-preview">
          <img src={mediaUrl(cover || placeholderImage)} alt="" />
          <h2>{form.title}</h2>
          <p>{form.description || "Описание появится в карточке экскурсии после заполнения."}</p>
          <div className="detail-badges">
            <span>{form.base_price || 0} ₽</span>
            <span>{form.duration_min || selectedRoute?.estimated_duration_min || 0} мин</span>
            <span>{selectedRoute?.title || "Маршрут не выбран"}</span>
          </div>
          {selectedRoute ? (
            <ol className="mini-route-list">
              {[...(selectedRoute.points || [])].sort((a, b) => a.position - b.position).map((link, index) => (
                <li key={link.id || link.point_id}><span>{index + 1}</span>{link.point?.name || `Точка ${link.point_id}`}</li>
              ))}
            </ol>
          ) : <EmptyState title="Маршрут не выбран" text="Выберите маршрут, чтобы видеть порядок точек в предпросмотре." />}
          {previewImages.length > 1 && (
            <div className="gallery-preview">
              {previewImages.slice(0, 6).map((src) => <img key={src} src={mediaUrl(src)} alt="" />)}
            </div>
          )}
          <Link className="table-link" to="/admin/routes">Открыть конструктор маршрутов</Link>
        </aside>
      </section>
    </div>
  );
}
