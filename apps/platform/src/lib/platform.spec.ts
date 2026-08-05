import { describe, expect, it } from 'vitest';
import { safeReturnUrl } from './api';
import { normalizePlatformUser } from './auth';
import { isDomainVerified, mapDomainFromApi } from './domains';

describe('safeReturnUrl', () => {
  it('allows relative paths', () => {
    expect(safeReturnUrl('/organizations/abc', '/')).toBe('/organizations/abc');
  });

  it('rejects open redirects', () => {
    expect(safeReturnUrl('//evil.example', '/')).toBe('/');
    expect(safeReturnUrl('https://evil.example', '/')).toBe('/');
    expect(safeReturnUrl('http://evil.example/x', '/')).toBe('/');
  });
});

describe('normalizePlatformUser', () => {
  it('maps login id shape', () => {
    expect(normalizePlatformUser({ id: 'op1', email: 'a@b.c' })).toEqual({
      id: 'op1',
      email: 'a@b.c',
      roles: undefined,
    });
  });

  it('maps /me userId shape', () => {
    expect(normalizePlatformUser({ userId: 'op2', email: 'x@y.z', roles: ['owner'] })).toEqual({
      id: 'op2',
      email: 'x@y.z',
      roles: ['owner'],
    });
  });
});

describe('domain verification', () => {
  it('treats verifiedAt as source of truth', () => {
    expect(isDomainVerified({ id: '1', hostname: 'a.com', verifiedAt: null })).toBe(false);
    expect(
      isDomainVerified({
        id: '1',
        hostname: 'a.com',
        verifiedAt: '2030-01-01T00:00:00.000Z',
      }),
    ).toBe(true);
    expect(
      isDomainVerified({ id: '1', hostname: 'a.com', isVerified: true, verifiedAt: null }),
    ).toBe(false);
  });

  it('maps API domain payload', () => {
    const d = mapDomainFromApi({
      id: 'd1',
      hostname: 'www.example.org',
      purpose: 'web',
      isPrimary: true,
      verifiedAt: null,
      verificationToken: 'tok',
    });
    expect(d.verificationToken).toBe('tok');
    expect(isDomainVerified(d)).toBe(false);
  });
});
