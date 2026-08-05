import { DomainError } from '@association/shared-kernel';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertCommitteeSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (normalized.length < 1 || normalized.length > 120 || !SLUG_RE.test(normalized)) {
    throw new DomainError('INVALID_SLUG', 'Invalid committee slug');
  }
  return normalized;
}
