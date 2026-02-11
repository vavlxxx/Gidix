import React, { useEffect, useState } from "react";

import { apiFetch } from "../api";
import RouteCard from "../components/RouteCard";

export default function Home() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/routes/")
      .then((data) => setRoutes(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-content">
          <p className="hero-tag">Туристическая компания</p>
          <h1>Откройте для себя незабываемые маршруты</h1>
          <p className="hero-sub">
            Интерактивные экскурсии, продуманная логистика и живая история — выбирайте
            программы для семей, групп и индивидуальных путешественников.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#catalog">Смотреть экскурсии</a>
            <a className="button ghost" href="/admin/login">Вход для менеджеров</a>
          </div>
        </div>
        <div className="hero-card">
          <div className="hero-card-inner">
            <h3>Маршруты с картой</h3>
            <p>Смотрите точки интереса, длительность и стоимость в одном окне.</p>
            <div className="hero-stats">
              <div>
                <span>15+</span>
                <small>объектов показа</small>
              </div>
              <div>
                <span>24/7</span>
                <small>прием заявок</small>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="catalog" className="catalog-section">
        <div className="section-header">
          <h2>Каталог экскурсий</h2>
          <p>Подберите маршрут по настроению, длительности и бюджету.</p>
        </div>

        {loading && <p>Загрузка каталога...</p>}
        {error && <p className="error-text">{error}</p>}

        <div className="route-grid">
          {routes.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <div>
          <h4>Туристическая компания</h4>
          <p>Мы создаем маршруты, которые объединяют культуру, природу и комфорт.</p>
        </div>
        <div>
          <h4>Контакты</h4>
          <p>+7 (800) 555-12-34</p>
          <p>info@tour.local</p>
        </div>
      </footer>
    </div>
  );
}
