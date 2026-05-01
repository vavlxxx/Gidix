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

  const canManage = Boolean(user);
  const canManageRoutes = user && ["admin", "manager", "superuser"].includes(user.role);
  const canManageBookings = user && ["admin", "manager", "dispatcher", "accountant", "superuser"].includes(user.role);
  const canManageAdmin = user && ["admin", "superuser"].includes(user.role);
  const roleLabel = user
    ? {
        superuser: "Суперпользователь",
        admin: "Администратор",
        manager: "Менеджер",
        dispatcher: "Диспетчер",
        accountant: "Бухгалтер",
        guide: "Экскурсовод",
        client: "Клиент"
      }[user.role] || "Сотрудник"
    : "";

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
          {canManage && (
            <nav className="admin-nav admin-nav--header">
              {canManageRoutes && (
                <>
                  <NavLink to="/admin/routes" className={({ isActive }) => (isActive ? "active" : "")}>
                    Маршруты
                  </NavLink>
                  <NavLink to="/admin/points" className={({ isActive }) => (isActive ? "active" : "")}>
                    Точки
                  </NavLink>
                  <NavLink to="/admin/excursions" className={({ isActive }) => (isActive ? "active" : "")}>
                    Экскурсии
                  </NavLink>
                  <NavLink to="/admin/tariffs" className={({ isActive }) => (isActive ? "active" : "")}>
                    Тарифы
                  </NavLink>
                </>
              )}
              {canManageBookings && (
                <NavLink to="/admin/bookings" className={({ isActive }) => (isActive ? "active" : "")}>
                  Заявки
                </NavLink>
              )}
              {canManageAdmin && (
                <NavLink to="/admin/users" className={({ isActive }) => (isActive ? "active" : "")}>
                  Сотрудники
                </NavLink>
              )}
              {canManageAdmin && (
                <NavLink to="/admin/permissions" className={({ isActive }) => (isActive ? "active" : "")}>
                  Права
                </NavLink>
              )}
              {canManageAdmin && (
                <NavLink to="/admin/integrations" className={({ isActive }) => (isActive ? "active" : "")}>
                  Интеграции
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
                <span className="site-user-role">{roleLabel}</span>
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



