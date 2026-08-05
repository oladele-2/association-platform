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

export type RegistrationEventSnapshot = {
  status: EventStatus;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  capacity: number | null;
};

export function assertCanRegister(event: RegistrationEventSnapshot, now = new Date()): void {
  if (event.status !== 'published') {
    throw new DomainError('EVENT_NOT_PUBLISHED', 'Only published events accept registration');
  }
  if (event.registrationOpensAt) {
    const opens = new Date(event.registrationOpensAt);
    if (now.getTime() < opens.getTime()) {
      throw new DomainError('REGISTRATION_NOT_OPEN', 'Registration has not opened yet');
    }
  }
  if (event.registrationClosesAt) {
    const closes = new Date(event.registrationClosesAt);
    if (now.getTime() > closes.getTime()) {
      throw new DomainError('REGISTRATION_CLOSED', 'Registration is closed');
    }
  }
}

export function assertHasCapacity(capacity: number | null, activeCount: number): void {
  if (capacity != null && activeCount >= capacity) {
    throw new DomainError('EVENT_FULL', 'Event is at capacity');
  }
}
