import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth, hasRole, Role } from "./lib/auth";
import AppShell from "./components/AppShell";
import LoginPage from "./pages/auth/LoginPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import DevLoginPage from "./pages/auth/DevLoginPage";
import HomeDashboard from "./pages/home/HomeDashboard";
import EmployeesPage from "./pages/directory/EmployeesPage";
import DepartmentsPage from "./pages/directory/DepartmentsPage";
import LocationsPage from "./pages/directory/LocationsPage";
import AudiencesPage from "./pages/audiences/AudiencesPage";
import CampaignsPage from "./pages/campaigns/CampaignsPage";
import CampaignComposerPage from "./pages/campaigns/CampaignComposerPage";
import ApprovalsPage from "./pages/approvals/ApprovalsPage";
import ReportsDeliveryPage from "./pages/reports/ReportsDeliveryPage";
import ReportsCampaignPage from "./pages/reports/ReportsCampaignPage";
import ReportsRecipientsPage from "./pages/reports/ReportsRecipientsPage";
import SuppressionPage from "./pages/compliance/SuppressionPage";
import AuditLogsPage from "./pages/compliance/AuditLogsPage";
import SenderIdentitiesPage from "./pages/settings/SenderIdentitiesPage";
import SmtpAccountsPage from "./pages/settings/SmtpAccountsPage";
import PoliciesPage from "./pages/settings/PoliciesPage";
import UserAccessPage from "./pages/settings/UserAccessPage";

function RequireAuth({ roles }: { roles?: Role[] }) {
  const { token, user } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !hasRole(user, roles)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

function Shell() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dev" element={<DevLoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}> 
        <Route element={<Shell />}>
          <Route index element={<HomeDashboard />} />
          <Route path="/directory/employees" element={<EmployeesPage />} />
          <Route path="/directory/departments" element={<DepartmentsPage />} />
          <Route path="/directory/locations" element={<LocationsPage />} />
          <Route path="/audiences" element={<AudiencesPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/compose" element={<CampaignComposerPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/reports/delivery" element={<ReportsDeliveryPage />} />
          <Route path="/reports/analytics" element={<ReportsCampaignPage />} />
          <Route path="/reports/recipients" element={<ReportsRecipientsPage />} />
          <Route path="/compliance/suppression" element={<SuppressionPage />} />
          <Route path="/compliance/audit" element={<AuditLogsPage />} />
          <Route element={<RequireAuth roles={["SUPER_ADMIN", "HR_ADMIN"]} />}>
            <Route path="/settings/sender-identities" element={<SenderIdentitiesPage />} />
            <Route path="/settings/smtp-accounts" element={<SmtpAccountsPage />} />
            <Route path="/settings/policies" element={<PoliciesPage />} />
            <Route path="/settings/user-access" element={<UserAccessPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
