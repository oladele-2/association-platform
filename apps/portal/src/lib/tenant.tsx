import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, ORG_SLUG } from './api';

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

const FALLBACK: TenantPublic = {
  organization: {
    organizationId: 'local',
    slug: ORG_SLUG,
    displayName: 'NMA Ogun State',
  },
  branding: {
    primaryColor: '#0b6b3a',
    secondaryColor: '#c8102e',
  },
  features: [],
};

export function TenantProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tenant, setTenant] = useState<TenantPublic | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<TenantPublic>(
          `/v1/tenancy/resolve?slug=${encodeURIComponent(ORG_SLUG)}`,
        );
        setTenant(data);
        const primary = data.branding?.primaryColor ?? '#0b6b3a';
        const secondary = data.branding?.secondaryColor ?? '#c8102e';
        document.documentElement.style.setProperty('--brand', primary);
        document.documentElement.style.setProperty('--brand-deep', primary);
        document.documentElement.style.setProperty('--accent', secondary);
        document.title = `${data.organization.displayName} · Portal`;
      } catch {
        setTenant(FALLBACK);
        setError('Using offline branding defaults (API unreachable).');
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
