import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, ShellLayout } from './components/ShellLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from './pages/AuthAuxPages';
import {
  AdminDashboard,
  InstitutionDashboard,
  MemberDashboard,
  adminPlaceholders,
  institutionPlaceholders,
  memberPlaceholders,
} from './pages/Dashboards';
import { useAuth, useDefaultShellPath } from './lib/auth';
import { useTenant } from './lib/tenant';

function HomeRedirect() {
  const path = useDefaultShellPath();
  return <Navigate to={path} replace />;
}

export function App() {
  const { ready: authReady } = useAuth();
  const { ready: tenantReady } = useTenant();

  if (!authReady || !tenantReady) {
    return <div className="boot">Starting portal…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route
        path="/member"
        element={
          <RequireAuth>
            <ShellLayout shell="member" />
          </RequireAuth>
        }
      >
        <Route index element={<MemberDashboard />} />
        {memberPlaceholders().map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>

      <Route
        path="/institution"
        element={
          <RequireAuth>
            <ShellLayout shell="institution" />
          </RequireAuth>
        }
      >
        <Route index element={<InstitutionDashboard />} />
        {institutionPlaceholders().map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>

      <Route
        path="/admin"
        element={
          <RequireAuth>
            <ShellLayout shell="admin" />
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboard />} />
        {adminPlaceholders().map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>

      <Route
        path="/"
        element={
          <RequireAuth>
            <HomeRedirect />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
