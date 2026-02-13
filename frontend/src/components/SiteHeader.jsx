import React from "react";
import { Link } from "react-router-dom";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-logo" to="/">GIDIX</Link>
        <nav className="site-nav">
          <a href="/#catalog">Экскурсии</a>
          <a href="/#contacts">Контакты</a>
          <Link to="/admin/login">Менеджерам</Link>
        </nav>
      </div>
    </header>
  );
}
