import { DomainError } from '@association/shared-kernel';

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertEventSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (normalized.length < 1 || normalized.length > 120 || !SLUG_RE.test(normalized)) {
    throw new DomainError('INVALID_SLUG', 'Invalid event slug');
  }
  return normalized;
}

export function assertEventWindow(startsAt: Date, endsAt: Date | null | undefined): void {
  if (endsAt && endsAt.getTime() < startsAt.getTime()) {
    throw new DomainError('INVALID_EVENT_WINDOW', 'endsAt must be after startsAt');
  }
}
