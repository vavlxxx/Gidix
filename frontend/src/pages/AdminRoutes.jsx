import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiFetch } from "../api";

export default function AdminRoutes() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRoutes = () => {
    setError("");
    setLoading(true);
    apiFetch("/api/routes/?include_unpublished=true")
      .then((data) => setRoutes(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const handleArchive = async (routeId) => {
    if (!window.confirm("Снять маршрут с публикации?")) {
      return;
    }
    try {
      await apiFetch(`/api/routes/${routeId}`, { method: "DELETE" });
      loadRoutes();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Маршруты</h1>
          <p>Создавайте и редактируйте экскурсионные программы.</p>
        </div>
        <Link className="button primary" to="/admin/routes/new">Новый маршрут</Link>
      </div>

      {loading && <p>Загрузка...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && routes.length === 0 && (
        <p>Маршрутов пока нет. Нажмите "Новый маршрут", чтобы создать первый.</p>
      )}

      <div className="admin-list">
        {routes.map((route) => (
          <div key={route.id} className="admin-card">
            <div>
              <h3>{route.title}</h3>
              <p>{route.description.slice(0, 120)}...</p>
              <div className="admin-card-meta">
                <span>Длительность: {route.duration_hours.toFixed(1)} ч</span>
                <span>Стоимость: {route.price_adult.toFixed(0)} ₽</span>
                <span>Статус: {route.is_published ? "Опубликован" : "Черновик"}</span>
              </div>
            </div>
            <div className="admin-card-actions">
              <Link className="button ghost" to={`/admin/routes/${route.id}`}>Редактировать</Link>
              {route.is_published && (
                <button className="button ghost" type="button" onClick={() => handleArchive(route.id)}>
                  Снять с публикации
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
