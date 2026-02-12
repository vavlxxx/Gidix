import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";

import { apiFetch } from "../api";
import MapEditor from "../components/MapEditor";
import PhotoUploader from "../components/PhotoUploader";
import PointModal from "../components/PointModal";

const emptyRoute = {
  title: "",
  description: "",
  duration_hours: 3,
  price_adult: 1500,
  price_child: "",
  price_group: "",
  max_participants: 15,
  is_published: false
};

const defaultPoint = {
  title: "Новая точка",
  description: "",
  point_type: "other",
  visit_minutes: 30,
  lat: 55.751244,
  lng: 37.618423,
  order_index: 0
};

const pointTypeLabels = {
  museum: "Музей",
  temple: "Храм",
  monument: "Памятник",
  nature: "Природная достопримечательность",
  park: "Зона отдыха",
  cafe: "Кафе/ресторан",
  other: "Другое"
};

const toNumberOrNull = (value) => (value === "" ? null : Number(value));

const haversine = (a, b) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDlat = Math.sin(dLat / 2);
  const sinDlng = Math.sin(dLng / 2);
  const h = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlng * sinDlng;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export default function AdminRouteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [route, setRoute] = useState(emptyRoute);
  const [points, setPoints] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [draftPoint, setDraftPoint] = useState(defaultPoint);
  const [editingIndex, setEditingIndex] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) {
      setRoute(emptyRoute);
      setPoints([]);
      setPhotos([]);
      return;
    }
    apiFetch(`/api/routes/${id}`)
      .then((data) => {
        setRoute({
          title: data.title,
          description: data.description,
          duration_hours: data.duration_hours,
          price_adult: data.price_adult,
          price_child: data.price_child || "",
          price_group: data.price_group || "",
          max_participants: data.max_participants,
          is_published: data.is_published
        });
        setPoints(data.points.map((point, index) => ({ ...point, order_index: index })));
        setPhotos(data.photos.map((photo, index) => ({
          file_path: photo.file_path,
          sort_order: index,
          is_cover: photo.is_cover
        })));
      })
      .catch((err) => setError(err.message));
  }, [id, isEdit]);

  const stats = useMemo(() => {
    if (points.length < 2) {
      return { distance: 0, travelMinutes: 0, totalMinutes: 0 };
    }
    const distance = points.reduce((sum, point, index) => {
      if (index === 0) {
        return sum;
      }
      return sum + haversine(points[index - 1], point);
    }, 0);
    const travelMinutes = (distance / 30) * 60;
    const visitMinutes = points.reduce((sum, point) => sum + Number(point.visit_minutes || 0), 0);
    return {
      distance,
      travelMinutes,
      totalMinutes: travelMinutes + visitMinutes
    };
  }, [points]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setRoute((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const openPointModal = ({ lat, lng } = {}) => {
    const lastPoint = points[points.length - 1];
    setDraftPoint({
      ...defaultPoint,
      lat: lat ?? (lastPoint ? lastPoint.lat : defaultPoint.lat),
      lng: lng ?? (lastPoint ? lastPoint.lng : defaultPoint.lng),
      order_index: points.length
    });
    setEditingIndex(null);
    setModalOpen(true);
  };

  const handleAddPoint = () => {
    openPointModal();
  };

  const handlePointSave = (point) => {
    if (editingIndex === null) {
      setPoints((prev) => [...prev, { ...point, order_index: prev.length }]);
    } else {
      setPoints((prev) => prev.map((item, idx) => (idx === editingIndex ? point : item)));
    }
    setModalOpen(false);
  };

  const handleEditPoint = (index) => {
    setDraftPoint(points[index]);
    setEditingIndex(index);
    setModalOpen(true);
  };

  const handleMovePoint = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= points.length) {
      return;
    }
    const next = [...points];
    [next[index], next[target]] = [next[target], next[index]];
    next.forEach((point, idx) => {
      point.order_index = idx;
    });
    setPoints(next);
  };

  const handleRemovePoint = (index) => {
    const next = points.filter((_, idx) => idx !== index).map((point, idx) => ({
      ...point,
      order_index: idx
    }));
    setPoints(next);
  };

  const buildPayload = (publishFlag) => ({
    ...route,
    duration_hours: Number(route.duration_hours),
    price_adult: Number(route.price_adult),
    price_child: toNumberOrNull(route.price_child),
    price_group: toNumberOrNull(route.price_group),
    max_participants: Number(route.max_participants),
    is_published: publishFlag,
    points: points.map((point, index) => ({
      title: point.title,
      description: point.description,
      lat: point.lat,
      lng: point.lng,
      point_type: point.point_type,
      visit_minutes: Number(point.visit_minutes),
      order_index: index
    })),
    photos: photos.map((photo, index) => ({
      file_path: photo.file_path,
      sort_order: index,
      is_cover: photo.is_cover
    }))
  });

  const handleSave = async (publishFlag, preview) => {
    setStatus("saving");
    setError("");
    try {
      const payload = buildPayload(publishFlag);
      const response = await apiFetch(isEdit ? `/api/routes/${id}` : "/api/routes/", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      setStatus("saved");
      setRoute((prev) => ({ ...prev, is_published: publishFlag }));
      if (!isEdit) {
        navigate(`/admin/routes/${response.id}`);
      }
      if (preview) {
        window.open(`/route/${response.id}`, "_blank");
      }
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>{isEdit ? "Редактирование маршрута" : "Создание маршрута"}</h1>
          <p>Заполните описание, добавьте точки с координатами и загрузите фотографии.</p>
        </div>
      </div>

      <div className="route-editor">
        <div className="route-editor-form">
          <label>
            Название маршрута
            <input name="title" value={route.title} onChange={handleChange} required />
          </label>
          <label>
            Описание (Markdown)
            <textarea name="description" value={route.description} onChange={handleChange} rows="6" />
          </label>
          {route.description && (
            <div className="markdown-preview">
              <ReactMarkdown>{route.description}</ReactMarkdown>
            </div>
          )}

          <div className="form-grid">
            <label>
              Длительность (ч)
              <input
                type="number"
                name="duration_hours"
                min="0.5"
                step="0.5"
                value={route.duration_hours}
                onChange={handleChange}
              />
            </label>
            <label>
              Стоимость (взрослые)
              <input
                type="number"
                name="price_adult"
                min="0"
                value={route.price_adult}
                onChange={handleChange}
              />
            </label>
            <label>
              Стоимость (дети)
              <input
                type="number"
                name="price_child"
                min="0"
                value={route.price_child}
                onChange={handleChange}
              />
            </label>
            <label>
              Стоимость (группа)
              <input
                type="number"
                name="price_group"
                min="0"
                value={route.price_group}
                onChange={handleChange}
              />
            </label>
            <label>
              Макс. участников
              <input
                type="number"
                name="max_participants"
                min="1"
                value={route.max_participants}
                onChange={handleChange}
              />
            </label>
          </div>

          <section className="editor-section">
            <h3>Фотографии</h3>
            <PhotoUploader photos={photos} onChange={setPhotos} />
          </section>

          <section className="editor-section">
            <h3>Точки маршрута</h3>
            <div className="point-toolbar">
              <button
                className="button ghost"
                type="button"
                onClick={handleAddPoint}
              >
                Добавить точку
              </button>
              <p>Точки отображаются в порядке посещения. Координаты можно ставить кликом на карте.</p>
            </div>
            <div className="point-list">
              {points.map((point, index) => (
                <div key={`${point.title}-${index}`} className="point-item">
                  <div>
                    <strong>{index + 1}. {point.title}</strong>
                    <span>{pointTypeLabels[point.point_type] || point.point_type} · {point.visit_minutes} мин.</span>
                  </div>
                  <div className="point-actions">
                    <button className="button ghost" type="button" onClick={() => handleMovePoint(index, -1)}>
                      ↑
                    </button>
                    <button className="button ghost" type="button" onClick={() => handleMovePoint(index, 1)}>
                      ↓
                    </button>
                    <button className="button ghost" type="button" onClick={() => handleEditPoint(index)}>
                      Редактировать
                    </button>
                    <button className="button ghost" type="button" onClick={() => handleRemovePoint(index)}>
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="route-stats">
              <div>
                <span>Дистанция</span>
                <strong>{stats.distance.toFixed(1)} км</strong>
              </div>
              <div>
                <span>Время в пути</span>
                <strong>{Math.round(stats.travelMinutes)} мин</strong>
              </div>
              <div>
                <span>Общее время</span>
                <strong>{Math.round(stats.totalMinutes)} мин</strong>
              </div>
            </div>
          </section>

          <div className="form-actions">
            <button
              className="button ghost"
              type="button"
              onClick={() => handleSave(false, false)}
              disabled={status === "saving"}
            >
              Сохранить как черновик
            </button>
            <button
              className="button primary"
              type="button"
              onClick={() => handleSave(true, false)}
              disabled={status === "saving"}
            >
              Опубликовать
            </button>
            {isEdit && (
              <button
                className="button ghost"
                type="button"
                onClick={() => handleSave(route.is_published, true)}
                disabled={status === "saving"}
              >
                Предварительный просмотр
              </button>
            )}
          </div>
          {error && <p className="error-text">{error}</p>}
        </div>

        <div className="route-editor-map">
          <div className="map-toolbar">
            <strong>Интерактивная карта</strong>
            <span>Кликните на карте, чтобы добавить точку. Маркеры можно редактировать кликом.</span>
          </div>
          <MapEditor
            points={points}
            onAddPoint={({ lat, lng }) => openPointModal({ lat, lng })}
            onSelectPoint={handleEditPoint}
          />
        </div>
      </div>

      <PointModal
        isOpen={modalOpen}
        point={draftPoint}
        onSave={handlePointSave}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
