import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RequirePermission } from "./components/RequirePermission";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ModerationQueuePage } from "./pages/ModerationQueuePage";
import { ManualReviewQueuePage } from "./pages/ManualReviewQueuePage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { DataErasurePage } from "./pages/DataErasurePage";
import { StaffListPage } from "./pages/StaffListPage";
import { StaffOnboardPage } from "./pages/StaffOnboardPage";
import { StaffDetailPage } from "./pages/StaffDetailPage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { RolesPage } from "./pages/RolesPage";
import { LocationsPage } from "./pages/LocationsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Outside AppLayout, same as /login - a forced password change is a pre-app gate, not a normal sidebar page. */}
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/moderation" element={<ModerationQueuePage />} />
            <Route path="/manual-review" element={<ManualReviewQueuePage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/data-erasure" element={<DataErasurePage />} />

            <Route
              path="/staff"
              element={
                <RequirePermission permission="staff.view">
                  <StaffListPage />
                </RequirePermission>
              }
            />
            <Route
              path="/staff/new"
              element={
                <RequirePermission permission="staff.create">
                  <StaffOnboardPage />
                </RequirePermission>
              }
            />
            <Route
              path="/staff/:id"
              element={
                <RequirePermission permission="staff.view">
                  <StaffDetailPage />
                </RequirePermission>
              }
            />
            <Route
              path="/departments"
              element={
                <RequirePermission permission="rbac.department.manage">
                  <DepartmentsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/roles"
              element={
                <RequirePermission permission="rbac.role.manage">
                  <RolesPage />
                </RequirePermission>
              }
            />
            <Route
              path="/locations"
              element={
                <RequirePermission permission="geo.state.manage">
                  <LocationsPage />
                </RequirePermission>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
