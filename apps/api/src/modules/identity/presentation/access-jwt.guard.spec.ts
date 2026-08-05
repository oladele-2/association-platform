import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AccessJwtGuard } from './access-jwt.guard';
import type { TokenService } from '../application/ports/token.service';

function contextStub(req: Record<string, unknown>) {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as never;
}

describe('AccessJwtGuard', () => {
  it('rejects missing bearer token', async () => {
    const tokens = { verifyAccessToken: vi.fn() } as unknown as TokenService;
    const guard = new AccessJwtGuard(tokens);
    await expect(
      guard.canActivate(contextStub({ header: () => undefined })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects JWT org that does not match resolved tenant', async () => {
    const tokens = {
      verifyAccessToken: vi.fn().mockResolvedValue({
        sub: 'u1',
        orgId: 'org-a',
        email: 'a@b.c',
      }),
    } as unknown as TokenService;
    const guard = new AccessJwtGuard(tokens);
    const req = {
      header: () => 'Bearer tok',
      tenant: { organizationId: 'org-b' },
    };
    await expect(guard.canActivate(contextStub(req))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows matching JWT and tenant org', async () => {
    const tokens = {
      verifyAccessToken: vi.fn().mockResolvedValue({
        sub: 'u1',
        orgId: 'org-a',
        email: 'a@b.c',
      }),
    } as unknown as TokenService;
    const guard = new AccessJwtGuard(tokens);
    const req: Record<string, unknown> = {
      header: () => 'Bearer tok',
      tenant: { organizationId: 'org-a' },
    };
    await expect(guard.canActivate(contextStub(req))).resolves.toBe(true);
    expect(req.authUser).toEqual({
      userId: 'u1',
      organizationId: 'org-a',
      email: 'a@b.c',
    });
  });
});
