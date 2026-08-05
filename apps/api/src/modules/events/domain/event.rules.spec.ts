import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import {
  assertCanRegister,
  assertEventSlug,
  assertEventWindow,
  assertHasCapacity,
} from './event.rules';

describe('event.rules', () => {
  it('validates event window', () => {
    const start = new Date('2026-06-01T10:00:00Z');
    expect(() => assertEventWindow(start, new Date('2026-05-01T10:00:00Z'))).toThrow(DomainError);
    expect(() => assertEventWindow(start, new Date('2026-06-02T10:00:00Z'))).not.toThrow();
  });

  it('validates slug', () => {
    expect(assertEventSlug('AGM-2026')).toBe('agm-2026');
  });

  it('rejects registration when not published', () => {
    expect(() =>
      assertCanRegister({
        status: 'draft',
        registrationOpensAt: null,
        registrationClosesAt: null,
        capacity: null,
      }),
    ).toThrow(DomainError);
  });

  it('enforces registration window', () => {
    const now = new Date('2026-06-15T12:00:00Z');
    expect(() =>
      assertCanRegister(
        {
          status: 'published',
          registrationOpensAt: '2026-06-20T00:00:00.000Z',
          registrationClosesAt: null,
          capacity: null,
        },
        now,
      ),
    ).toThrow(DomainError);
    expect(() =>
      assertCanRegister(
        {
          status: 'published',
          registrationOpensAt: null,
          registrationClosesAt: '2026-06-01T00:00:00.000Z',
          capacity: null,
        },
        now,
      ),
    ).toThrow(DomainError);
  });

  it('enforces capacity', () => {
    expect(() => assertHasCapacity(10, 10)).toThrow(DomainError);
    expect(() => assertHasCapacity(10, 9)).not.toThrow();
    expect(() => assertHasCapacity(null, 1000)).not.toThrow();
  });
});
