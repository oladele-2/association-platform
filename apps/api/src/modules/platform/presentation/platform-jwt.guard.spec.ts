import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import { PlatformOperator } from '../domain/platform-operator';
import { PlatformJwtGuard } from './platform-jwt.guard';
import type { PlatformTokenService } from '../application/ports/platform-token.service';
import type { PlatformUserRepository } from '../application/ports/platform-user.repository';

function makeContext(authHeader?: string) {
  const req: {
    headers: Record<string, string>;
    header: (n: string) => string | undefined;
    platformUser?: unknown;
  } = {
    headers: authHeader ? { authorization: authHeader } : {},
    header(name: string) {
      return this.headers[name.toLowerCase()];
    },
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    request: req,
  };
}

describe('PlatformJwtGuard', () => {
  it('rejects missing bearer token', async () => {
    const guard = new PlatformJwtGuard({ verify: vi.fn(), sign: vi.fn() }, {
      findById: vi.fn(),
    } as unknown as PlatformUserRepository);
    await expect(guard.canActivate(makeContext() as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('loads live operator and attaches platformUser', async () => {
    const tokens: PlatformTokenService = {
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue({
        sub: 'op-1',
        email: 'ops@example.com',
        roles: ['super_admin'],
      }),
    };
    const users: PlatformUserRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn().mockResolvedValue(
        PlatformOperator.restore({
          id: 'op-1',
          email: 'ops@example.com',
          name: 'Ops',
          passwordHash: 'h',
          status: 'active',
          roleKeys: ['super_admin'],
        }),
      ),
      count: vi.fn(),
      create: vi.fn(),
      touchLastLogin: vi.fn(),
    };
    const ctx = makeContext('Bearer plat.jwt');
    const guard = new PlatformJwtGuard(tokens, users);
    await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
    expect(ctx.request.platformUser).toEqual({
      userId: 'op-1',
      email: 'ops@example.com',
      roles: ['super_admin'],
    });
  });

  it('rejects disabled operators even with a valid JWT', async () => {
    const tokens: PlatformTokenService = {
      sign: vi.fn(),
      verify: vi.fn().mockResolvedValue({
        sub: 'op-1',
        email: 'ops@example.com',
        roles: ['super_admin'],
      }),
    };
    const users: PlatformUserRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn().mockResolvedValue(
        PlatformOperator.restore({
          id: 'op-1',
          email: 'ops@example.com',
          name: 'Ops',
          passwordHash: 'h',
          status: 'disabled',
          roleKeys: ['super_admin'],
        }),
      ),
      count: vi.fn(),
      create: vi.fn(),
      touchLastLogin: vi.fn(),
    };
    const guard = new PlatformJwtGuard(tokens, users);
    await expect(guard.canActivate(makeContext('Bearer plat.jwt') as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('maps DomainError from assertCanLogin to UnauthorizedException', async () => {
    const tokens: PlatformTokenService = {
      sign: vi.fn(),
      verify: vi.fn().mockRejectedValue(new DomainError('X', 'y')),
    };
    const guard = new PlatformJwtGuard(tokens, {
      findById: vi.fn(),
    } as unknown as PlatformUserRepository);
    await expect(guard.canActivate(makeContext('Bearer bad') as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
