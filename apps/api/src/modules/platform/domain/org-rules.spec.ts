import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import { assertOptionalHexColor, assertValidHostname, assertValidSlug } from './org-rules';
import { DEFAULT_FEATURE_FLAGS } from './feature-catalog';

describe('org-rules', () => {
  it('accepts valid slugs', () => {
    expect(assertValidSlug('nma-ogun')).toBe('nma-ogun');
  });

  it('rejects invalid slugs', () => {
    expect(() => assertValidSlug('NMA Ogun')).toThrow(DomainError);
    expect(() => assertValidSlug('a')).toThrow(DomainError);
    expect(() => assertValidSlug('-leading')).toThrow(DomainError);
  });

  it('accepts hostnames and localhost', () => {
    expect(assertValidHostname('portal.example.org')).toBe('portal.example.org');
    expect(assertValidHostname('localhost')).toBe('localhost');
  });

  it('validates hex colors', () => {
    expect(assertOptionalHexColor('#0B3D91')).toBe('#0B3D91');
    expect(assertOptionalHexColor(null)).toBeNull();
    expect(() => assertOptionalHexColor('blue')).toThrow(DomainError);
  });
});

describe('feature catalog', () => {
  it('seeds core features enabled by default', () => {
    const members = DEFAULT_FEATURE_FLAGS.find((f) => f.key === 'members');
    expect(members?.enabled).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.some((f) => f.key === 'cme' && !f.enabled)).toBe(true);
  });
});
