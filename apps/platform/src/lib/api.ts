const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export type ApiError = { status: number; message: string };

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** Register a handler invoked when an authenticated request returns 401. */
export function setOnUnauthorized(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
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
  init: RequestInit & { accessToken?: string | null } = {},
): Promise<T> {
  const { accessToken, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (!headers.has('Content-Type') && rest.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });
  if (!res.ok) {
    if (res.status === 401 && accessToken) {
      onUnauthorized?.();
    }
    let message = res.statusText || 'Request failed';
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(', ');
      else if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw { status: res.status, message } satisfies ApiError;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
