import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AdminLayout() {
  const auth = useAuth();

  if (!auth.ready) return <main className="admin-loading">Проверка сессии...</main>;
  if (!auth.user) return <Navigate to="/login" replace />;
  if (!auth.isStaff) return <Navigate to="/" replace />;

  return <Outlet />;
}
