import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Org } from './OrganizationsPage';

type Domain = {
  id: string;
  hostname: string;
  purpose?: string;
  isVerified?: boolean;
  isPrimary?: boolean;
  verificationToken?: string | null;
};

type Feature = {
  featureKey: string;
  enabled: boolean;
};

type Branding = {
  primaryColor: string | null;
  secondaryColor: string | null;
  emailFromName: string | null;
  emailFromAddress: string | null;
};

const PURPOSES = ['web', 'portal', 'api'] as const;

export function OrganizationDetailPage() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [hostname, setHostname] = useState('');
  const [purpose, setPurpose] = useState<(typeof PURPOSES)[number]>('web');
  const [primaryColor, setPrimaryColor] = useState('#0b6b3a');
  const [secondaryColor, setSecondaryColor] = useState('#c8102e');
  const [emailFromName, setEmailFromName] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!accessToken || !id) return;
    setError(null);
    try {
      const [o, d, f, b] = await Promise.all([
        apiFetch<Org>(`/v1/platform/organizations/${id}`, { accessToken }),
        apiFetch<Domain[] | { items?: Domain[] }>(`/v1/platform/organizations/${id}/domains`, {
          accessToken,
        }).catch(() => [] as Domain[]),
        apiFetch<Feature[] | { items?: Feature[] }>(`/v1/platform/organizations/${id}/features`, {
          accessToken,
        }).catch(() => [] as Feature[]),
        apiFetch<Branding | null>(`/v1/platform/organizations/${id}/branding`, {
          accessToken,
        }).catch(() => null),
      ]);
      setOrg(o);
      setDomains(Array.isArray(d) ? d : (d.items ?? []));
      setFeatures(Array.isArray(f) ? f : (f.items ?? []));
      if (b) {
        setPrimaryColor(b.primaryColor || '#0b6b3a');
        setSecondaryColor(b.secondaryColor || '#c8102e');
        setEmailFromName(b.emailFromName || '');
        setEmailFromAddress(b.emailFromAddress || '');
      }
    } catch (err) {
      setError((err as ApiError).message || 'Failed to load organization');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, id]);

  async function activate() {
    if (!accessToken || !id) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch(`/v1/platform/organizations/${id}/activate`, {
        method: 'POST',
        accessToken,
        body: '{}',
      });
      setMessage('Organization activated.');
      await load();
    } catch (err) {
      setError((err as ApiError).message || 'Activate failed');
    } finally {
      setBusy(false);
    }
  }

  async function addDomain(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!accessToken || !id || !hostname.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/v1/platform/organizations/${id}/domains`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          hostname: hostname.trim().toLowerCase(),
          purpose,
          isPrimary: domains.length === 0,
        }),
      });
      setHostname('');
      setMessage('Domain added.');
      await load();
    } catch (err) {
      setError((err as ApiError).message || 'Add domain failed');
    } finally {
      setBusy(false);
    }
  }

  async function verifyDomain(domainId: string) {
    if (!accessToken || !id) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/v1/platform/organizations/${id}/domains/${domainId}/verify`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ force: true }),
      });
      setMessage('Domain force-verified.');
      await load();
    } catch (err) {
      setError((err as ApiError).message || 'Verify failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveBranding(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!accessToken || !id) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/v1/platform/organizations/${id}/branding`, {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({
          primaryColor: primaryColor.trim() || null,
          secondaryColor: secondaryColor.trim() || null,
          emailFromName: emailFromName.trim() || null,
          emailFromAddress: emailFromAddress.trim() || null,
        }),
      });
      setMessage('Branding saved.');
      await load();
    } catch (err) {
      setError((err as ApiError).message || 'Branding save failed');
    } finally {
      setBusy(false);
    }
  }

  if (!org && !error) return <p>Loading…</p>;

  return (
    <div>
      <p>
        <Link to="/">← Organizations</Link>
      </p>
      <h1>{org?.displayName ?? 'Organization'}</h1>
      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="alert alert--ok">{message}</div> : null}

      {org ? (
        <div className="panel" style={{ marginBottom: '1.25rem' }}>
          <p>
            <strong>{org.legalName}</strong>
          </p>
          <p className="muted">
            {org.slug} · {org.orgType} · {org.status}
          </p>
          <div className="toolbar">
            {org.status !== 'active' ? (
              <button
                className="btn btn--primary"
                type="button"
                disabled={busy}
                onClick={() => void activate()}
              >
                Activate
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid-2">
        <section className="panel">
          <h2>Domains</h2>
          {domains.length === 0 ? <p className="muted">No domains yet.</p> : null}
          <ul>
            {domains.map((d) => (
              <li key={d.id} style={{ marginBottom: '0.75rem' }}>
                <div>
                  {d.hostname} ({d.purpose ?? 'web'})
                  {d.isVerified ? ' · verified' : ' · unverified'}
                </div>
                {!d.isVerified ? (
                  <button
                    className="btn btn--ghost"
                    type="button"
                    disabled={busy}
                    onClick={() => void verifyDomain(d.id)}
                  >
                    Force verify
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <form className="form" onSubmit={addDomain}>
            <label>
              Hostname
              <input
                value={hostname}
                onChange={(ev) => setHostname(ev.target.value)}
                placeholder="nmaogun.com.ng"
                required
              />
            </label>
            <label>
              Purpose
              <select
                value={purpose}
                onChange={(ev) => setPurpose(ev.target.value as (typeof PURPOSES)[number])}
              >
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn--primary" type="submit" disabled={busy}>
              Add domain
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Features</h2>
          {features.length === 0 ? (
            <p className="muted">No feature rows (defaults may apply on activate).</p>
          ) : (
            <ul>
              {features.map((f) => (
                <li key={f.featureKey}>
                  {f.featureKey}: {f.enabled ? 'on' : 'off'}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel" style={{ marginTop: '1.25rem' }}>
        <h2>Branding</h2>
        <form className="form" onSubmit={saveBranding} style={{ maxWidth: '32rem' }}>
          <label>
            Primary color
            <input
              type="text"
              value={primaryColor}
              onChange={(ev) => setPrimaryColor(ev.target.value)}
              placeholder="#0b6b3a"
            />
          </label>
          <label>
            Secondary color
            <input
              type="text"
              value={secondaryColor}
              onChange={(ev) => setSecondaryColor(ev.target.value)}
              placeholder="#c8102e"
            />
          </label>
          <label>
            Email from name
            <input value={emailFromName} onChange={(ev) => setEmailFromName(ev.target.value)} />
          </label>
          <label>
            Email from address
            <input
              type="email"
              value={emailFromAddress}
              onChange={(ev) => setEmailFromAddress(ev.target.value)}
            />
          </label>
          <button className="btn btn--primary" type="submit" disabled={busy}>
            Save branding
          </button>
        </form>
      </section>
    </div>
  );
}
