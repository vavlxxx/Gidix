import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function SiteHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-brand">
          <Link className="site-logo" to="/">GIDIX</Link>
          <span className="site-tagline">научный туризм</span>
        </div>
        <div className="site-nav-group">
          <nav className="site-nav">
            <a href="/#catalog">Экскурсии</a>
            <a href="/#contacts">Контакты</a>
          </nav>
          {user && (
            <nav className="admin-nav admin-nav--header">
              <NavLink to="/admin/routes" className={({ isActive }) => (isActive ? "active" : "")}>
                Маршруты
              </NavLink>
              <NavLink to="/admin/bookings" className={({ isActive }) => (isActive ? "active" : "")}>
                Заявки
              </NavLink>
              {user.role === "admin" && (
                <NavLink to="/admin/users" className={({ isActive }) => (isActive ? "active" : "")}>
                  Сотрудники
                </NavLink>
              )}
            </nav>
          )}
        </div>
        <div className="site-profile">
          {user ? (
            <>
              <div className="site-user">
                <span className="site-user-name">{user.full_name}</span>
                <span className="site-user-role">
                  {user.role === "admin" ? "Администратор" : "Менеджер"}
                </span>
              </div>
              <button className="button ghost" type="button" onClick={handleLogout}>
                Выйти
              </button>
            </>
          ) : (
            <Link className="button ghost" to="/admin/login">
              Менеджерам
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
