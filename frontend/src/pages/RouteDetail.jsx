import React, { useEffect, useMemo, useState } from "react";
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
  const [orderedPoints, setOrderedPoints] = useState([]);
  const [selectedPointKey, setSelectedPointKey] = useState(null);
  const [hoveredPointKey, setHoveredPointKey] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/api/routes/${id}`)
      .then((data) => {
        setRoute(data);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!route?.points) {
      setOrderedPoints([]);
      return;
    }
    setOrderedPoints(route.points);
  }, [route]);

  const photos = route?.photos || [];
  const points = orderedPoints.length ? orderedPoints : route?.points || [];
  const pointsWithKey = useMemo(
    () =>
      points.map((point, index) => ({
        ...point,
        _key: point.id ?? `${point.lat}-${point.lng}-${point.title || point.point_type || index}`
      })),
    [points]
  );
  const galleryPhotos = useMemo(() => {
    if (!photos.length) return [];
    const coverIndex = photos.findIndex((photo) => photo.is_cover);
    if (coverIndex <= 0) return photos;
    const next = [...photos];
    const [coverItem] = next.splice(coverIndex, 1);
    return [coverItem, ...next];
  }, [photos]);

  useEffect(() => {
    if (!pointsWithKey.length) {
      setSelectedPointKey(null);
      return;
    }
    if (selectedPointKey && !pointsWithKey.some((point) => point._key === selectedPointKey)) {
      setSelectedPointKey(null);
    }
  }, [pointsWithKey, selectedPointKey]);

  const activePointKey = hoveredPointKey || selectedPointKey;

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
  const cover = coverPhoto ? `${apiBase}${coverPhoto.file_path}` : null;
  const durationLabel = `${route.duration_hours.toFixed(1)} ч`;
  const priceLabel = `${route.price_adult.toFixed(0)} ₽`;

  const handleDragStart = (index) => (event) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (index) => (event) => {
    event.preventDefault();
    const startIndex = draggedIndex ?? Number(event.dataTransfer.getData("text/plain"));
    if (Number.isNaN(startIndex) || startIndex === index) {
      setDraggedIndex(null);
      return;
    }
    setOrderedPoints((prev) => {
      const base = prev.length ? prev : points;
      const next = [...base];
      const [moved] = next.splice(startIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
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
                  <span>{pointsWithKey.length}</span>
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

      <section className="section section--route-breadcrumbs">
        <div className="section-inner">
          <nav className="breadcrumbs" aria-label="breadcrumb">
            <Link to="/">Главная</Link>
            <span className="breadcrumbs-separator">/</span>
            <Link to="/">Каталог</Link>
            <span className="breadcrumbs-separator">/</span>
            <span className="breadcrumbs-current">{route.title}</span>
          </nav>
        </div>
      </section>

      <section className="section section--route-description">
        <div className="section-inner">
          <div className="route-description">
            <h2>Описание программы</h2>
            <ReactMarkdown>{route.description}</ReactMarkdown>
          </div>
          <div className="route-details">
            <h3>Детали</h3>
            <div className="route-details-grid">
              <div className="route-details-item">
                <span>Длительность</span>
                <strong>{route.duration_hours.toFixed(1)} ч</strong>
              </div>
              <div className="route-details-item">
                <span>Стоимость</span>
                <strong>{route.price_adult.toFixed(0)} ₽</strong>
              </div>
              {route.price_child && (
                <div className="route-details-item">
                  <span>Детский тариф</span>
                  <strong>{route.price_child.toFixed(0)} ₽</strong>
                </div>
              )}
              {route.price_group && (
                <div className="route-details-item">
                  <span>Групповой тариф</span>
                  <strong>{route.price_group.toFixed(0)} ₽</strong>
                </div>
              )}
              <div className="route-details-item">
                <span>Макс. группа</span>
                <strong>{route.max_participants} человек</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--route-gallery">
        <div className="section-inner">
          <div className="section-header">
            <h2>Галерея проекта</h2>
            <p>Фотографии маршрута и ключевых точек.</p>
          </div>
          {galleryPhotos.length > 0 ? (
            <div className="route-gallery-grid">
              {galleryPhotos.map((photo, index) => (
                <figure key={photo.id || `${photo.file_path}-${index}`} className="route-gallery-item">
                  <img
                    src={`${apiBase}${photo.file_path}`}
                    alt={`${route.title} - фото ${index + 1}`}
                    loading="lazy"
                  />
                </figure>
              ))}
            </div>
          ) : (
            <div className="route-gallery-empty">Фотографии появятся позже</div>
          )}
        </div>
      </section>

      <section className="section route-map-section">
        <div className="section-inner">
          <div className="section-header">
            <h2>Маршрут на карте</h2>
            <p>Отмеченные точки интереса и траектория экскурсии.</p>
          </div>
          <RouteMap points={pointsWithKey} activePointKey={activePointKey} />
          {pointsWithKey.length > 0 && (
            <div className="point-summary">
              {pointsWithKey.map((point, index) => {
                const isActive = activePointKey === point._key;
                const isSelected = selectedPointKey === point._key;
                const isDragging = draggedIndex === index;

                return (
                  <article
                    key={point._key}
                    className={`point-card${isActive ? " is-active" : ""}${isSelected ? " is-selected" : ""}${isDragging ? " is-dragging" : ""}`}
                    draggable
                    onDragStart={handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    onMouseEnter={() => setHoveredPointKey(point._key)}
                    onMouseLeave={() => setHoveredPointKey(null)}
                    onFocus={() => setHoveredPointKey(point._key)}
                    onBlur={() => setHoveredPointKey(null)}
                    onClick={() => setSelectedPointKey(point._key)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedPointKey(point._key);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    aria-grabbed={isDragging}
                  >
                    <div className="point-card-header">
                      <span className="point-card-index">{index + 1}</span>
                      <div className="point-card-title">
                        <strong>{point.title}</strong>
                        <span>{pointTypeLabels[point.point_type] || point.point_type}</span>
                      </div>
                      <span className="point-card-grip" aria-hidden="true" />
                    </div>
                    {point.description && (
                      <p className="point-card-description">{point.description}</p>
                    )}
                    <div className="point-card-footer">
                      <span>{point.visit_minutes} мин</span>
                      <span>Порядок: {index + 1}</span>
                    </div>
                  </article>
                );
              })}
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
