import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import { assertCmePending, parseCompletedOn, parseCreditHours } from './cme.rules';

describe('cme.rules', () => {
  it('parses credit hours', () => {
    expect(parseCreditHours('3')).toBe('3.00');
    expect(parseCreditHours(1.5)).toBe('1.50');
  });

  it('rejects invalid credit hours', () => {
    expect(() => parseCreditHours(-1)).toThrow(DomainError);
    expect(() => parseCreditHours('nope')).toThrow(DomainError);
  });

  it('parses completedOn dates', () => {
    expect(parseCompletedOn('2026-01-15')?.toISOString()).toContain('2026-01-15');
  });

  it('rejects invalid completedOn', () => {
    expect(() => parseCompletedOn('not-a-date')).toThrow(DomainError);
  });

  it('blocks non-pending review', () => {
    expect(() => assertCmePending('approved')).toThrow(DomainError);
  });
});
