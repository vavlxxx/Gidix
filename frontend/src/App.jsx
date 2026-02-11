import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./context/AuthContext";
import AdminLayout from "./pages/AdminLayout";
import AdminBookings from "./pages/AdminBookings";
import AdminLogin from "./pages/AdminLogin";
import AdminRouteForm from "./pages/AdminRouteForm";
import AdminRoutes from "./pages/AdminRoutes";
import AdminUsers from "./pages/AdminUsers";
import Home from "./pages/Home";
import RouteDetail from "./pages/RouteDetail";

function RequireAuth({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="page"><p>Загрузка...</p></div>;
  }
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/route/:id" element={<RouteDetail />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="routes" replace />} />
        <Route path="routes" element={<AdminRoutes />} />
        <Route path="routes/new" element={<AdminRouteForm />} />
        <Route path="routes/:id" element={<AdminRouteForm />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
