import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import { assertEventSlug, assertEventWindow } from './event.rules';

describe('event.rules', () => {
  it('validates event window', () => {
    const start = new Date('2026-06-01T10:00:00Z');
    expect(() => assertEventWindow(start, new Date('2026-05-01T10:00:00Z'))).toThrow(DomainError);
    expect(() => assertEventWindow(start, new Date('2026-06-02T10:00:00Z'))).not.toThrow();
  });

  it('validates slug', () => {
    expect(assertEventSlug('AGM-2026')).toBe('agm-2026');
  });
});
