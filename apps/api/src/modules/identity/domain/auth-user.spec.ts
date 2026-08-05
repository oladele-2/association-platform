import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import { AuthUser } from './auth-user';
import { CredentialsPolicy } from './credentials.policy';
import { generateOpaqueToken, hashOpaqueToken } from './token-crypto';

describe('AuthUser', () => {
  const base = {
    id: 'u1',
    organizationId: 'o1',
    email: 'A@Example.COM',
    passwordHash: 'hash',
    status: 'active' as const,
    emailVerifiedAt: null as Date | null,
    mustResetPassword: false,
  };

  it('normalizes email to lowercase', () => {
    expect(AuthUser.restore(base).email).toBe('a@example.com');
  });

  it('blocks disabled users from login', () => {
    const user = AuthUser.restore({ ...base, status: 'disabled' });
    expect(() => user.assertCanLogin()).toThrow(DomainError);
  });

  it('marks email verified and activates invited users', () => {
    const invited = AuthUser.restore({ ...base, status: 'invited' });
    const verified = invited.withEmailVerified(new Date('2026-01-01T00:00:00Z'));
    expect(verified.isEmailVerified).toBe(true);
    expect(verified.status).toBe('active');
  });
});

describe('CredentialsPolicy', () => {
  const policy = new CredentialsPolicy();

  it('rejects weak passwords', () => {
    expect(() => policy.assertPasswordStrength('short')).toThrow(DomainError);
    try {
      policy.assertPasswordStrength('short');
    } catch (e) {
      expect((e as DomainError).code).toBe('WEAK_PASSWORD');
    }
  });

  it('rejects invalid credentials without leaking which failed', () => {
    expect(() => policy.assertCredentialsMatch(null, false)).toThrow(DomainError);
    try {
      policy.assertCredentialsMatch(null, false);
    } catch (e) {
      expect((e as DomainError).code).toBe('INVALID_CREDENTIALS');
    }
  });
});

describe('token crypto', () => {
  it('hashes tokens deterministically', () => {
    const raw = generateOpaqueToken();
    expect(hashOpaqueToken(raw)).toBe(hashOpaqueToken(raw));
    expect(hashOpaqueToken(raw)).not.toBe(raw);
  });
});
