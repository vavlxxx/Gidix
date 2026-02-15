import React from "react";
import { Link } from "react-router-dom";

import { apiBase } from "../api";

const formatHours = (value) => `${value.toFixed(1)} ч`;

export default function RouteCard({ route }) {
  const cover = route.cover_photo ? `${apiBase}${route.cover_photo}` : null;
  const ratingValue = route.rating_count ? Number(route.rating_avg).toFixed(1) : "—";
  const ratingTitle = route.rating_count ? `${route.rating_count} отзывов` : "Пока нет отзывов";

  return (
    <Link className="route-card" to={`/route/${route.id}`}>
      <div
        className="route-card-cover"
        style={cover ? { backgroundImage: `url(${cover})` } : undefined}
      >
        <div className="route-card-overlay" />
        <div className="route-card-content">
          <div className="route-card-top">
            <h3>{route.title}</h3>
            <p>{route.description.slice(0, 140)}...</p>
          </div>
          <div className="route-card-footer">
            <div className="route-card-meta">
              <span>⏱ {formatHours(route.duration_hours)}</span>
              <span className="route-rating" title={ratingTitle}>★ {ratingValue}</span>
              <span>₽ {route.price_adult.toFixed(0)}</span>
              <span>👥 {route.max_participants}</span>
            </div>
            <span className="route-card-cta">Подробнее →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
