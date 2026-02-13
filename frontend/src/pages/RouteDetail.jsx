import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";

import { apiBase, apiFetch } from "../api";
import BookingForm from "../components/BookingForm";
import RouteMap from "../components/RouteMap";

const pointTypeLabels = {
  museum: "Музей",
  temple: "Храм",
  monument: "Памятник",
  nature: "Природная достопримечательность",
  park: "Зона отдыха",
  cafe: "Кафе/ресторан",
  other: "Другое"
};

export default function RouteDetail() {
  const { id } = useParams();
  const [route, setRoute] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/api/routes/${id}`)
      .then((data) => {
        setRoute(data);
        setActiveIndex(0);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="page">
        <p className="error-text">{error}</p>
        <Link className="button ghost" to="/">Вернуться в каталог</Link>
      </div>
    );
  }

  if (!route) {
    return <div className="page">Загрузка маршрута...</div>;
  }

  const photos = route.photos || [];
  const current = photos[activeIndex];
  const cover = current ? `${apiBase}${current.file_path}` : null;

  return (
    <div className="page">
      <div className="route-detail-header">
        <Link className="button ghost" to="/">← К каталогу</Link>
        <h1>{route.title}</h1>
      </div>

      <div className="route-detail-grid">
        <div className="route-gallery">
          <div
            className="route-gallery-main"
            style={cover ? { backgroundImage: `url(${cover})` } : undefined}
          >
            {!cover && <div className="route-gallery-placeholder">Фотографии появятся позже</div>}
          </div>
          {photos.length > 1 && (
            <div className="route-gallery-thumbs">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  className={index === activeIndex ? "active" : ""}
                  onClick={() => setActiveIndex(index)}
                  style={{ backgroundImage: `url(${apiBase}${photo.file_path})` }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="route-info">
          <div className="route-info-card">
            <h3>Описание программы</h3>
            <ReactMarkdown>{route.description}</ReactMarkdown>
          </div>
          <div className="route-info-card">
            <h3>Детали</h3>
            <ul>
              <li>Длительность: {route.duration_hours.toFixed(1)} ч</li>
              <li>Стоимость: {route.price_adult.toFixed(0)} ₽</li>
              {route.price_child && <li>Детский тариф: {route.price_child.toFixed(0)} ₽</li>}
              {route.price_group && <li>Групповой тариф: {route.price_group.toFixed(0)} ₽</li>}
              <li>Макс. группа: {route.max_participants} человек</li>
            </ul>
          </div>
        </div>
      </div>

      <section className="route-map-section">
        <div className="section-header">
          <h2>Маршрут на карте</h2>
          <p>Отмеченные точки интереса и траектория экскурсии.</p>
        </div>
        <RouteMap points={route.points} />
        {route.points?.length > 0 && (
          <div className="point-summary">
            {route.points.map((point, index) => (
              <div key={point.id || `${point.title}-${index}`} className="point-summary-item">
                <span className="point-summary-index">{index + 1}</span>
                <div className="point-summary-body">
                  <div className="point-summary-header">
                    <strong>{point.title}</strong>
                    <span className="point-summary-type">
                      {pointTypeLabels[point.point_type] || point.point_type}
                    </span>
                  </div>
                  <p>{point.description}</p>
                  <div className="point-summary-meta">
                    <span>Время: {point.visit_minutes} мин</span>
                    <span>Порядок: {index + 1}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="booking-section">
        <div className="section-header">
          <h2>Оставить заявку на экскурсию</h2>
          <p>Заполните форму и мы свяжемся с вами для подтверждения.</p>
        </div>
        <BookingForm routeId={route.id} maxParticipants={route.max_participants} />
      </section>
    </div>
  );
}
