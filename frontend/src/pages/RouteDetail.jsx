import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";

import { apiBase, apiFetch } from "../api";
import BookingForm from "../components/BookingForm";
import RouteMap from "../components/RouteMap";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

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

  const photos = route?.photos || [];

  useEffect(() => {
    if (!route?.photos?.length) return;
    const coverIndex = route.photos.findIndex((photo) => photo.is_cover);
    setActiveIndex(coverIndex >= 0 ? coverIndex : 0);
  }, [route]);

  useEffect(() => {
    if (photos.length < 2) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % photos.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [photos.length]);

  if (error) {
    return (
      <div className="page">
        <SiteHeader />
        <section className="section">
          <div className="section-inner">
            <p className="error-text">{error}</p>
            <Link className="button ghost" to="/">Вернуться в каталог</Link>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="page">
        <SiteHeader />
        <section className="section">
          <div className="section-inner">
            <p>Загрузка маршрута...</p>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  const coverPhoto = photos.find((photo) => photo.is_cover) || photos[0];
  const current = photos[activeIndex] || coverPhoto;
  const cover = coverPhoto ? `${apiBase}${coverPhoto.file_path}` : null;
  const currentUrl = current ? `${apiBase}${current.file_path}` : null;
  const durationLabel = `${route.duration_hours.toFixed(1)} ч`;
  const priceLabel = `${route.price_adult.toFixed(0)} ₽`;

  const handlePrev = () => {
    if (!photos.length) return;
    setActiveIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleNext = () => {
    if (!photos.length) return;
    setActiveIndex((prev) => (prev + 1) % photos.length);
  };

  return (
    <div className="page">
      <SiteHeader />

      <section
        className="section section--route-hero"
        style={cover ? { "--route-hero-image": `url(${cover})` } : undefined}
      >
        <div className="route-hero-overlay" />
        <div className="section-inner">
          <header className="route-hero">
            <div className="route-hero-content">
              <Link className="button ghost" to="/">← К каталогу</Link>
              <p className="route-hero-tag">Экскурсионный маршрут</p>
              <h1>{route.title}</h1>
              <div className="route-hero-meta">
                <div>
                  <span>{durationLabel}</span>
                  <small>длительность</small>
                </div>
                <div>
                  <span>{route.max_participants}</span>
                  <small>группа до</small>
                </div>
                <div>
                  <span>{route.points?.length || 0}</span>
                  <small>точек</small>
                </div>
              </div>
            </div>
            <div className="route-hero-card">
              <div className="route-hero-price">
                <span>от</span>
                <strong>{priceLabel}</strong>
                <small>за взрослого</small>
              </div>
              <div className="route-hero-note">
                Выберите дату из доступных, и мы подтвердим бронь после рассмотрения заявки.
              </div>
            </div>
          </header>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="route-banner">
            <div
              className="route-banner-frame"
              style={currentUrl ? { backgroundImage: `url(${currentUrl})` } : undefined}
            >
              {!currentUrl && <div className="route-gallery-placeholder">Фотографии появятся позже</div>}
              {photos.length > 1 && (
                <div className="route-banner-controls">
                  <button className="route-banner-btn" type="button" onClick={handlePrev} aria-label="Назад">
                    ←
                  </button>
                  <span className="route-banner-index">
                    {activeIndex + 1} / {photos.length}
                  </span>
                  <button className="route-banner-btn" type="button" onClick={handleNext} aria-label="Вперёд">
                    →
                  </button>
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="route-banner-thumbs">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    className={index === activeIndex ? "active" : ""}
                    onClick={() => setActiveIndex(index)}
                    style={{ backgroundImage: `url(${apiBase}${photo.file_path})` }}
                    aria-label={`Фото ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="route-detail-grid">
            <div className="route-info-card route-info-card--wide">
              <h3>Описание программы</h3>
              <ReactMarkdown>{route.description}</ReactMarkdown>
            </div>
            <div className="route-info-card">
              <h3>Детали</h3>
              <div className="route-info-list">
                <div>Длительность: {route.duration_hours.toFixed(1)} ч</div>
                <div>Стоимость: {route.price_adult.toFixed(0)} ₽</div>
                {route.price_child && <div>Детский тариф: {route.price_child.toFixed(0)} ₽</div>}
                {route.price_group && <div>Групповой тариф: {route.price_group.toFixed(0)} ₽</div>}
                <div>Макс. группа: {route.max_participants} человек</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section route-map-section">
        <div className="section-inner">
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
                      <span>{point.visit_minutes} мин</span>
                      <span>Порядок: {index + 1}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section booking-section">
        <div className="section-inner">
          <div className="section-header">
            <h2>Оставить заявку на экскурсию</h2>
            <p>Заполните форму и мы свяжемся с вами для подтверждения.</p>
          </div>
          <BookingForm routeId={route.id} maxParticipants={route.max_participants} />
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
