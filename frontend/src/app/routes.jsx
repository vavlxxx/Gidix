import { Navigate, createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "../layouts/PublicLayout";
import { AdminLayout } from "../layouts/AdminLayout";
import { CatalogPage } from "../pages/public/CatalogPage";
import { ExcursionDetailPage } from "../pages/public/ExcursionDetailPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { BookingsPage } from "../pages/admin/BookingsPage";
import { SessionsPage } from "../pages/admin/SessionsPage";
import { ExcursionEditorPage } from "../pages/admin/ExcursionEditorPage";
import { RoutesPage } from "../pages/admin/RoutesPage";
import { RouteEditorPage } from "../pages/admin/RouteEditorPage";
import { PointsPage } from "../pages/admin/PointsPage";
import { PlaceholderAdminPage } from "../pages/admin/PlaceholderAdminPage";

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <CatalogPage /> },
      { path: "/excursions", element: <CatalogPage /> },
      { path: "/map", element: <Navigate to="/" replace /> },
      { path: "/schedule", element: <Navigate to="/" replace /> },
      { path: "/dates", element: <Navigate to="/" replace /> },
      { path: "/how-it-works", element: <Navigate to="/" replace /> },
      { path: "/excursions/:id", element: <ExcursionDetailPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: "bookings", element: <BookingsPage /> },
          { path: "sessions", element: <SessionsPage /> },
          { path: "excursions", element: <Navigate to="/" replace /> },
          { path: "excursions/new", element: <ExcursionEditorPage /> },
          { path: "excursions/:id/edit", element: <ExcursionEditorPage /> },
          { path: "routes", element: <RoutesPage /> },
          { path: "routes/new", element: <RouteEditorPage mode="create" /> },
          { path: "routes/:id/edit", element: <RouteEditorPage mode="edit" /> },
          { path: "points", element: <PointsPage /> },
          { path: "reviews", element: <PlaceholderAdminPage title="Отзывы" description="Публикация и модерация отзывов после проведения экскурсий." /> },
          { path: "integrations", element: <Navigate to="/admin/routes" replace /> },
          { path: "settings", element: <Navigate to="/admin" replace /> }
        ]
      }
    ]
  }
]);
