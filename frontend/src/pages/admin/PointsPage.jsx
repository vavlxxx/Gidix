import React from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { MapPin, Save, Trash2 } from "lucide-react";
import { adminApi, mediaUrl } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/State";
import { UploadField } from "../../components/ui/UploadField";
import { useAdminData } from "../../hooks/useAdminData";
import { useToast } from "../../context/ToastContext";
import { cleanPayload, placeholderImage } from "../../utils/format";
import { pointIcon, pointPosition, tileAttribution, tileUrl } from "../../utils/map";

const empty = { name: "", short_description: "", full_description: "", address: "", latitude: "", longitude: "", visit_duration_min: 20, image_url: "" };

export function PointsPage() {
  const notify = useToast();
  const { state, loading, refresh } = useAdminData();
  const [form, setForm] = React.useState(empty);
  const [editingId, setEditingId] = React.useState(null);

  function edit(point) {
    setEditingId(point.id);
    setForm({ ...empty, ...point, latitude: String(point.latitude), longitude: String(point.longitude) });
  }

  async function upload(file) {
    const asset = await adminApi.upload(file);
    setForm((prev) => ({ ...prev, image_url: asset.url }));
  }

  async function submit(event) {
    event.preventDefault();
    try {
      const payload = cleanPayload({ ...form, latitude: Number(form.latitude), longitude: Number(form.longitude), visit_duration_min: Number(form.visit_duration_min) });
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
      <section className="points-page">
        <div className="points-map points-map--wide">
          <MapContainer center={[54.7351, 55.9587]} zoom={12} scrollWheelZoom className="admin-map">
            <TileLayer attribution={tileAttribution} url={tileUrl} />
            <PointsLayer
              points={state.points}
              editingId={editingId}
              onEdit={edit}
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
          <FormField label="Краткое описание"><textarea value={form.short_description || ""} onChange={(event) => setForm({ ...form, short_description: event.target.value })} /></FormField>
          <FormField label="Полное описание"><textarea value={form.full_description || ""} onChange={(event) => setForm({ ...form, full_description: event.target.value })} /></FormField>
          <FormField label="Адрес"><input value={form.address || ""} onChange={(event) => setForm({ ...form, address: event.target.value })} /></FormField>
          <div className="form-grid">
            <FormField label="Широта" required><input type="number" step="0.0000001" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} required /></FormField>
            <FormField label="Долгота" required><input type="number" step="0.0000001" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} required /></FormField>
          </div>
          <FormField label="Время посещения, мин"><input type="number" min="1" value={form.visit_duration_min} onChange={(event) => setForm({ ...form, visit_duration_min: event.target.value })} /></FormField>
          <UploadField label="Изображение точки" value={form.image_url} onChange={(value) => setForm({ ...form, image_url: value })} onUpload={upload} />
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

function PointsLayer({ points, editingId, onEdit, onCreate }) {
  const [compact, setCompact] = React.useState(false);
  const map = useMapEvents({
    click(event) {
      onCreate(event.latlng);
    },
    zoomend() {
      setCompact(map.getZoom() < 12);
    }
  });

  React.useEffect(() => {
    setCompact(map.getZoom() < 12);
  }, [map]);

  return points.map((point, index) => {
    const position = pointPosition(point);
    if (!position) return null;
    return (
      <Marker key={point.id} position={position} icon={pointIcon(index + 1, editingId === point.id ? "active" : "default", compact)} eventHandlers={{ click: () => onEdit(point) }}>
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
