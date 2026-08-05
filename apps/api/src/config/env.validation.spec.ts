import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgresql://association:association@localhost:5432/association_platform',
  JWT_ACCESS_SECRET: 'test-access-secret-32chars!!',
  JWT_REFRESH_SECRET: 'test-refresh-secret-32chars!',
};

describe('validateEnv', () => {
  it('accepts minimal valid configuration', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL_UNPOOLED).toContain('association_platform');
    expect(env.JWT_ACCESS_TTL_SECONDS).toBe(900);
  });

  it('rejects missing DATABASE_URL', () => {
    expect(() =>
      validateEnv({
        JWT_ACCESS_SECRET: base.JWT_ACCESS_SECRET,
        JWT_REFRESH_SECRET: base.JWT_REFRESH_SECRET,
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('rejects short JWT secrets', () => {
    expect(() =>
      validateEnv({
        ...base,
        JWT_ACCESS_SECRET: 'short',
      }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects short PLATFORM_BOOTSTRAP_SECRET when set', () => {
    expect(() =>
      validateEnv({
        ...base,
        PLATFORM_BOOTSTRAP_SECRET: 'too-short',
      }),
    ).toThrow(/PLATFORM_BOOTSTRAP_SECRET/);
  });

  it('rejects partial R2 configuration', () => {
    expect(() =>
      validateEnv({
        ...base,
        R2_ACCOUNT_ID: 'acct',
        R2_BUCKET: 'bucket',
      }),
    ).toThrow(/Partial R2/);
  });

  it('requires R2 or ALLOW_MOCK_STORAGE in production', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        ALLOW_MOCK_PAYSTACK: 'true',
        ALLOW_MOCK_EMAIL: 'true',
        ALLOW_MOCK_PUSH: 'true',
      }),
    ).toThrow(/ALLOW_MOCK_STORAGE/);
  });

  it('requires PAYSTACK_SECRET_KEY or ALLOW_MOCK_PAYSTACK in production', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        ALLOW_MOCK_STORAGE: 'true',
        ALLOW_MOCK_EMAIL: 'true',
        ALLOW_MOCK_PUSH: 'true',
      }),
    ).toThrow(/ALLOW_MOCK_PAYSTACK/);
  });

  it('requires SMTP_HOST or ALLOW_MOCK_EMAIL in production', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        ALLOW_MOCK_STORAGE: 'true',
        ALLOW_MOCK_PAYSTACK: 'true',
        ALLOW_MOCK_PUSH: 'true',
      }),
    ).toThrow(/ALLOW_MOCK_EMAIL/);
  });

  it('requires FCM credentials or ALLOW_MOCK_PUSH in production', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        ALLOW_MOCK_STORAGE: 'true',
        ALLOW_MOCK_PAYSTACK: 'true',
        ALLOW_MOCK_EMAIL: 'true',
      }),
    ).toThrow(/ALLOW_MOCK_PUSH/);
  });

  it('accepts production when Paystack and storage mocks are explicit', () => {
    const env = validateEnv({
      ...base,
      NODE_ENV: 'production',
      ALLOW_MOCK_STORAGE: 'true',
      ALLOW_MOCK_PAYSTACK: 'true',
      ALLOW_MOCK_EMAIL: 'true',
      ALLOW_MOCK_PUSH: 'true',
    });
    expect(env.PAYMENTS_DRIVER).toBe('mock');
    expect(env.STORAGE_DRIVER).toBe('mock');
    expect(env.EMAIL_DRIVER).toBe('mock');
    expect(env.PUSH_DRIVER).toBe('mock');
  });
});
