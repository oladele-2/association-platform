import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, ShellLayout } from './components/ShellLayout';
import { useAuth } from './lib/auth';
import { LoginPage } from './pages/LoginPage';
import { OrganizationDetailPage } from './pages/OrganizationDetailPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ProvisionPage } from './pages/ProvisionPage';

export function App() {
  const { ready } = useAuth();
  if (!ready) return <div className="boot">Starting operator console…</div>;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <ShellLayout />
          </RequireAuth>
        }
      >
        <Route index element={<OrganizationsPage />} />
        <Route path="provision" element={<ProvisionPage />} />
        <Route path="organizations/:id" element={<OrganizationDetailPage />} />
        <Route
          path="plans"
          element={
            <PlaceholderPage
              title="Plans & Subscriptions"
              description="API routes for plans are not built yet (spec P-05)."
            />
          }
        />
        <Route
          path="users"
          element={
            <PlaceholderPage
              title="Platform users"
              description="Beyond bootstrap, platform user CRUD is deferred."
            />
          }
        />
        <Route
          path="health"
          element={
            <PlaceholderPage
              title="System health"
              description="Optional Phase 1 surface — hook to /v1/health later."
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
