import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { CalendarDays, Compass, CreditCard, Gauge, LogIn, LogOut, MapPin, Menu, MessageSquare, Route, UserRound, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { roleTitle, userHasRole } from "../utils/format";

const publicItems = [
  { to: "/", label: "Экскурсии", icon: Compass, end: true }
];

const staffItems = [
  { to: "/admin", label: "Обзор", icon: Gauge, roles: ["admin", "superuser", "manager", "dispatcher", "guide", "accountant", "it_specialist"], end: true },
  { to: "/admin/bookings", label: "Заявки", icon: CreditCard, roles: ["admin", "superuser", "manager", "dispatcher", "accountant"] },
  { to: "/admin/sessions", label: "Календарь", icon: CalendarDays, roles: ["admin", "superuser", "manager", "guide"] },
  { to: "/admin/routes", label: "Маршруты", icon: Route, roles: ["admin", "superuser", "manager", "it_specialist"] },
  { to: "/admin/points", label: "Точки", icon: MapPin, roles: ["admin", "superuser", "manager", "it_specialist"] },
  { to: "/admin/reviews", label: "Отзывы", icon: MessageSquare, roles: ["admin", "superuser", "manager"] }
];

export function PublicLayout() {
  const auth = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(() => localStorage.getItem("gidix_site_nav_collapsed") === "1");
  const visibleStaffItems = auth.isStaff ? staffItems.filter((item) => userHasRole(auth.user, item.roles)) : [];
  const primaryRole = auth.user?.roles?.[0];

  function toggleCollapsed() {
    setCollapsed((value) => {
      localStorage.setItem("gidix_site_nav_collapsed", value ? "0" : "1");
      return !value;
    });
  }

  async function logout() {
    await auth.logout();
    notify.success("Вы вышли из аккаунта.");
    navigate("/");
  }

  return (
    <div className={`site-with-sidebar site-with-sidebar--left ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="site-sidebar site-sidebar--left" aria-label="Навигация сайта">
        <button className="sidebar-toggle" type="button" aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"} onClick={toggleCollapsed}>
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
        <Link className="sidebar-brand" to="/">
          <Compass size={22} />
          <span>GIDIX</span>
        </Link>
        <nav className="sidebar-nav">
          {publicItems.map((item) => <NavItem key={item.to} item={item} />)}
          {visibleStaffItems.map((item) => <NavItem key={item.to} item={item} />)}
          {!auth.user && <NavLink to="/login" title="Войти"><LogIn size={19} /><span className="nav-label">Войти</span></NavLink>}
          {auth.user && <NavLink to="/" title="Профиль"><UserRound size={19} /><span className="nav-label">Профиль</span></NavLink>}
        </nav>
        <div className="sidebar-footer">
            {auth.user ? (
              <div className="sidebar-user-footer">
                <span>{auth.user.full_name || auth.user.email}</span>
                <small>{roleTitle(primaryRole)}</small>
                <button className="button button--neutral" type="button" onClick={logout} title="Выйти"><LogOut size={17} /> <span>Выйти</span></button>
              </div>
            ) : (
              <Link className="button button--primary" to="/login"><LogIn size={17} /> <span>Войти</span></Link>
            )}
        </div>
      </aside>
      <main className="public-shell">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ item }) {
  const Icon = item.icon;
  return <NavLink to={item.to} end={item.end} title={item.label}><Icon size={19} /><span className="nav-label">{item.label}</span></NavLink>;
}
