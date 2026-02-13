import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiBase, apiFetch } from "../api";

export default function AdminRoutes() {
  const [routes, setRoutes] = useState([]);
  const [distances, setDistances] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  useEffect(() => {
    if (!routes.length) {
      setDistances({});
      return;
    }
    let cancelled = false;
    Promise.all(
      routes.map((route) =>
        apiFetch(`/api/routes/${route.id}`)
          .then((detail) => {
            if (!detail.points || detail.points.length < 2) {
              return [route.id, 0];
            }
            const distance = detail.points.reduce((sum, point, index) => {
              if (index === 0) return sum;
              return sum + haversine(detail.points[index - 1], point);
            }, 0);
            return [route.id, distance];
          })
          .catch(() => [route.id, 0])
      )
    ).then((pairs) => {
      if (cancelled) return;
      const next = {};
      pairs.forEach(([id, value]) => {
        next[id] = value;
      });
      setDistances(next);
    });
    return () => {
      cancelled = true;
    };
  }, [routes]);

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
          <div key={route.id} className="admin-route-card">
            <div
              className="admin-route-media"
              style={route.cover_photo ? { backgroundImage: `url(${apiBase}${route.cover_photo})` } : undefined}
            >
              {!route.cover_photo && <span>Нет фото</span>}
            </div>
            <div className="admin-route-body">
              <div>
                <h3>{route.title}</h3>
                <p>{route.description.slice(0, 90)}...</p>
                <div className="admin-route-meta">
                  <span>{(distances[route.id] || 0).toFixed(1)} км</span>
                  <span>{route.duration_hours.toFixed(1)} ч</span>
                  <span>{route.is_published ? "Опубликован" : "Черновик"}</span>
                </div>
              </div>
              <div className="admin-route-actions">
                <Link className="button ghost" to={`/admin/routes/${route.id}`}>Редактировать</Link>
                {route.is_published && (
                  <button className="button ghost" type="button" onClick={() => handleArchive(route.id)}>
                    Снять с публикации
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
