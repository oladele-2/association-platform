import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import {
  assertHoneypotEmpty,
  assertRegistrationEmail,
  assertRegistrationPassword,
  RegistrationRateLimiter,
} from './registration.rules';

describe('registration.rules', () => {
  it('validates email and password', () => {
    expect(assertRegistrationEmail(' Doc@Example.com ')).toBe('doc@example.com');
    expect(() => assertRegistrationEmail('bad')).toThrow(DomainError);
    expect(() => assertRegistrationPassword('short')).toThrow(DomainError);
    expect(() => assertRegistrationPassword('longenough1')).not.toThrow();
  });

  it('rejects filled honeypot', () => {
    expect(() => assertHoneypotEmpty({ website: 'http://spam' })).toThrow(DomainError);
    expect(() => assertHoneypotEmpty({ website: '' })).not.toThrow();
  });

  it('rate limits', () => {
    const limiter = new RegistrationRateLimiter(2, 60_000);
    limiter.assertAllowed('a');
    limiter.assertAllowed('a');
    expect(() => limiter.assertAllowed('a')).toThrow(DomainError);
  });
});
