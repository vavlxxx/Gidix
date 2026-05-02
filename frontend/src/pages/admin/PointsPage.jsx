import React from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { MapPin, Save, Trash2 } from "lucide-react";
import { adminApi, mediaUrl } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { MultiImageUploadField } from "../../components/ui/MultiImageUploadField";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/State";
import { UploadField } from "../../components/ui/UploadField";
import { useAdminData } from "../../hooks/useAdminData";
import { useToast } from "../../context/ToastContext";
import { cleanPayload, mediaGallery, placeholderImage } from "../../utils/format";
import { pointIcon, pointPosition, tileAttribution, tileUrl } from "../../utils/map";

const empty = { name: "", short_description: "", full_description: "", address: "", latitude: "", longitude: "", visit_duration_min: 20, image_url: "", media_urls: [] };

export function PointsPage() {
  const notify = useToast();
  const { state, loading, refresh } = useAdminData();
  const [form, setForm] = React.useState(empty);
  const [editingId, setEditingId] = React.useState(null);

  function edit(point) {
    setEditingId(point.id);
    setForm({ ...empty, ...point, latitude: String(point.latitude), longitude: String(point.longitude), media_urls: mediaGallery(point) });
  }

  async function upload(file) {
    return adminApi.upload(file);
  }

  async function submit(event) {
    event.preventDefault();
    try {
      const media = form.media_urls || [];
      const payload = cleanPayload({
        ...form,
        address: null,
        short_description: form.full_description ? form.full_description.slice(0, 480) : null,
        image_url: form.image_url || media[0] || null,
        extra: { ...(form.extra || {}), media_urls: media },
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        visit_duration_min: Number(form.visit_duration_min)
      });
      delete payload.media_urls;
      if (editingId) await adminApi.updatePoint(editingId, payload);
      else await adminApi.createPoint(payload);
      notify.success(editingId ? "Точка обновлена." : "Точка создана.");
      setForm(empty);
      setEditingId(null);
      refresh();
    } catch (err) {
      notify.error(err.message);
    }
  }

  async function remove() {
    if (!editingId || !confirm("Удалить точку интереса?")) return;
    try {
      await adminApi.deletePoint(editingId);
      notify.success("Точка удалена.");
      setForm(empty);
      setEditingId(null);
      refresh();
    } catch (err) {
      notify.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Точки интереса" title="Географическая база маршрутов" description="Точки выбираются на карте, используются в маршрутах и остаются доступными как альтернативный список для пользователей." />
      {loading && <LoadingState text="Загрузка точек" />}
      <section className="points-page points-page--split">
        <div className="points-map points-map--wide">
          <MapContainer center={[54.7351, 55.9587]} zoom={12} scrollWheelZoom className="admin-map">
            <TileLayer attribution={tileAttribution} url={tileUrl} />
            <PointsLayer
              points={state.points}
              editingId={editingId}
              onEdit={edit}
              onMove={(point, latlng) => {
                setEditingId(point.id);
                setForm({ ...empty, ...point, latitude: latlng.lat.toFixed(7), longitude: latlng.lng.toFixed(7), media_urls: mediaGallery(point) });
              }}
              onCreate={(latlng) => {
                setEditingId(null);
                setForm({ ...empty, latitude: latlng.lat.toFixed(7), longitude: latlng.lng.toFixed(7) });
              }}
            />
          </MapContainer>
        </div>
        <form className="point-editor panel stack" onSubmit={submit}>
          <h2>{editingId ? "Редактирование точки" : "Новая точка"}</h2>
          <FormField label="Название" required><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField>
          <FormField label="Описание"><textarea value={form.full_description || ""} onChange={(event) => setForm({ ...form, full_description: event.target.value, short_description: event.target.value.slice(0, 480) })} /></FormField>
          <div className="form-grid">
            <FormField label="Широта" required><input type="number" step="0.0000001" value={form.latitude} readOnly required /></FormField>
            <FormField label="Долгота" required><input type="number" step="0.0000001" value={form.longitude} readOnly required /></FormField>
          </div>
          <FormField label="Время посещения, мин"><input type="number" min="1" value={form.visit_duration_min} onChange={(event) => setForm({ ...form, visit_duration_min: event.target.value })} /></FormField>
          <UploadField label="Главное изображение точки" value={form.image_url} onChange={(value) => setForm({ ...form, image_url: value })} onUpload={async (file) => { const asset = await upload(file); setForm((prev) => ({ ...prev, image_url: asset.url, media_urls: [...new Set([asset.url, ...(prev.media_urls || [])])] })); }} />
          <MultiImageUploadField label="Фотографии точки" values={form.media_urls || []} onChange={(media_urls) => setForm({ ...form, media_urls, image_url: form.image_url || media_urls[0] || "" })} onUpload={upload} />
          <div className="actions-row">
            <Button type="submit" tone="primary"><Save size={17} /> Сохранить</Button>
            <Button type="button" tone="neutral" onClick={() => { setForm(empty); setEditingId(null); }}><MapPin size={17} /> Новая</Button>
            {editingId && <Button type="button" tone="danger" onClick={remove}><Trash2 size={17} /> Удалить</Button>}
          </div>
        </form>
      </section>
    </div>
  );
}

function PointsLayer({ points, editingId, onEdit, onCreate, onMove }) {
  useMapEvents({
    click(event) {
      onCreate(event.latlng);
    }
  });

  return points.map((point) => {
    const position = pointPosition(point);
    if (!position) return null;
    return (
      <Marker key={point.id} position={position} draggable icon={pointIcon("", editingId === point.id ? "active" : "default", true)} eventHandlers={{ click: () => onEdit(point), dragend: (event) => onMove(point, event.target.getLatLng()) }}>
        <Popup>
          <article className="map-popup">
            <img src={mediaUrl(point.image_url || placeholderImage)} alt="" />
            <strong>{point.name}</strong>
            <p>{point.short_description || point.address || "Точка интереса"}</p>
            <button type="button" onClick={() => onEdit(point)}>Редактировать</button>
          </article>
        </Popup>
      </Marker>
    );
  });
}
