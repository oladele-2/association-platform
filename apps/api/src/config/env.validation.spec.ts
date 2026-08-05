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
});
