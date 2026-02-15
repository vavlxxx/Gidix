import React, { useEffect, useState } from "react";

import { apiFetch } from "../api";
import RouteCard from "../components/RouteCard";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { useToast } from "../context/ToastContext";

export default function Home() {
  const { notify } = useToast();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/routes/")
      .then((data) => setRoutes(data))
      .catch((err) => {
        setError(err.message);
        notify({
          type: "error",
          title: "Не удалось загрузить каталог",
          message: err.message
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <SiteHeader />

      <section className="section section--hero">
        <div className="section-inner">
          <header className="hero">
            <div className="hero-content">
              <p className="hero-tag">Gidix • маршруты по Уфе</p>
              <h1>Откройте Уфу иначе: с живыми маршрутами и понятной логистикой</h1>
              <p className="hero-sub">
                Gidix помогает подобрать экскурсию, увидеть маршрут на карте и оставить заявку без звонков
                и ожидания.
              </p>
              <div className="hero-actions">
                <a className="button primary" href="#catalog">Смотреть экскурсии</a>
                <a className="button ghost" href="/admin/login">Вход для менеджеров</a>
              </div>
              <div className="hero-strip">
                <div className="hero-strip-item">
                  <span>15+</span>
                  <small>точек показа</small>
                </div>
                <div className="hero-strip-item">
                  <span>24/7</span>
                  <small>прием заявок</small>
                </div>
                <div className="hero-strip-item">
                  <span>2 ч</span>
                  <small>средний маршрут</small>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-card">
                <div className="hero-card-inner">
                  <h3>Gidix: маршруты с картой</h3>
                  <p>Смотрите точки интереса, длительность и стоимость в одном окне.</p>
                  <div className="hero-stats">
                    <div>
                      <span>4.9</span>
                      <small>средняя оценка</small>
                    </div>
                    <div>
                      <span>12 мин</span>
                      <small>до ответа менеджера</small>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hero-highlights">
                <div className="hero-highlight">
                  <strong>Актуальные даты</strong>
                  <span>обновляет менеджер</span>
                </div>
                <div className="hero-highlight">
                  <strong>Маршрут</strong>
                  <span>подсвечен на карте</span>
                </div>
              </div>
            </div>
          </header>
        </div>
      </section>

      <section id="catalog" className="section section--catalog">
        <div className="section-inner">
          <div className="section-header">
            <h2>Каталог экскурсий</h2>
            <p>Подберите маршрут по настроению, длительности и бюджету.</p>
          </div>

          {loading && <p>Загрузка каталога...</p>}
          {!loading && !error && routes.length === 0 && (
            <p>Пока нет опубликованных маршрутов. Зайдите в админку, чтобы добавить первый.</p>
          )}

          <div className="route-grid">
            {routes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
