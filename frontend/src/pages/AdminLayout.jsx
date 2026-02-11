import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand-block">
          <span className="brand-title">Экскурсии</span>
          <span className="brand-sub">Административная панель</span>
        </div>
        <nav className="admin-nav">
          <NavLink to="/admin/routes" className={({ isActive }) => (isActive ? "active" : "")}>
            Маршруты
          </NavLink>
          <NavLink to="/admin/bookings" className={({ isActive }) => (isActive ? "active" : "")}>
            Заявки
          </NavLink>
          {user?.role === "admin" && (
            <NavLink to="/admin/users" className={({ isActive }) => (isActive ? "active" : "")}>
              Пользователи
            </NavLink>
          )}
        </nav>
        <div className="admin-user">
          <div>
            <div className="admin-user-name">{user?.full_name}</div>
            <div className="admin-user-role">{user?.role === "admin" ? "Администратор" : "Менеджер"}</div>
          </div>
          <button className="button ghost" type="button" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
