import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogIn, LogOut, UserRoundCog } from "lucide-react";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export function PublicLayout() {
  const auth = useAuth();
  const notify = useToast();
  const navigate = useNavigate();

  async function logout() {
    await auth.logout();
    notify.success("Вы вышли из аккаунта.");
    navigate("/");
  }

  return (
    <>
      <header className="public-header">
        <div className="public-header__inner">
          <Link className="brand" to="/">GIDIX</Link>
          <nav className="public-nav" aria-label="Публичная навигация">
            <NavLink to="/" end>Экскурсии</NavLink>
            <NavLink to="/map">Карта маршрутов</NavLink>
            <NavLink to="/schedule">Расписание</NavLink>
            <NavLink to="/how-it-works">Как записаться</NavLink>
          </nav>
          <div className="header-actions">
            {auth.user ? (
              <>
                {auth.isStaff && <Button as="link" to="/admin" tone="primary"><UserRoundCog size={17} /> Рабочий кабинет</Button>}
                <button className="button button--neutral" type="button" onClick={logout}><LogOut size={17} /> Выйти</button>
              </>
            ) : (
              <Button as="link" to="/login" tone="neutral"><LogIn size={17} /> Войти</Button>
            )}
          </div>
        </div>
      </header>
      <main className="public-shell">
        <Outlet />
      </main>
    </>
  );
}
