const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export type ApiError = {
  status: number;
  message: string;
};

type AuthHooks = {
  getAccessToken: () => string | null;
  /** Refresh session; returns new access token or null. */
  refreshAccessToken: () => Promise<string | null>;
};

let authHooks: AuthHooks | null = null;
let refreshInFlight: Promise<string | null> | null = null;

/** Registered by AuthProvider for 401 refresh + retry. */
export function registerAuthHooks(hooks: AuthHooks | null) {
  authHooks = hooks;
}

/**
 * Org slug for `X-Organization-Slug`.
 * - Prefer `VITE_ORG_SLUG` (required on localhost).
 * - On real hosts, omit the header so the API can resolve by Host.
 */
export function resolveOrgSlug(): string | undefined {
  const fromEnv = (import.meta.env.VITE_ORG_SLUG as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return undefined;
    }
  }
  return undefined;
}

/** Local relative path only — rejects open redirects (`//`, absolute URLs). */
export function safeReturnUrl(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.includes('://')) return fallback;
  return value;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & {
    accessToken?: string | null;
    orgSlug?: string | null;
    /** Skip one-shot 401 refresh retry (used by refresh itself). */
    skipAuthRetry?: boolean;
  } = {},
): Promise<T> {
  const { accessToken, orgSlug, skipAuthRetry, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (!headers.has('Content-Type') && rest.body) {
    headers.set('Content-Type', 'application/json');
  }

  const slug = orgSlug === null ? undefined : (orgSlug ?? resolveOrgSlug());
  if (slug) headers.set('X-Organization-Slug', slug);

  const token = accessToken ?? authHooks?.getAccessToken() ?? null;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !skipAuthRetry && authHooks && !path.includes('/v1/auth/')) {
    const next = await refreshOnce();
    if (next) {
      return apiFetch<T>(path, { ...init, accessToken: next, skipAuthRetry: true });
    }
  }

  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(', ');
      else if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    const err: ApiError = { status: res.status, message };
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function refreshOnce(): Promise<string | null> {
  if (!authHooks) return null;
  if (!refreshInFlight) {
    refreshInFlight = authHooks.refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}
