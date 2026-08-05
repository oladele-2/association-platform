import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { safeReturnUrl, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const { ready, user, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const returnUrl = safeReturnUrl(params.get('returnUrl'), '/');

  if (ready && user) {
    return <Navigate to={returnUrl} replace />;
  }

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(returnUrl, { replace: true });
    } catch (err) {
      setError((err as ApiError).message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__brand">Ajir Platform</div>
        <p className="auth-card__sub">Operator sign-in for multi-tenant administration.</p>
        <form className="form" onSubmit={onSubmit}>
          {error ? <div className="alert">{error}</div> : null}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        {import.meta.env.DEV ? (
          <p className="muted" style={{ marginTop: '1rem', fontSize: '0.88rem' }}>
            First user: <code>POST /v1/platform/auth/bootstrap</code> with{' '}
            <code>PLATFORM_BOOTSTRAP_SECRET</code>.
          </p>
        ) : null}
        <p>
          <Link to="/">Back</Link>
        </p>
      </div>
    </div>
  );
}
