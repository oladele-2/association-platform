import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { isDomainVerified, mapDomainFromApi, type DomainView } from '../lib/domains';
import type { Org } from './OrganizationsPage';

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

type Subscription = {
  planCode: string;
  planName: string;
  status: string;
  trialEndsAt: string | null;
};

type OrgDetail = Org & {
  domains?: DomainView[];
  features?: Feature[];
  branding?: Branding | null;
  subscription?: Subscription | null;
};

const PURPOSES = ['web', 'portal', 'api'] as const;
const NEUTRAL_PRIMARY = '#2E5A88';
const NEUTRAL_SECONDARY = '#5C6B7A';

export function OrganizationDetailPage() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [domains, setDomains] = useState<DomainView[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hostname, setHostname] = useState('');
  const [purpose, setPurpose] = useState<(typeof PURPOSES)[number]>('web');
  const [primaryColor, setPrimaryColor] = useState(NEUTRAL_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(NEUTRAL_SECONDARY);
  const [emailFromName, setEmailFromName] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [lastVerificationToken, setLastVerificationToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!accessToken || !id) return;
    setError(null);
    try {
      const detail = await apiFetch<OrgDetail>(`/v1/platform/organizations/${id}`, {
        accessToken,
      });
      setOrg(detail);
      setDomains((detail.domains ?? []).map((d) => mapDomainFromApi(d as never)));
      setFeatures(detail.features ?? []);
      setSubscription(detail.subscription ?? null);
      const b = detail.branding;
      if (b) {
        setPrimaryColor(b.primaryColor || NEUTRAL_PRIMARY);
        setSecondaryColor(b.secondaryColor || NEUTRAL_SECONDARY);
        setEmailFromName(b.emailFromName || '');
        setEmailFromAddress(b.emailFromAddress || '');
      }
    } catch (err) {
      setOrg(null);
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
    setLastVerificationToken(null);
    try {
      const created = await apiFetch<Record<string, unknown>>(
        `/v1/platform/organizations/${id}/domains`,
        {
          method: 'POST',
          accessToken,
          body: JSON.stringify({
            hostname: hostname.trim().toLowerCase(),
            purpose,
            isPrimary: domains.length === 0,
          }),
        },
      );
      const mapped = mapDomainFromApi(created);
      setHostname('');
      setLastVerificationToken(mapped.verificationToken ?? null);
      setMessage(
        mapped.verificationToken
          ? 'Domain added. Share the verification token with the tenant for DNS TXT.'
          : 'Domain added.',
      );
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

  async function toggleFeature(featureKey: string, enabled: boolean) {
    if (!accessToken || !id) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/v1/platform/organizations/${id}/features`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ featureKey, enabled }),
      });
      setMessage(`Feature ${featureKey} ${enabled ? 'enabled' : 'disabled'}.`);
      await load();
    } catch (err) {
      setError((err as ApiError).message || 'Feature update failed');
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
          {subscription ? (
            <p className="muted">
              Plan {subscription.planName} ({subscription.planCode}) · {subscription.status}
              {subscription.trialEndsAt
                ? ` · trial ends ${subscription.trialEndsAt.slice(0, 10)}`
                : ''}
            </p>
          ) : null}
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
                  {isDomainVerified(d) ? ' · verified' : ' · unverified'}
                </div>
                {!isDomainVerified(d) && d.verificationToken ? (
                  <p className="muted" style={{ fontSize: '0.85rem' }}>
                    TXT token: <code>{d.verificationToken}</code>
                  </p>
                ) : null}
                {!isDomainVerified(d) ? (
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
          {lastVerificationToken ? (
            <div className="alert alert--ok" style={{ marginBottom: '0.75rem' }}>
              New domain verification token: <code>{lastVerificationToken}</code>
            </div>
          ) : null}
          <form className="form" onSubmit={addDomain}>
            <label>
              Hostname
              <input
                value={hostname}
                onChange={(ev) => setHostname(ev.target.value)}
                placeholder="www.example.org"
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
                <li key={f.featureKey} style={{ marginBottom: '0.5rem' }}>
                  {f.featureKey}: {f.enabled ? 'on' : 'off'}{' '}
                  <button
                    className="btn btn--ghost"
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleFeature(f.featureKey, !f.enabled)}
                  >
                    {f.enabled ? 'Disable' : 'Enable'}
                  </button>
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
              placeholder={NEUTRAL_PRIMARY}
            />
          </label>
          <label>
            Secondary color
            <input
              type="text"
              value={secondaryColor}
              onChange={(ev) => setSecondaryColor(ev.target.value)}
              placeholder={NEUTRAL_SECONDARY}
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
