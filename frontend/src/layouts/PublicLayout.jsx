import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Compass, LogIn, LogOut, Menu, UserRound, UserRoundCog } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export function PublicLayout() {
  const auth = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(() => localStorage.getItem("gidix_public_nav_collapsed") === "1");

  function toggleCollapsed() {
    setCollapsed((value) => {
      localStorage.setItem("gidix_public_nav_collapsed", value ? "0" : "1");
      return !value;
    });
  }

  async function logout() {
    await auth.logout();
    notify.success("Вы вышли из аккаунта.");
    navigate("/");
  }

  return (
    <div className={`site-with-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <main className="public-shell">
        <Outlet />
      </main>
      <aside className="site-sidebar site-sidebar--right" aria-label="Навигация сайта">
        <button className="sidebar-toggle" type="button" aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"} onClick={toggleCollapsed}>
          <Menu size={20} />
        </button>
        <Link className="sidebar-brand" to="/">
          <Compass size={22} />
          <span>GIDIX</span>
        </Link>
        <nav className="sidebar-nav">
          <NavLink to="/" end title="Экскурсии"><Compass size={19} /><span>Экскурсии</span></NavLink>
          {auth.isStaff && <NavLink to="/admin" title="Рабочий кабинет"><UserRoundCog size={19} /><span>Рабочий кабинет</span></NavLink>}
          {!auth.user && <NavLink to="/login" title="Войти"><LogIn size={19} /><span>Войти</span></NavLink>}
          {auth.user && <NavLink to="/" title="Профиль"><UserRound size={19} /><span>Профиль</span></NavLink>}
        </nav>
        <div className="sidebar-footer">
            {auth.user ? (
              <button className="button button--neutral" type="button" onClick={logout} title="Выйти"><LogOut size={17} /> <span>Выйти</span></button>
            ) : (
              <Link className="button button--primary" to="/login"><LogIn size={17} /> <span>Войти</span></Link>
            )}
        </div>
      </aside>
    </div>
  );
}
