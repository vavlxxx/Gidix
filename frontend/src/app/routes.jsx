import { Navigate, createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "../layouts/PublicLayout";
import { AdminLayout } from "../layouts/AdminLayout";
import { CatalogPage } from "../pages/public/CatalogPage";
import { ExcursionDetailPage } from "../pages/public/ExcursionDetailPage";
import { RoutesMapPage } from "../pages/public/RoutesMapPage";
import { SchedulePage } from "../pages/public/SchedulePage";
import { HowItWorksPage } from "../pages/public/HowItWorksPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { BookingsPage } from "../pages/admin/BookingsPage";
import { SessionsPage } from "../pages/admin/SessionsPage";
import { ExcursionsPage } from "../pages/admin/ExcursionsPage";
import { RoutesPage } from "../pages/admin/RoutesPage";
import { PointsPage } from "../pages/admin/PointsPage";
import { IntegrationsPage } from "../pages/admin/IntegrationsPage";
import { PlaceholderAdminPage } from "../pages/admin/PlaceholderAdminPage";

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <CatalogPage /> },
      { path: "/map", element: <RoutesMapPage /> },
      { path: "/schedule", element: <SchedulePage /> },
      { path: "/dates", element: <Navigate to="/schedule" replace /> },
      { path: "/how-it-works", element: <HowItWorksPage /> },
      { path: "/excursions/:id", element: <ExcursionDetailPage /> }
    ]
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "bookings", element: <BookingsPage /> },
      { path: "sessions", element: <SessionsPage /> },
      { path: "excursions", element: <ExcursionsPage /> },
      { path: "routes", element: <RoutesPage /> },
      { path: "points", element: <PointsPage /> },
      { path: "reviews", element: <PlaceholderAdminPage title="Отзывы" description="Публикация и модерация отзывов после проведения экскурсий." /> },
      { path: "integrations", element: <IntegrationsPage /> },
      { path: "settings", element: <PlaceholderAdminPage title="Настройки" description="Пользователи, роли и параметры автоматизированной информационной системы." /> }
    ]
  }
]);
