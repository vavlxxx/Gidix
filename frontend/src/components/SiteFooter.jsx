import React from "react";
import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="site-footer" id="contacts">
      <div className="site-footer-brand">
        <div className="site-footer-logo">GIDIX</div>
        <p>Маршруты, которые объединяют культуру, природу и городские истории.</p>
      </div>
      <div className="site-footer-nav">
        <span>Навигация</span>
        <a href="/#catalog">Экскурсии</a>
        <Link to="/admin/login">Вход для менеджеров</Link>
      </div>
      <div className="site-footer-contacts">
        <span>Контакты</span>
        <p>+7 (800) 555-12-34</p>
        <p>info@tour.local</p>
      </div>
    </footer>
  );
}
