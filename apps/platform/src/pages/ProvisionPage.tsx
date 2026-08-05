import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Org } from './OrganizationsPage';

const ORG_TYPES = ['professional_association', 'alumni', 'ngo', 'society', 'other'] as const;

export function ProvisionPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [slug, setSlug] = useState('');
  const [legalName, setLegalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [orgType, setOrgType] = useState<(typeof ORG_TYPES)[number]>('professional_association');
  const [planCode, setPlanCode] = useState('starter');
  const [countryCode, setCountryCode] = useState('NG');
  const [timezone, setTimezone] = useState('Africa/Lagos');
  const [defaultCurrency, setDefaultCurrency] = useState('NGN');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    try {
      const org = await apiFetch<Org>('/v1/platform/organizations', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          legalName: legalName.trim(),
          displayName: displayName.trim(),
          orgType,
          planCode: planCode.trim() || 'starter',
          countryCode: countryCode.trim().toUpperCase() || 'NG',
          timezone: timezone.trim() || 'UTC',
          defaultCurrency: defaultCurrency.trim().toUpperCase() || 'NGN',
          trialDays: 30,
        }),
      });
      navigate(`/organizations/${org.id}`, { replace: true });
    } catch (err) {
      setError((err as ApiError).message || 'Provision failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Provision organization</h1>
      <p className="muted">
        Create a tenant shell. Domains and branding can be completed on the detail page.
      </p>
      <form className="form panel" onSubmit={onSubmit} style={{ maxWidth: '40rem' }}>
        {error ? <div className="alert">{error}</div> : null}
        <label>
          Slug
          <input
            value={slug}
            onChange={(ev) => setSlug(ev.target.value)}
            required
            pattern="[a-z0-9-]+"
            placeholder="acme-association"
          />
        </label>
        <label>
          Display name
          <input value={displayName} onChange={(ev) => setDisplayName(ev.target.value)} required />
        </label>
        <label>
          Legal name
          <input value={legalName} onChange={(ev) => setLegalName(ev.target.value)} required />
        </label>
        <label>
          Org type
          <select
            value={orgType}
            onChange={(ev) => setOrgType(ev.target.value as (typeof ORG_TYPES)[number])}
          >
            {ORG_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Plan code
          <input value={planCode} onChange={(ev) => setPlanCode(ev.target.value)} />
        </label>
        <label>
          Country code (ISO)
          <input
            value={countryCode}
            onChange={(ev) => setCountryCode(ev.target.value)}
            required
            maxLength={2}
            placeholder="NG"
          />
        </label>
        <label>
          Timezone
          <input
            value={timezone}
            onChange={(ev) => setTimezone(ev.target.value)}
            required
            placeholder="Africa/Lagos"
          />
        </label>
        <label>
          Default currency
          <input
            value={defaultCurrency}
            onChange={(ev) => setDefaultCurrency(ev.target.value)}
            required
            maxLength={3}
            placeholder="NGN"
          />
        </label>
        <div className="toolbar">
          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create organization'}
          </button>
          <Link className="btn btn--ghost" to="/">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
