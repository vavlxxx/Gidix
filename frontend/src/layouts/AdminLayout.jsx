import { Link, NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { CalendarDays, CreditCard, Gauge, LifeBuoy, LogOut, Map, MapPin, MessageSquare, Route, Settings, Sparkles, Ticket } from "lucide-react";
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
  { to: "/admin/reviews", label: "Отзывы", icon: MessageSquare, roles: ["admin", "superuser", "manager"] },
  { to: "/admin/integrations", label: "Интеграции", icon: Sparkles, roles: ["admin", "superuser", "it_specialist", "manager"] },
  { to: "/admin/settings", label: "Настройки", icon: Settings, roles: ["admin", "superuser", "it_specialist"] }
];

export function AdminLayout() {
  const auth = useAuth();
  const notify = useToast();
  const navigate = useNavigate();

  if (!auth.ready) return <main className="admin-loading">Проверка сессии...</main>;
  if (!auth.user) return <Navigate to="/login" replace />;
  if (!auth.isStaff) return <Navigate to="/" replace />;

  const visible = navigation.filter((item) => userHasRole(auth.user, item.roles));
  const primaryRole = auth.user.roles?.[0];

  async function logout() {
    await auth.logout();
    notify.success("Вы вышли из рабочего кабинета.");
    navigate("/");
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/admin"><Map size={22} /> GIDIX</Link>
        <div className="staff-card">
          <strong>{auth.user.full_name || auth.user.email}</strong>
          <span>{roleTitle(primaryRole)}</span>
        </div>
        <nav className="admin-nav" aria-label="Навигация рабочего кабинета">
          {visible.map((item) => {
            const Icon = item.icon;
            return <NavLink key={item.to} to={item.to} end={item.to === "/admin"}><Icon size={18} /> {item.label}</NavLink>;
          })}
        </nav>
        <div className="admin-sidebar__footer">
          <Link to="/how-it-works"><LifeBuoy size={17} /> Как работает система</Link>
          <button type="button" onClick={logout}><LogOut size={17} /> Выйти</button>
        </div>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
