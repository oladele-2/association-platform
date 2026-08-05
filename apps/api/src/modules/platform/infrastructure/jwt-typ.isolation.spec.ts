import { describe, expect, it } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { JwtTokenService } from '../../identity/infrastructure/jwt-token.service';
import { JwtPlatformTokenService } from '../infrastructure/jwt-platform-token.service';
import type { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../../../config/env.validation';

function configStub(): ConfigService<AppEnv, true> {
  return {
    get(key: string) {
      if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret-32chars!!';
      if (key === 'JWT_ACCESS_TTL_SECONDS') return 900;
      return undefined;
    },
  } as unknown as ConfigService<AppEnv, true>;
}

describe('JWT typ isolation (tenant vs platform)', () => {
  const jwt = new JwtService();
  const config = configStub();
  const tenantTokens = new JwtTokenService(jwt, config);
  const platformTokens = new JwtPlatformTokenService(jwt, config);

  it('tenant verify rejects platform_access tokens', async () => {
    const { token } = await platformTokens.sign({
      sub: 'op-1',
      email: 'ops@example.com',
      roles: ['super_admin'],
    });
    await expect(tenantTokens.verifyAccessToken(token)).rejects.toThrow(/Invalid token type/);
  });

  it('platform verify rejects tenant access tokens', async () => {
    const { token } = await tenantTokens.signAccessToken({
      sub: 'user-1',
      orgId: 'org-1',
      email: 'member@example.com',
    });
    await expect(platformTokens.verify(token)).rejects.toThrow(/Invalid platform token type/);
  });
});
