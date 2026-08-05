import { Link, NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTenant } from '../lib/tenant';
import { navFor, type ShellId } from '../lib/shells';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, user } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="boot">Loading session…</div>;
  if (!user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }
  if (user.mustResetPassword && !location.pathname.startsWith('/reset-password')) {
    return <Navigate to="/reset-password?forced=1" replace />;
  }
  if (
    !user.emailVerified &&
    !location.pathname.startsWith('/verify-email') &&
    !location.pathname.startsWith('/reset-password')
  ) {
    return <Navigate to="/verify-email?required=1" replace />;
  }
  return children;
}

export function ShellLayout({ shell }: { shell: ShellId }) {
  const { user, shells, permissions, logout } = useAuth();
  const { tenant } = useTenant();
  const nav = navFor(shell, permissions);

  if (!shells.includes(shell)) {
    return <Navigate to={`/${shells[0] ?? 'member'}`} replace />;
  }

  return (
    <div className="shell">
      <aside className="shell__nav">
        <div className="shell__brand">{tenant?.organization.displayName ?? 'Portal'}</div>
        <div className="shell__meta">{shell} shell</div>
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === `/${shell}`}>
            {item.label}
          </NavLink>
        ))}
      </aside>
      <div className="shell__main">
        <header className="topbar">
          <div className="shell-switcher" aria-label="Portal shells">
            {shells.map((id) => (
              <Link key={id} to={`/${id}`} aria-current={id === shell ? 'page' : undefined}>
                {id}
              </Link>
            ))}
          </div>
          <div className="topbar__user">
            {user?.email}{' '}
            <button className="btn btn--ghost" type="button" onClick={() => void logout()}>
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

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="placeholder">
      <div className="placeholder__eyebrow">Coming in a later slice</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
