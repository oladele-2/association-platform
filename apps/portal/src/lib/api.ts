const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export const ORG_SLUG = (import.meta.env.VITE_ORG_SLUG as string | undefined)?.trim() || 'nma-ogun';

export type ApiError = {
  status: number;
  message: string;
};

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { accessToken?: string | null; orgSlug?: string } = {},
): Promise<T> {
  const { accessToken, orgSlug = ORG_SLUG, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (!headers.has('Content-Type') && rest.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (orgSlug) headers.set('X-Organization-Slug', orgSlug);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    credentials: 'include',
  });

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
