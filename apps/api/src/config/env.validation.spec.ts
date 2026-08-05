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
      }),
    ).toThrow(/ALLOW_MOCK_STORAGE/);
  });
});
