import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTenant } from '../lib/tenant';

export function ForgotPasswordPage() {
  const { tenant } = useTenant();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/v1/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage('If that account exists, reset instructions were sent.');
    } catch (err) {
      setError((err as ApiError).message || 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__brand">{tenant?.organization.displayName ?? 'Portal'}</div>
        <p className="auth-card__sub">Request a password reset link.</p>
        <form className="form" onSubmit={onSubmit}>
          {error ? <div className="alert">{error}</div> : null}
          {message ? <div className="alert alert--ok">{message}</div> : null}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </label>
          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <div className="muted-links">
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const [token, setToken] = useState(
    () => new URLSearchParams(window.location.search).get('token') ?? '',
  );
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/v1/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      });
      setMessage('Password updated. You can sign in now.');
    } catch (err) {
      setError((err as ApiError).message || 'Reset failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__brand">Reset password</div>
        <form className="form" onSubmit={onSubmit}>
          {error ? <div className="alert">{error}</div> : null}
          {message ? <div className="alert alert--ok">{message}</div> : null}
          <label>
            Token
            <input value={token} onChange={(ev) => setToken(ev.target.value)} required />
          </label>
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              minLength={10}
              required
            />
          </label>
          <button className="btn btn--primary" type="submit" disabled={busy}>
            Update password
          </button>
        </form>
        <div className="muted-links">
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export function VerifyEmailPage() {
  const { accessToken } = useAuth();
  const [token, setToken] = useState(
    () => new URLSearchParams(window.location.search).get('token') ?? '',
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/v1/auth/email-verification/confirm', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      setMessage('Email verified.');
    } catch (err) {
      setError((err as ApiError).message || 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  async function requestLink() {
    if (!accessToken) {
      setError('Sign in first to request a verification email.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/v1/auth/email-verification/request', {
        method: 'POST',
        accessToken,
        body: '{}',
      });
      setMessage('Verification email requested.');
    } catch (err) {
      setError((err as ApiError).message || 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__brand">Verify email</div>
        <form className="form" onSubmit={confirm}>
          {error ? <div className="alert">{error}</div> : null}
          {message ? <div className="alert alert--ok">{message}</div> : null}
          <label>
            Token
            <input value={token} onChange={(ev) => setToken(ev.target.value)} required />
          </label>
          <button className="btn btn--primary" type="submit" disabled={busy}>
            Confirm verification
          </button>
          <button
            className="btn btn--ghost"
            type="button"
            disabled={busy}
            onClick={() => void requestLink()}
          >
            Request new link
          </button>
        </form>
        <div className="muted-links">
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
