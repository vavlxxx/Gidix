import React, { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../api";
import { useToast } from "../context/ToastContext";

const ratingOptions = [5, 4, 3, 2, 1];

export default function ReviewSection({ routeId }) {
  const { notify } = useToast();
  const [reviews, setReviews] = useState([]);
  const [excursions, setExcursions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    excursion_id: "",
    booking_code: "",
    email: "",
    rating: 5,
    comment: ""
  });

  const hasExcursions = excursions.length > 0;

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

  useEffect(() => {
    if (!routeId) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/routes/${routeId}/reviews`),
      apiFetch(`/api/routes/${routeId}/completed-excursions`)
    ])
      .then(([reviewsData, excursionsData]) => {
        setReviews(reviewsData);
        setExcursions(excursionsData);
        if (excursionsData.length > 0) {
          setForm((prev) =>
            prev.excursion_id ? prev : { ...prev, excursion_id: String(excursionsData[0].id) }
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
    if (!form.excursion_id) {
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
        excursion_id: Number(form.excursion_id),
        booking_code: form.booking_code.trim(),
        email: form.email.trim(),
        rating: Number(form.rating),
        comment: form.comment.trim() || null
      };
      const created = await apiFetch(`/api/routes/${routeId}/reviews`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setReviews((prev) => [created, ...prev]);
      setForm((prev) => ({
        ...prev,
        booking_code: "",
        email: "",
        comment: ""
      }));
      notify({
        type: "success",
        title: "Спасибо за отзыв",
        message: "Он появится в списке сразу после отправки."
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
        <p className="review-empty">Пока нет отзывов. Станьте первым!</p>
      )}

      <div className="review-grid">
        {reviews.map((review) => (
          <article key={review.id} className="review-card">
            <div className="review-header">
              <strong>{review.author_name}</strong>
              <span className="review-date">{formatCreated(review.created_at)}</span>
            </div>
            <div className="review-meta">
              <span className="review-rating">{review.rating} / 5</span>
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
            <label>
              Экскурсия
              <select name="excursion_id" value={form.excursion_id} onChange={handleChange} required>
                {excursions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatExcursion(item.starts_at)}
                  </option>
                ))}
              </select>
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
              <select name="rating" value={form.rating} onChange={handleChange}>
                {ratingOptions.map((value) => (
                  <option key={value} value={value}>
                    {value} / 5
                  </option>
                ))}
              </select>
              {/* <span className="review-rating-note">Текущая оценка: {ratingLabel}</span> */}
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
