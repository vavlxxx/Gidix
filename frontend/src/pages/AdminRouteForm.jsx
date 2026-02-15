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
  const [newDateTime, setNewDateTime] = useState("");
  const [dateStatus, setDateStatus] = useState("idle");
  const [status, setStatus] = useState("idle");
  const [reviews, setReviews] = useState([]);
  const [reviewStatus, setReviewStatus] = useState("idle");
  const [reviewActionId, setReviewActionId] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleValue, setRescheduleValue] = useState("");

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
      setReviews([]);
      return;
    }
    setReviewStatus("loading");
    apiFetch(`/api/routes/${id}/reviews?include_pending=true`)
      .then((data) => setReviews(data))
      .catch((err) => {
        notify({
          type: "error",
          title: "Не удалось загрузить отзывы",
          message: err.message
        });
      })
      .finally(() => setReviewStatus("idle"));
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
    if (!newDateTime || !isEdit) return;
    setDateStatus("saving");
    try {
      const dateValue = newDateTime.split("T")[0];
      const created = await apiFetch(`/api/routes/${id}/dates`, {
        method: "POST",
        body: JSON.stringify({ date: dateValue, starts_at: newDateTime })
      });
      setAvailableDates((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      setNewDateTime("");
      setDateStatus("idle");
      notify({
        type: "success",
        title: "Дата добавлена",
        message: formatDateTime(created)
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

  const handleRescheduleDate = (item) => {
    if (!isEdit) return;
    const currentValue = item.starts_at
      ? item.starts_at.slice(0, 16)
      : `${item.date}T00:00`;
    setRescheduleTarget(item);
    setRescheduleValue(currentValue);
  };

  const handleRescheduleSubmit = async (event) => {
    event.preventDefault();
    if (!rescheduleTarget || !rescheduleValue) {
      notify({
        type: "error",
        title: "Укажите дату и время",
        message: "Нужно выбрать новую дату и время для переноса."
      });
      return;
    }
    const normalized = rescheduleValue.includes("T")
      ? rescheduleValue
      : rescheduleValue.replace(" ", "T");
    const dateValue = normalized.split("T")[0];
    setDateStatus("saving");
    try {
      const updated = await apiFetch(`/api/routes/${id}/dates/${rescheduleTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ date: dateValue, starts_at: normalized })
      });
      setAvailableDates((prev) =>
        prev.map((itemDate) => (itemDate.id === rescheduleTarget.id ? updated : itemDate))
      );
      setDateStatus("idle");
      setRescheduleTarget(null);
      setRescheduleValue("");
      notify({
        type: "success",
        title: "Экскурсия перенесена",
        message: formatDateTime(updated)
      });
    } catch (err) {
      setDateStatus("error");
      notify({
        type: "error",
        title: "Ошибка переноса",
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

  const handleApproveReview = async (reviewId) => {
    if (!isEdit) return;
    setReviewActionId(reviewId);
    try {
      const updated = await apiFetch(`/api/routes/${id}/reviews/${reviewId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_approved: true })
      });
      setReviews((prev) => prev.map((item) => (item.id === reviewId ? updated : item)));
      notify({
        type: "success",
        title: "Отзыв опубликован"
      });
    } catch (err) {
      notify({
        type: "error",
        title: "Не удалось обновить отзыв",
        message: err.message
      });
    } finally {
      setReviewActionId(null);
    }
  };

  const closeRescheduleModal = () => {
    setRescheduleTarget(null);
    setRescheduleValue("");
  };

  const formatDateTime = (item) => {
    const base = item?.starts_at || (item?.date ? `${item.date}T00:00:00` : item);
    return new Date(base).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatReviewDate = (value) =>
    new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

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
                    type="datetime-local"
                    value={newDateTime}
                    onChange={(event) => setNewDateTime(event.target.value)}
                  />
                  <button
                    className="button primary"
                    type="button"
                    onClick={handleAddDate}
                    disabled={!newDateTime || dateStatus === "saving"}
                  >
                    Добавить дату и время
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
                        <strong>{formatDateTime(item)}</strong>
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
                          onClick={() => handleRescheduleDate(item)}
                          disabled={dateStatus === "saving"}
                        >
                          Перенести
                        </button>
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
            <h3>Отзывы</h3>
            {!isEdit && (
              <p>Сначала сохраните маршрут, чтобы управлять отзывами.</p>
            )}
            {isEdit && (
              <div className="review-admin">
                {reviewStatus === "loading" && <p>Загрузка отзывов...</p>}
                {reviewStatus !== "loading" && reviews.length === 0 && (
                  <p>Пока нет отзывов.</p>
                )}
                <div className="review-admin-list">
                  {reviews.map((review) => (
                    <article
                      key={review.id}
                      className={`review-admin-card${review.is_approved ? "" : " is-pending"}`}
                    >
                      <div className="review-admin-header">
                        <div>
                          <strong>{review.author_name}</strong>
                          <div className="review-admin-meta">
                            <span>{formatReviewDate(review.created_at)}</span>
                            <span>Экскурсия: {formatDateTime(review.excursion_starts_at)}</span>
                          </div>
                        </div>
                        <span
                          className={`review-admin-status${
                            review.is_approved ? " is-approved" : " is-pending"
                          }`}
                        >
                          {review.is_approved ? "Опубликован" : "На модерации"}
                        </span>
                      </div>
                      <div className="review-stars" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <span
                            key={value}
                            className={`review-star${review.rating >= value ? " is-active" : ""}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      {review.comment && <p className="review-admin-comment">{review.comment}</p>}
                      {!review.is_approved && (
                        <div className="review-admin-actions">
                          <button
                            className="button primary"
                            type="button"
                            onClick={() => handleApproveReview(review.id)}
                            disabled={reviewActionId === review.id}
                          >
                            {reviewActionId === review.id ? "Публикация..." : "Опубликовать"}
                          </button>
                        </div>
                      )}
                    </article>
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
      {rescheduleTarget && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Перенос экскурсии</h3>
              <button className="icon-button" type="button" onClick={closeRescheduleModal}>
                ✕
              </button>
            </div>
            <form onSubmit={handleRescheduleSubmit}>
              <label>
                Новая дата и время
                <input
                  type="datetime-local"
                  value={rescheduleValue}
                  onChange={(event) => setRescheduleValue(event.target.value)}
                  required
                />
              </label>
              <div className="modal-actions">
                <button className="button ghost" type="button" onClick={closeRescheduleModal}>
                  Отмена
                </button>
                <button className="button primary" type="submit" disabled={dateStatus === "saving"}>
                  {dateStatus === "saving" ? "Сохранение..." : "Перенести"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
