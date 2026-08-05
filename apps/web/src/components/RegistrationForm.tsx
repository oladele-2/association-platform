import { useEffect, useMemo, useState } from 'react';
import { tenant } from '../config/tenant';

type Catalog = {
  membershipTypes: Array<{ id: string; code: string; name: string; isDefault: boolean }>;
  institutions: Array<{ id: string; name: string; code: string | null }>;
  fields: Array<{
    key: string;
    label: string;
    dataType: string;
    options: unknown;
    isRequired: boolean;
    sortOrder: number;
  }>;
};

type FormState = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  middleName: string;
  title: string;
  phone: string;
  sex: string;
  dateOfBirth: string;
  membershipTypeId: string;
  primaryInstitutionId: string;
  customFields: Record<string, string>;
  website: string;
};

const empty: FormState = {
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  middleName: '',
  title: '',
  phone: '',
  sex: '',
  dateOfBirth: '',
  membershipTypeId: '',
  primaryInstitutionId: '',
  customFields: {},
  website: '',
};

export default function RegistrationForm() {
  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${tenant.apiUrl.replace(/\/$/, '')}/v1/public/registration`, {
          headers: { 'X-Organization-Slug': tenant.slug },
        });
        if (!res.ok) throw new Error('Could not load registration options');
        const data = (await res.json()) as Catalog;
        setCatalog(data);
        const def = data.membershipTypes.find((t) => t.isDefault) ?? data.membershipTypes[0];
        if (def) setForm((f) => ({ ...f, membershipTypeId: def.id }));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load form');
      }
    })();
  }, []);

  const steps = useMemo(
    () => [
      { key: 'account', title: 'Account' },
      { key: 'profile', title: 'Profile' },
      { key: 'practice', title: 'Practice' },
      ...(catalog?.fields.length ? [{ key: 'extra', title: 'Additional' }] : []),
      { key: 'review', title: 'Review' },
    ],
    [catalog],
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateStep(): string | null {
    if (steps[step]?.key === 'account') {
      if (!form.email.trim()) return 'Email is required';
      if (form.password.length < 10) return 'Password must be at least 10 characters';
      if (form.password !== form.confirmPassword) return 'Passwords do not match';
    }
    if (steps[step]?.key === 'profile') {
      if (!form.firstName.trim() || !form.lastName.trim())
        return 'First and last name are required';
    }
    if (steps[step]?.key === 'extra' && catalog) {
      for (const field of catalog.fields) {
        if (field.isRequired && !String(form.customFields[field.key] ?? '').trim()) {
          return `${field.label} is required`;
        }
      }
    }
    return null;
  }

  function next() {
    const v = validateStep();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  async function submit() {
    const v = validateStep();
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${tenant.apiUrl.replace(/\/$/, '')}/v1/public/registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Slug': tenant.slug,
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          middleName: form.middleName.trim() || undefined,
          title: form.title.trim() || undefined,
          phone: form.phone.trim() || undefined,
          sex: form.sex || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          membershipTypeId: form.membershipTypeId || undefined,
          primaryInstitutionId: form.primaryInstitutionId || undefined,
          customFields: form.customFields,
          website: form.website,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const msg = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message || res.statusText;
        throw new Error(msg);
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="panel" style={{ padding: '1.5rem' }}>
        <h2>Welcome — you are registered</h2>
        <p>
          Your membership account is ready. Sign in on the portal or install the Android companion
          app.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <a className="btn btn--primary" href={tenant.portalUrl}>
            Open member portal
          </a>
          {tenant.androidAppUrl ? (
            <a className="btn" href={tenant.androidAppUrl}>
              Download Android app
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  if (!catalog && !error) return <p>Loading registration form…</p>;

  return (
    <div className="panel" style={{ padding: '1.5rem' }}>
      <ol
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', listStyle: 'none', padding: 0 }}
      >
        {steps.map((s, i) => (
          <li
            key={s.key}
            style={{ fontWeight: i === step ? 700 : 400, opacity: i === step ? 1 : 0.6 }}
          >
            {i + 1}. {s.title}
          </li>
        ))}
      </ol>
      {error ? (
        <p role="alert" style={{ color: 'var(--color-danger, #b00020)' }}>
          {error}
        </p>
      ) : null}

      {steps[step]?.key === 'account' ? (
        <div className="form" style={{ display: 'grid', gap: '0.75rem' }}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              required
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setField('confirmPassword', e.target.value)}
              required
            />
          </label>
          {/* Honeypot */}
          <label aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setField('website', e.target.value)}
            />
          </label>
        </div>
      ) : null}

      {steps[step]?.key === 'profile' ? (
        <div className="form" style={{ display: 'grid', gap: '0.75rem' }}>
          <label>
            Title
            <input value={form.title} onChange={(e) => setField('title', e.target.value)} />
          </label>
          <label>
            First name
            <input value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
          </label>
          <label>
            Middle name
            <input
              value={form.middleName}
              onChange={(e) => setField('middleName', e.target.value)}
            />
          </label>
          <label>
            Last name
            <input value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
          </label>
          <label>
            Sex
            <select value={form.sex} onChange={(e) => setField('sex', e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="unspecified">Unspecified</option>
            </select>
          </label>
          <label>
            Date of birth
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setField('dateOfBirth', e.target.value)}
            />
          </label>
        </div>
      ) : null}

      {steps[step]?.key === 'practice' && catalog ? (
        <div className="form" style={{ display: 'grid', gap: '0.75rem' }}>
          <label>
            Membership type
            <select
              value={form.membershipTypeId}
              onChange={(e) => setField('membershipTypeId', e.target.value)}
            >
              {catalog.membershipTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Primary institution
            <select
              value={form.primaryInstitutionId}
              onChange={(e) => setField('primaryInstitutionId', e.target.value)}
            >
              <option value="">Select…</option>
              {catalog.institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {steps[step]?.key === 'extra' && catalog ? (
        <div className="form" style={{ display: 'grid', gap: '0.75rem' }}>
          {catalog.fields.map((field) => (
            <label key={field.key}>
              {field.label}
              {field.isRequired ? ' *' : ''}
              <input
                value={form.customFields[field.key] ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    customFields: { ...f.customFields, [field.key]: e.target.value },
                  }))
                }
              />
            </label>
          ))}
        </div>
      ) : null}

      {steps[step]?.key === 'review' ? (
        <div>
          <p>
            <strong>
              {form.firstName} {form.lastName}
            </strong>
          </p>
          <p>{form.email}</p>
          <p className="muted">Submit to create your membership login.</p>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
        <button
          className="btn"
          type="button"
          disabled={step === 0 || busy}
          onClick={() => setStep((s) => s - 1)}
        >
          Back
        </button>
        {step < steps.length - 1 ? (
          <button className="btn btn--primary" type="button" disabled={busy} onClick={next}>
            Continue
          </button>
        ) : (
          <button
            className="btn btn--primary"
            type="button"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? 'Submitting…' : 'Complete registration'}
          </button>
        )}
      </div>
    </div>
  );
}
