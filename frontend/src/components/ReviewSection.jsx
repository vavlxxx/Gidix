import React, { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../api";
import { useToast } from "../context/ToastContext";

export default function ReviewSection({ routeId }) {
  const { notify } = useToast();
  const [reviews, setReviews] = useState([]);
  const [routeDates, setRouteDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    route_date_id: "",
    booking_code: "",
    email: "",
    rating: 5,
    comment: ""
  });

  const getDateTimeValue = (item) => item.starts_at || `${item.date}T00:00:00`;

  const formatExcursion = (value) =>
    new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

  const formatCreated = (value) =>
    new Date(value).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

  const reviewableDates = useMemo(() => {
    const now = new Date();
    return routeDates
      .filter((item) => new Date(getDateTimeValue(item)) <= now)
      .sort((a, b) => new Date(getDateTimeValue(a)) - new Date(getDateTimeValue(b)));
  }, [routeDates]);

  const hasExcursions = reviewableDates.length > 0;

  const getDateValue = (item) => item.starts_at ? item.starts_at.split("T")[0] : item.date;
  const getTimeValue = (item) => item.starts_at ? item.starts_at.slice(11, 16) : "";

  const groupedReviewDates = useMemo(() => {
    const groups = {};
    reviewableDates.forEach((item) => {
      const dateKey = getDateValue(item);
      const dateValue = new Date(`${dateKey}T00:00:00`);
      const key = dateValue.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });
    return Object.entries(groups);
  }, [reviewableDates]);

  const formatSlotDate = (item) => {
    const dateKey = getDateValue(item);
    const dateValue = new Date(`${dateKey}T00:00:00`);
    const timeValue = getTimeValue(item);
    return {
      day: dateValue.toLocaleDateString("ru-RU", { day: "2-digit" }),
      weekday: dateValue.toLocaleDateString("ru-RU", { weekday: "short" }),
      month: dateValue.toLocaleDateString("ru-RU", { month: "short" }),
      time: timeValue
    };
  };

  const selectedDate = useMemo(
    () => reviewableDates.find((item) => String(item.id) === form.route_date_id),
    [reviewableDates, form.route_date_id]
  );

  useEffect(() => {
    if (!routeId) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/routes/${routeId}/reviews`),
      apiFetch(`/api/routes/${routeId}/dates?include_past=true&include_booked=true&include_inactive=true`)
    ])
      .then(([reviewsData, datesData]) => {
        setReviews(reviewsData);
        setRouteDates(datesData);
        const now = new Date();
        const reviewable = datesData.filter(
          (item) => new Date(getDateTimeValue(item)) <= now
        );
        if (reviewable.length > 0) {
          const latest = reviewable[reviewable.length - 1];
          setForm((prev) =>
            prev.route_date_id ? prev : { ...prev, route_date_id: String(latest.id) }
          );
        }
      })
      .catch((err) => {
        notify({
          type: "error",
          title: "Не удалось загрузить отзывы",
          message: err.message
        });
      })
      .finally(() => setLoading(false));
  }, [routeId]);

  const ratingLabel = useMemo(() => `${form.rating} из 5`, [form.rating]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.route_date_id) {
      notify({
        type: "error",
        title: "Выберите экскурсию",
        message: "Нужна проведенная экскурсия для отзыва."
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        route_date_id: Number(form.route_date_id),
        booking_code: form.booking_code.trim(),
        email: form.email.trim(),
        rating: Number(form.rating),
        comment: form.comment.trim() || null
      };
      const created = await apiFetch(`/api/routes/${routeId}/reviews`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (created.is_approved) {
        setReviews((prev) => [created, ...prev]);
      }
      setForm((prev) => ({
        ...prev,
        booking_code: "",
        email: "",
        comment: ""
      }));
      notify({
        type: "success",
        title: "Спасибо за отзыв",
        message: "Отзыв отправлен на модерацию и появится после проверки."
      });
    } catch (err) {
      notify({
        type: "error",
        title: "Не удалось отправить отзыв",
        message: err.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-section">
      <div className="section-header">
        <h2>Отзывы об экскурсии</h2>
        <p>Поделитесь впечатлениями, если вы уже прошли экскурсию.</p>
      </div>

      {loading && <p>Загрузка отзывов...</p>}
      {!loading && reviews.length === 0 && (
        <p className="review-empty">Пока нет опубликованных отзывов.</p>
      )}

      <div className="review-grid">
        {reviews.map((review) => (
          <article key={review.id} className="review-card">
            <div className="review-header">
              <strong>{review.author_name}</strong>
              <span className="review-date">{formatCreated(review.created_at)}</span>
            </div>
            <div className="review-meta">
              <div
                className="review-stars"
                role="img"
                aria-label={`Оценка ${review.rating} из 5`}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <span
                    key={value}
                    className={`review-star${review.rating >= value ? " is-active" : ""}`}
                    aria-hidden="true"
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="review-excursion">{formatExcursion(review.excursion_starts_at)}</span>
            </div>
            {review.comment && <p>{review.comment}</p>}
          </article>
        ))}
      </div>

      <div className="review-form">
        <h3>Оставить отзыв</h3>
        {!hasExcursions && (
          <p className="review-empty">Отзыв можно оставить после проведенной экскурсии.</p>
        )}
        {hasExcursions && (
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="full">
              Экскурсия
              <div className="review-date-picker" role="radiogroup" aria-label="Выбор даты экскурсии">
                {selectedDate && (
                  <div className="date-picked">
                    Вы выбрали {formatExcursion(getDateTimeValue(selectedDate))}
                  </div>
                )}
                <div className="date-table">
                  {groupedReviewDates.map(([month, items]) => (
                    <div key={month} className="date-table-group">
                      <div className="date-table-month">{month}</div>
                      <div className="date-table-grid">
                        {items.map((item) => {
                          const parts = formatSlotDate(item);
                          const isActive = form.route_date_id === String(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`date-slot${isActive ? " active" : ""}`}
                              role="radio"
                              aria-checked={isActive}
                              onClick={() =>
                                setForm((prev) => ({ ...prev, route_date_id: String(item.id) }))
                              }
                            >
                              <span className="date-slot-day">{parts.day}</span>
                              <span className="date-slot-meta">
                                {parts.month} · {parts.weekday}
                                {parts.time ? ` · ${parts.time}` : ""}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </label>
            <label>
              Код брони
              <input
                name="booking_code"
                value={form.booking_code}
                onChange={handleChange}
                placeholder="Например, GX-12345"
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Оценка
              <div className="rating-stars" role="radiogroup" aria-label="Оценка">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    className={`rating-star${form.rating >= value ? " is-active" : ""}`}
                    type="button"
                    role="radio"
                    aria-checked={form.rating === value}
                    aria-label={`Оценка ${value}`}
                    onClick={() => setForm((prev) => ({ ...prev, rating: value }))}
                  >
                    ★
                  </button>
                ))}
              </div>
              <span className="review-rating-note">Текущая оценка: {ratingLabel}</span>
            </label>
            <label className="full">
              Комментарий
              <textarea
                name="comment"
                value={form.comment}
                onChange={handleChange}
                rows="4"
                placeholder="Что запомнилось в экскурсии?"
              />
            </label>
            <button className="button primary full" type="submit" disabled={submitting}>
              {submitting ? "Отправка..." : "Отправить отзыв"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
