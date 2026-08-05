import { describe, expect, it } from 'vitest';
import { safeReturnUrl } from './api';
import { deriveShells, navFor } from './shells';
import { formatMoneyFromKobo } from './format';

describe('safeReturnUrl', () => {
  it('allows relative portal paths', () => {
    expect(safeReturnUrl('/member/profile', '/')).toBe('/member/profile');
  });

  it('rejects open redirects', () => {
    expect(safeReturnUrl('//evil.example', '/member')).toBe('/member');
    expect(safeReturnUrl('https://evil.example', '/member')).toBe('/member');
    expect(safeReturnUrl('http://evil.example/x', '/member')).toBe('/member');
  });
});

describe('deriveShells', () => {
  it('always includes member', () => {
    expect(deriveShells({ permissions: [], institutionCount: 0 })).toEqual(['member']);
  });

  it('adds institution when affiliated', () => {
    expect(deriveShells({ permissions: [], institutionCount: 2 })).toEqual([
      'member',
      'institution',
    ]);
  });

  it('grants admin from permissions only (not role names)', () => {
    expect(
      deriveShells({
        permissions: ['members.read'],
        institutionCount: 0,
      }),
    ).toContain('admin');
  });

  it('does not grant admin without permissions', () => {
    expect(deriveShells({ permissions: [], institutionCount: 0 })).not.toContain('admin');
  });
});

describe('navFor admin', () => {
  it('filters admin nav by permissions', () => {
    const items = navFor('admin', ['members.read']);
    expect(items.some((i) => i.to === '/admin/members')).toBe(true);
    expect(items.some((i) => i.to === '/admin/roles')).toBe(false);
    expect(items.some((i) => i.to === '/admin')).toBe(true);
  });
});

describe('formatMoneyFromKobo', () => {
  it('formats kobo strings', () => {
    expect(formatMoneyFromKobo('500000')).toMatch(/5,?000/);
  });
});
