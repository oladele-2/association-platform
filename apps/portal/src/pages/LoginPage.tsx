import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, useDefaultShellPath } from '../lib/auth';
import { useTenant } from '../lib/tenant';
import type { ApiError } from '../lib/api';

export function LoginPage() {
  const { ready, user, login } = useAuth();
  const { tenant } = useTenant();
  const defaultPath = useDefaultShellPath();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (ready && user) {
    const returnUrl = params.get('returnUrl');
    return <Navigate to={returnUrl || defaultPath} replace />;
  }

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      const returnUrl = params.get('returnUrl');
      navigate(returnUrl || '/', { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__brand">
          {tenant?.organization.displayName ?? 'Association Portal'}
        </div>
        <p className="auth-card__sub">Sign in to your member, institution, or admin shell.</p>
        <form className="form" onSubmit={onSubmit}>
          {error ? <div className="alert">{error}</div> : null}
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
            />
          </label>
          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="muted-links">
          <Link to="/forgot-password">Forgot password</Link>
          <Link to="/verify-email">Verify email</Link>
        </div>
      </div>
    </div>
  );
}
