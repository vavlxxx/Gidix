import React from "react";
import { Link, NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { CalendarDays, CreditCard, Gauge, LogOut, Map, MapPin, Menu, MessageSquare, Route, Ticket } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { roleTitle, userHasRole } from "../utils/format";

const navigation = [
  { to: "/admin", label: "Обзор", icon: Gauge, roles: ["admin", "superuser", "manager", "dispatcher", "guide", "accountant", "it_specialist"] },
  { to: "/admin/bookings", label: "Заявки", icon: CreditCard, roles: ["admin", "superuser", "manager", "dispatcher", "accountant"] },
  { to: "/admin/sessions", label: "Календарь / сеансы", icon: CalendarDays, roles: ["admin", "superuser", "manager", "guide"] },
  { to: "/admin/excursions", label: "Экскурсии", icon: Ticket, roles: ["admin", "superuser", "manager"] },
  { to: "/admin/routes", label: "Маршруты", icon: Route, roles: ["admin", "superuser", "manager", "it_specialist"] },
  { to: "/admin/points", label: "Точки интереса", icon: MapPin, roles: ["admin", "superuser", "manager", "it_specialist"] },
  { to: "/admin/reviews", label: "Отзывы", icon: MessageSquare, roles: ["admin", "superuser", "manager"] }
];

export function AdminLayout() {
  const auth = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(() => localStorage.getItem("gidix_admin_nav_collapsed") === "1");

  if (!auth.ready) return <main className="admin-loading">Проверка сессии...</main>;
  if (!auth.user) return <Navigate to="/login" replace />;
  if (!auth.isStaff) return <Navigate to="/" replace />;

  const visible = navigation.filter((item) => userHasRole(auth.user, item.roles));
  const primaryRole = auth.user.roles?.[0];

  function toggleCollapsed() {
    setCollapsed((value) => {
      localStorage.setItem("gidix_admin_nav_collapsed", value ? "0" : "1");
      return !value;
    });
  }

  async function logout() {
    await auth.logout();
    notify.success("Вы вышли из рабочего кабинета.");
    navigate("/");
  }

  return (
    <div className={`admin-shell site-with-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <main className="admin-content">
        <Outlet />
      </main>
      <aside className="admin-sidebar site-sidebar site-sidebar--right">
        <button className="sidebar-toggle" type="button" aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"} onClick={toggleCollapsed}>
          <Menu size={20} />
        </button>
        <Link className="admin-brand sidebar-brand" to="/admin"><Map size={22} /> <span>GIDIX</span></Link>
        <div className="staff-card">
          <strong>{auth.user.full_name || auth.user.email}</strong>
          <span>{roleTitle(primaryRole)}</span>
        </div>
        <nav className="admin-nav" aria-label="Навигация рабочего кабинета">
          {visible.map((item) => {
            const Icon = item.icon;
            return <NavLink key={item.to} to={item.to} end={item.to === "/admin"} title={item.label}><Icon size={18} /> <span>{item.label}</span></NavLink>;
          })}
        </nav>
        <div className="admin-sidebar__footer">
          <button type="button" onClick={logout} title="Выйти"><LogOut size={17} /> <span>Выйти</span></button>
        </div>
      </aside>
    </div>
  );
}
