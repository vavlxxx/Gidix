import { Navigate, createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "../layouts/PublicLayout";
import { AdminLayout } from "../layouts/AdminLayout";
import { CatalogPage } from "../pages/public/CatalogPage";
import { ExcursionDetailPage } from "../pages/public/ExcursionDetailPage";
import { ProfilePage } from "../pages/public/ProfilePage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { BookingsPage } from "../pages/admin/BookingsPage";
import { SessionsPage } from "../pages/admin/SessionsPage";
import { UsersPage } from "../pages/admin/UsersPage";
import { PaymentsPage } from "../pages/admin/PaymentsPage";
import { GuideAssignmentsPage } from "../pages/admin/GuideAssignmentsPage";
import { ExcursionsPage } from "../pages/admin/ExcursionsPage";
import { ExcursionEditorPage } from "../pages/admin/ExcursionEditorPage";
import { RoutesPage } from "../pages/admin/RoutesPage";
import { RouteEditorPage } from "../pages/admin/RouteEditorPage";
import { PointsPage } from "../pages/admin/PointsPage";
import { ReviewsPage } from "../pages/admin/ReviewsPage";
import { IntegrationsPage } from "../pages/admin/IntegrationsPage";

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
      { path: "/profile", element: <ProfilePage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "bookings", element: <BookingsPage /> },
          { path: "payments", element: <PaymentsPage /> },
          { path: "my-sessions", element: <GuideAssignmentsPage /> },
          { path: "guide", element: <GuideAssignmentsPage /> },
          { path: "sessions", element: <SessionsPage /> },
          { path: "excursions", element: <ExcursionsPage /> },
          { path: "excursions/new", element: <ExcursionEditorPage /> },
          { path: "excursions/:id/edit", element: <ExcursionEditorPage /> },
          { path: "routes", element: <RoutesPage /> },
          { path: "routes/new", element: <RouteEditorPage mode="create" /> },
          { path: "routes/:id/edit", element: <RouteEditorPage mode="edit" /> },
          { path: "points", element: <PointsPage /> },
          { path: "reviews", element: <ReviewsPage /> },
          { path: "integrations", element: <IntegrationsPage /> },
          { path: "settings", element: <Navigate to="/admin" replace /> }
        ]
      }
    ]
  }
]);
