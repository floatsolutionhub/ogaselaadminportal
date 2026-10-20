import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RequirePermission } from "./components/RequirePermission";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ModerationQueuePage } from "./pages/ModerationQueuePage";
import { AdApprovalsPage } from "./pages/AdApprovalsPage";
import { ManualReviewQueuePage } from "./pages/ManualReviewQueuePage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { DataErasurePage } from "./pages/DataErasurePage";
import { StaffListPage } from "./pages/StaffListPage";
import { UsersPage } from "./pages/UsersPage";
import { ChangeRequestsPage } from "./pages/ChangeRequestsPage";
import { InterestSignupsPage } from "./pages/InterestSignupsPage";
import { AdsPage } from "./pages/AdsPage";
import { AdDetailPage } from "./pages/AdDetailPage";
import { DisputesPage } from "./pages/DisputesPage";
import { RevenuePage } from "./pages/RevenuePage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { PricingSettingsPage } from "./pages/settings/PricingSettingsPage";
import { ApprovalsSettingsPage } from "./pages/settings/ApprovalsSettingsPage";
import { NotificationsSettingsPage } from "./pages/settings/NotificationsSettingsPage";
import { ChatSafetySettingsPage } from "./pages/settings/ChatSafetySettingsPage";
import { DisputeDetailPage } from "./pages/DisputeDetailPage";
import { OfficePickupsPage } from "./pages/OfficePickupsPage";
import { OfficePickupDetailPage } from "./pages/OfficePickupDetailPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { StaffOnboardPage } from "./pages/StaffOnboardPage";
import { StaffDetailPage } from "./pages/StaffDetailPage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { RolesPage } from "./pages/RolesPage";
import { LocationsPage } from "./pages/LocationsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { TestimonialsPage } from "./pages/TestimonialsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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
            <Route path="/ad-approvals" element={<AdApprovalsPage />} />
            <Route path="/manual-review" element={<ManualReviewQueuePage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/data-erasure" element={<DataErasurePage />} />

            <Route
              path="/ads"
              element={
                <RequirePermission permission="listings.view">
                  <AdsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/ads/:id"
              element={
                <RequirePermission permission="listings.view">
                  <AdDetailPage />
                </RequirePermission>
              }
            />
            <Route
              path="/settings"
              element={
                <RequirePermission requireSuperAdmin>
                  <SettingsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/settings/pricing"
              element={
                <RequirePermission requireSuperAdmin>
                  <PricingSettingsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/settings/approvals"
              element={
                <RequirePermission requireSuperAdmin>
                  <ApprovalsSettingsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/settings/notifications"
              element={
                <RequirePermission requireSuperAdmin>
                  <NotificationsSettingsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/settings/chat-safety"
              element={
                <RequirePermission requireSuperAdmin>
                  <ChatSafetySettingsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/revenue"
              element={
                <RequirePermission requireSuperAdmin>
                  <RevenuePage />
                </RequirePermission>
              }
            />
            <Route
              path="/disputes"
              element={
                <RequirePermission permission="disputes.view">
                  <DisputesPage />
                </RequirePermission>
              }
            />
            <Route
              path="/disputes/:id"
              element={
                <RequirePermission permission="disputes.view">
                  <DisputeDetailPage />
                </RequirePermission>
              }
            />
            <Route
              path="/office-pickups"
              element={
                <RequirePermission permission="officepickup.view">
                  <OfficePickupsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/office-pickups/:id"
              element={
                <RequirePermission permission="officepickup.view">
                  <OfficePickupDetailPage />
                </RequirePermission>
              }
            />
            <Route
              path="/users"
              element={
                <RequirePermission permission="users.view">
                  <UsersPage />
                </RequirePermission>
              }
            />
            <Route
              path="/change-requests"
              element={
                <RequirePermission permission="users.changes.review">
                  <ChangeRequestsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/waitlist"
              element={
                <RequirePermission permission="marketing.interest.view">
                  <InterestSignupsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/users/:id"
              element={
                <RequirePermission permission="users.view">
                  <UserDetailPage />
                </RequirePermission>
              }
            />
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
              path="/announcements"
              element={
                <RequirePermission requireSuperAdmin>
                  <AnnouncementsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/testimonials"
              element={
                <RequirePermission permission="marketing.testimonials.manage">
                  <TestimonialsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/categories"
              element={
                <RequirePermission requireSuperAdmin>
                  <CategoriesPage />
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
