import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, user } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="boot">Loading…</div>;
  if (!user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }
  return children;
}

export function ShellLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="shell__nav">
        <div className="shell__brand">Ajir Platform</div>
        <NavLink to="/" end>
          Organizations
        </NavLink>
        <NavLink to="/provision">Provision</NavLink>
        <NavLink to="/plans">Plans</NavLink>
        <NavLink to="/users">Platform users</NavLink>
        <NavLink to="/health">Health</NavLink>
      </aside>
      <div>
        <header className="topbar">
          <strong>Operator console</strong>
          <div>
            <span className="muted">{user?.email}</span>{' '}
            <button className="btn btn--ghost" type="button" onClick={logout}>
              Log out
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
