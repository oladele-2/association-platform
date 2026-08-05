import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, resolveOrgSlug } from './api';

export type TenantPublic = {
  organization: {
    organizationId: string;
    slug: string;
    displayName: string;
  };
  branding: {
    primaryColor: string | null;
    secondaryColor: string | null;
  } | null;
  features: Array<{ featureKey: string; enabled: boolean }>;
};

type TenantContextValue = {
  ready: boolean;
  tenant: TenantPublic | null;
  error: string | null;
};

const TenantContext = createContext<TenantContextValue | null>(null);

/** Generic offline placeholder — never org-specific. */
const OFFLINE_FALLBACK: TenantPublic = {
  organization: {
    organizationId: 'offline',
    slug: 'local',
    displayName: 'Association Portal',
  },
  branding: {
    primaryColor: null,
    secondaryColor: null,
  },
  features: [],
};

export function TenantProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tenant, setTenant] = useState<TenantPublic | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const slug = resolveOrgSlug();
      if (
        !slug &&
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ) {
        setTenant(OFFLINE_FALLBACK);
        setError('Set VITE_ORG_SLUG for local development (required on localhost).');
        setReady(true);
        return;
      }

      try {
        const path = slug
          ? `/v1/tenancy/resolve?slug=${encodeURIComponent(slug)}`
          : '/v1/tenancy/resolve';
        const data = await apiFetch<TenantPublic>(path, { skipAuthRetry: true });
        setTenant(data);
        if (data.branding?.primaryColor) {
          document.documentElement.style.setProperty('--brand', data.branding.primaryColor);
          document.documentElement.style.setProperty('--brand-deep', data.branding.primaryColor);
        }
        if (data.branding?.secondaryColor) {
          document.documentElement.style.setProperty('--accent', data.branding.secondaryColor);
        }
        document.title = `${data.organization.displayName} · Portal`;
      } catch {
        setTenant(OFFLINE_FALLBACK);
        setError('Using offline portal shell (API unreachable).');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const value = useMemo(() => ({ ready, tenant, error }), [ready, tenant, error]);
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant outside TenantProvider');
  return ctx;
}
