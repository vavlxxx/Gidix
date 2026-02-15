import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";

import { apiFetch } from "../api";
import MapEditor from "../components/MapEditor";
import PhotoUploader from "../components/PhotoUploader";
import PointModal from "../components/PointModal";
import { useToast } from "../context/ToastContext";

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
  lat: 54.7388,
  lng: 55.9721,
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
  const { notify } = useToast();
  const isEdit = Boolean(id);
  const [route, setRoute] = useState(emptyRoute);
  const [points, setPoints] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [draftPoint, setDraftPoint] = useState(defaultPoint);
  const [editingIndex, setEditingIndex] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [completedExcursions, setCompletedExcursions] = useState([]);
  const [newDate, setNewDate] = useState("");
  const [newExcursionTime, setNewExcursionTime] = useState("");
  const [dateStatus, setDateStatus] = useState("idle");
  const [excursionStatus, setExcursionStatus] = useState("idle");
  const [status, setStatus] = useState("idle");

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
      .catch((err) => {
        notify({
          type: "error",
          title: "Не удалось загрузить маршрут",
          message: err.message
        });
      });
  }, [id, isEdit]);

  useEffect(() => {
    if (!isEdit) {
      setAvailableDates([]);
      return;
    }
    setDateStatus("loading");
    apiFetch(`/api/routes/${id}/dates?include_booked=true&include_inactive=true`)
      .then((data) => setAvailableDates(data))
      .catch((err) => {
        notify({
          type: "error",
          title: "Не удалось загрузить даты",
          message: err.message
        });
      })
      .finally(() => setDateStatus("idle"));
  }, [id, isEdit]);

  useEffect(() => {
    if (!isEdit) {
      setCompletedExcursions([]);
      return;
    }
    setExcursionStatus("loading");
    apiFetch(`/api/routes/${id}/completed-excursions`)
      .then((data) => setCompletedExcursions(data))
      .catch((err) => {
        notify({
          type: "error",
          title: "Не удалось загрузить проведенные экскурсии",
          message: err.message
        });
      })
      .finally(() => setExcursionStatus("idle"));
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
    try {
      const payload = buildPayload(publishFlag);
      const response = await apiFetch(isEdit ? `/api/routes/${id}` : "/api/routes/", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      setStatus("saved");
      setRoute((prev) => ({ ...prev, is_published: publishFlag }));
      const title = isEdit ? "Маршрут обновлен" : "Маршрут создан";
      const message = publishFlag ? "Статус: опубликован" : "Статус: черновик";
      notify({
        type: "success",
        title,
        message: preview ? `${message}. Предпросмотр открыт.` : message
      });
      if (!isEdit) {
        navigate(`/admin/routes/${response.id}`);
      }
      if (preview) {
        window.open(`/route/${response.id}`, "_blank");
      }
    } catch (err) {
      setStatus("error");
      notify({
        type: "error",
        title: "Ошибка сохранения",
        message: err.message
      });
    }
  };

  const handleAddDate = async () => {
    if (!newDate || !isEdit) return;
    setDateStatus("saving");
    try {
      const created = await apiFetch(`/api/routes/${id}/dates`, {
        method: "POST",
        body: JSON.stringify({ date: newDate })
      });
      setAvailableDates((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      setNewDate("");
      setDateStatus("idle");
      notify({
        type: "success",
        title: "Дата добавлена",
        message: formatDate(created.date)
      });
    } catch (err) {
      setDateStatus("error");
      notify({
        type: "error",
        title: "Ошибка добавления даты",
        message: err.message
      });
    }
  };

  const handleToggleDate = async (dateId, nextActive) => {
    if (!isEdit) return;
    setDateStatus("saving");
    try {
      const updated = await apiFetch(`/api/routes/${id}/dates/${dateId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: nextActive })
      });
      setAvailableDates((prev) => prev.map((item) => (item.id === dateId ? updated : item)));
      setDateStatus("idle");
      notify({
        type: "success",
        title: "Дата обновлена",
        message: nextActive ? "Дата открыта для бронирования" : "Дата скрыта"
      });
    } catch (err) {
      setDateStatus("error");
      notify({
        type: "error",
        title: "Ошибка обновления даты",
        message: err.message
      });
    }
  };

  const handleDeleteDate = async (dateId) => {
    if (!isEdit) return;
    setDateStatus("saving");
    try {
      await apiFetch(`/api/routes/${id}/dates/${dateId}`, { method: "DELETE" });
      setAvailableDates((prev) => prev.filter((item) => item.id !== dateId));
      setDateStatus("idle");
      notify({
        type: "success",
        title: "Дата удалена"
      });
    } catch (err) {
      setDateStatus("error");
      notify({
        type: "error",
        title: "Ошибка удаления даты",
        message: err.message
      });
    }
  };

  const handleAddExcursion = async () => {
    if (!newExcursionTime || !isEdit) return;
    setExcursionStatus("saving");
    try {
      const created = await apiFetch(`/api/routes/${id}/completed-excursions`, {
        method: "POST",
        body: JSON.stringify({ starts_at: newExcursionTime })
      });
      setCompletedExcursions((prev) =>
        [created, ...prev].sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at))
      );
      setNewExcursionTime("");
      setExcursionStatus("idle");
      notify({
        type: "success",
        title: "Экскурсия добавлена",
        message: formatDateTime(created.starts_at)
      });
    } catch (err) {
      setExcursionStatus("error");
      notify({
        type: "error",
        title: "Ошибка добавления экскурсии",
        message: err.message
      });
    }
  };

  const formatDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    weekday: "short"
  });

  const formatDateTime = (value) => new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const maxExcursionTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>{isEdit ? "Редактирование маршрута" : "Создание маршрута"}</h1>
          <p>Заполните описание, добавьте точки кликом по карте и загрузите фотографии.</p>
        </div>
        <div className="admin-header-actions" aria-hidden="true" />
      </div>

      <div className="route-editor">
        <div className="route-editor-map">
          <div className="map-toolbar">
            <strong>Интерактивная карта</strong>
            <span>Кликните по карте, чтобы добавить точку маршрута.</span>
          </div>
          <MapEditor points={points} onAddPoint={openPointModal} />
        </div>
        <div className="route-editor-form">
          <div className="form-grid">
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
            <h3>Доступные даты</h3>
            {!isEdit && (
              <p>Сначала сохраните маршрут, чтобы добавить даты экскурсий.</p>
            )}
            {isEdit && (
              <div className="date-manager">
                <div className="date-manager-toolbar">
                  <input
                    type="date"
                    value={newDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(event) => setNewDate(event.target.value)}
                  />
                  <button
                    className="button primary"
                    type="button"
                    onClick={handleAddDate}
                    disabled={!newDate || dateStatus === "saving"}
                  >
                    Добавить дату
                  </button>
                </div>
                {dateStatus === "loading" && <p>Загрузка дат...</p>}
                {availableDates.length === 0 && dateStatus !== "loading" && (
                  <p>Список пуст. Добавьте даты, чтобы они появились в форме бронирования.</p>
                )}
                <div className="date-manager-list">
                  {availableDates.map((item) => (
                    <div key={item.id} className="date-manager-item">
                      <div>
                        <strong>{formatDate(item.date)}</strong>
                        <div className="date-manager-meta">
                          {item.is_booked ? (
                            <span className="date-tag date-tag--booked">Забронирована</span>
                          ) : item.is_active ? (
                            <span className="date-tag date-tag--active">Доступна</span>
                          ) : (
                            <span className="date-tag date-tag--inactive">Скрыта</span>
                          )}
                        </div>
                      </div>
                      <div className="date-manager-actions">
                        <button
                          className="button ghost"
                          type="button"
                          onClick={() => handleToggleDate(item.id, !item.is_active)}
                          disabled={item.is_booked || dateStatus === "saving"}
                        >
                          {item.is_active ? "Скрыть" : "Открыть"}
                        </button>
                        <button
                          className="button ghost"
                          type="button"
                          onClick={() => handleDeleteDate(item.id)}
                          disabled={item.is_booked || dateStatus === "saving"}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="editor-section">
            <h3>Проведенные экскурсии</h3>
            <p>Добавьте фактическую дату и время экскурсии, чтобы участники могли оставить отзыв.</p>
            {!isEdit && (
              <p>Сначала сохраните маршрут, чтобы фиксировать проведенные экскурсии.</p>
            )}
            {isEdit && (
              <div className="date-manager">
                <div className="date-manager-toolbar">
                  <input
                    type="datetime-local"
                    value={newExcursionTime}
                    max={maxExcursionTime}
                    onChange={(event) => setNewExcursionTime(event.target.value)}
                  />
                  <button
                    className="button primary"
                    type="button"
                    onClick={handleAddExcursion}
                    disabled={!newExcursionTime || excursionStatus === "saving"}
                  >
                    Добавить экскурсию
                  </button>
                </div>
                {excursionStatus === "loading" && <p>Загрузка проведенных экскурсий...</p>}
                {completedExcursions.length === 0 && excursionStatus !== "loading" && (
                  <p>Пока нет проведенных экскурсий.</p>
                )}
                <div className="date-manager-list">
                  {completedExcursions.map((item) => (
                    <div key={item.id} className="date-manager-item">
                      <div>
                        <strong>{formatDateTime(item.starts_at)}</strong>
                        <div className="date-manager-meta">
                          <span className="date-tag date-tag--active">Проведена</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="editor-section">
            <h3>Точки маршрута</h3>
            <p>Добавляйте точки кликом по карте и заполните данные в форме.</p>
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
