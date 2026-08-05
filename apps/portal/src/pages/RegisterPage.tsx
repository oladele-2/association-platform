import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiFetch, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTenant } from '../lib/tenant';

type Catalog = {
  membershipTypes: Array<{ id: string; code: string; name: string; isDefault: boolean }>;
  institutions: Array<{ id: string; name: string; code: string | null }>;
  fields: Array<{
    key: string;
    label: string;
    dataType: string;
    isRequired: boolean;
  }>;
};

export function RegisterPage() {
  const { ready, user } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [sex, setSex] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [membershipTypeId, setMembershipTypeId] = useState('');
  const [primaryInstitutionId, setPrimaryInstitutionId] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [website, setWebsite] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<Catalog>('/v1/public/registration');
        setCatalog(data);
        const def = data.membershipTypes.find((t) => t.isDefault) ?? data.membershipTypes[0];
        if (def) setMembershipTypeId(def.id);
      } catch (err) {
        setError((err as ApiError).message || 'Could not load registration options');
      }
    })();
  }, []);

  if (ready && user) return <Navigate to="/" replace />;

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const customs: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(customFields)) {
        if (v.trim()) customs[k] = v.trim();
      }
      await apiFetch('/v1/public/registration', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          phone: phone || undefined,
          sex: sex || undefined,
          dateOfBirth: dateOfBirth || undefined,
          membershipTypeId: membershipTypeId || undefined,
          primaryInstitutionId: primaryInstitutionId || undefined,
          customFields: Object.keys(customs).length ? customs : undefined,
          website,
        }),
      });
      setDone(true);
    } catch (err) {
      setError((err as ApiError).message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-card__brand">Congratulations</div>
          <p>Your account is ready. Sign in to continue, or install the Android app.</p>
          <div className="toolbar">
            <button className="btn btn--primary" type="button" onClick={() => navigate('/login')}>
              Sign in
            </button>
            {import.meta.env.VITE_ANDROID_APP_URL ? (
              <a className="btn btn--ghost" href={String(import.meta.env.VITE_ANDROID_APP_URL)}>
                Download Android app
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__brand">
          {tenant?.organization.displayName ?? 'Association Portal'}
        </div>
        <p className="auth-card__sub">Create your member account.</p>
        <form className="form" onSubmit={onSubmit}>
          {error ? <div className="alert">{error}</div> : null}
          <label>
            First name
            <input value={firstName} onChange={(ev) => setFirstName(ev.target.value)} required />
          </label>
          <label>
            Last name
            <input value={lastName} onChange={(ev) => setLastName(ev.target.value)} required />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Phone
            <input value={phone} onChange={(ev) => setPhone(ev.target.value)} />
          </label>
          <label>
            Date of birth
            <input
              type="date"
              value={dateOfBirth}
              onChange={(ev) => setDateOfBirth(ev.target.value)}
            />
          </label>
          <label>
            Sex
            <select value={sex} onChange={(ev) => setSex(ev.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="unspecified">Unspecified</option>
            </select>
          </label>
          <label>
            Membership type
            <select
              value={membershipTypeId}
              onChange={(ev) => setMembershipTypeId(ev.target.value)}
              required={Boolean(catalog?.membershipTypes.length)}
            >
              {(catalog?.membershipTypes ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          {(catalog?.institutions.length ?? 0) > 0 ? (
            <label>
              Institution
              <select
                value={primaryInstitutionId}
                onChange={(ev) => setPrimaryInstitutionId(ev.target.value)}
              >
                <option value="">Select…</option>
                {catalog!.institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {(catalog?.fields ?? []).map((f) => (
            <label key={f.key}>
              {f.label}
              {f.isRequired ? ' *' : ''}
              <input
                value={customFields[f.key] ?? ''}
                required={f.isRequired}
                onChange={(ev) =>
                  setCustomFields((prev) => ({ ...prev, [f.key]: ev.target.value }))
                }
              />
            </label>
          ))}
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </label>
          <label aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(ev) => setWebsite(ev.target.value)}
            />
          </label>
          <button className="btn btn--primary" type="submit" disabled={busy || !catalog}>
            {busy ? 'Creating…' : 'Register'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: '1rem' }}>
          Prefer the guided multi-step form?{' '}
          <a href={import.meta.env.VITE_PUBLIC_WEB_URL ?? 'http://localhost:4321/register'}>
            Register on the website
          </a>
        </p>
        <p>
          <Link to="/login">Already have an account? Sign in</Link>
        </p>
      </div>
    </div>
  );
}
