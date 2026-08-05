import { describe, expect, it, vi } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import { AuthUser } from '../domain/auth-user';
import { LoginUseCase } from './login.use-case';
import { RefreshSessionUseCase } from './refresh-session.use-case';
import type { UserRepository } from './ports/user.repository';
import type { PasswordHasher } from './ports/password-hasher';
import type { TokenService } from './ports/token.service';
import type { RefreshTokenRepository } from './ports/refresh-token.repository';

function buildUser(overrides: Partial<Parameters<typeof AuthUser.restore>[0]> = {}) {
  return AuthUser.restore({
    id: '11111111-1111-1111-1111-111111111111',
    organizationId: '22222222-2222-2222-2222-222222222222',
    email: 'member@example.com',
    passwordHash: 'argon-hash',
    status: 'active',
    emailVerifiedAt: new Date(),
    mustResetPassword: false,
    ...overrides,
  });
}

describe('LoginUseCase', () => {
  it('issues session on valid credentials', async () => {
    const user = buildUser();
    const users: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue(user),
      findById: vi.fn(),
      save: vi.fn(),
      touchLastLogin: vi.fn().mockResolvedValue(undefined),
    };
    const hasher: PasswordHasher = {
      hash: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };
    const tokens: TokenService = {
      signAccessToken: vi.fn().mockResolvedValue({ token: 'access', expiresInSeconds: 900 }),
      verifyAccessToken: vi.fn(),
    };
    const refresh: RefreshTokenRepository = {
      issue: vi.fn().mockResolvedValue({
        id: 'r1',
        familyId: 'f1',
        rawToken: 'refresh-raw',
        expiresAt: new Date('2030-01-01T00:00:00Z'),
      }),
      findByRawToken: vi.fn(),
      rotate: vi.fn(),
      revokeFamily: vi.fn(),
      revokeByRawToken: vi.fn(),
      revokeAllForUser: vi.fn(),
    };

    const usecase = new LoginUseCase(users, hasher, tokens, refresh);
    const result = await usecase.execute({
      organizationId: user.organizationId,
      email: 'Member@Example.com',
      password: 'correct-horse',
      refreshTtlSeconds: 3600,
    });

    expect(result.accessToken).toBe('access');
    expect(result.refreshToken).toBe('refresh-raw');
    expect(result.user.email).toBe('member@example.com');
    expect(users.touchLastLogin).toHaveBeenCalled();
  });

  it('throws INVALID_CREDENTIALS on bad password', async () => {
    const users: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue(buildUser()),
      findById: vi.fn(),
      save: vi.fn(),
      touchLastLogin: vi.fn(),
    };
    const hasher: PasswordHasher = {
      hash: vi.fn(),
      verify: vi.fn().mockResolvedValue(false),
    };
    const usecase = new LoginUseCase(
      users,
      hasher,
      { signAccessToken: vi.fn(), verifyAccessToken: vi.fn() },
      {
        issue: vi.fn(),
        findByRawToken: vi.fn(),
        rotate: vi.fn(),
        revokeFamily: vi.fn(),
        revokeByRawToken: vi.fn(),
        revokeAllForUser: vi.fn(),
      },
    );

    await expect(
      usecase.execute({
        organizationId: 'o',
        email: 'member@example.com',
        password: 'wrong',
        refreshTtlSeconds: 3600,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
});

describe('RefreshSessionUseCase', () => {
  it('revokes family on refresh token reuse', async () => {
    const refresh: RefreshTokenRepository = {
      issue: vi.fn(),
      findByRawToken: vi.fn().mockResolvedValue({
        id: 'old',
        organizationId: 'o1',
        userId: 'u1',
        familyId: 'fam',
        expiresAt: new Date('2030-01-01'),
        revokedAt: new Date(),
        replacedById: 'newer',
      }),
      rotate: vi.fn(),
      revokeFamily: vi.fn().mockResolvedValue(undefined),
      revokeByRawToken: vi.fn(),
      revokeAllForUser: vi.fn(),
    };

    const usecase = new RefreshSessionUseCase(
      { findByEmail: vi.fn(), findById: vi.fn(), save: vi.fn(), touchLastLogin: vi.fn() },
      { signAccessToken: vi.fn(), verifyAccessToken: vi.fn() },
      refresh,
    );

    await expect(
      usecase.execute({ refreshToken: 'stolen', refreshTtlSeconds: 3600 }),
    ).rejects.toBeInstanceOf(DomainError);

    expect(refresh.revokeFamily).toHaveBeenCalledWith('o1', 'fam', expect.any(Date));
  });
});
