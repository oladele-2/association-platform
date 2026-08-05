import { DomainError } from '@association/shared-kernel';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertValidSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (normalized.length < 2 || normalized.length > 64 || !SLUG_RE.test(normalized)) {
    throw new DomainError(
      'INVALID_SLUG',
      'Slug must be 2–64 chars: lowercase letters, numbers, and hyphens',
    );
  }
  return normalized;
}

export function assertValidHostname(hostname: string): string {
  const host = hostname.trim().toLowerCase().split(':')[0] ?? '';
  if (!host || host.includes(' ') || !host.includes('.')) {
    // allow localhost for local mapping
    if (host === 'localhost') return host;
    throw new DomainError('INVALID_HOSTNAME', 'Hostname must be a valid DNS name');
  }
  return host;
}

const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function assertOptionalHexColor(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  if (!COLOR_RE.test(value)) {
    throw new DomainError('INVALID_COLOR', 'Color must be #RGB or #RRGGBB');
  }
  return value;
}
