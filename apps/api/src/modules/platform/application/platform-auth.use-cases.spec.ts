import { describe, expect, it, vi } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import { PlatformOperator } from '../domain/platform-operator';
import { BootstrapPlatformUseCase } from './bootstrap-platform.use-case';
import { PlatformLoginUseCase } from './platform-login.use-case';
import type { PlatformUserRepository } from './ports/platform-user.repository';
import type { OrganizationAdminRepository } from './ports/organization-admin.repository';
import type { PasswordHasher } from '../../identity/application/ports/password-hasher';
import type { PlatformTokenService } from './ports/platform-token.service';

function operator(overrides: Partial<Parameters<typeof PlatformOperator.restore>[0]> = {}) {
  return PlatformOperator.restore({
    id: 'op-1',
    email: 'ops@example.com',
    name: 'Ops',
    passwordHash: 'hash',
    status: 'active',
    roleKeys: ['super_admin'],
    ...overrides,
  });
}

describe('BootstrapPlatformUseCase', () => {
  const secret = 'bootstrap-secret-16';

  it('creates the first operator when secret matches and no users exist', async () => {
    const users: PlatformUserRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue(operator()),
      touchLastLogin: vi.fn(),
    };
    const orgs = {
      ensurePlatformRole: vi.fn().mockResolvedValue(undefined),
      ensureDefaultPlan: vi.fn().mockResolvedValue({ id: 'p1', code: 'starter' }),
    } as unknown as OrganizationAdminRepository;
    const hasher: PasswordHasher = {
      hash: vi.fn().mockResolvedValue('argon'),
      verify: vi.fn(),
    };
    const usecase = new BootstrapPlatformUseCase(users, orgs, hasher);

    const result = await usecase.execute({
      bootstrapSecret: secret,
      providedSecret: secret,
      email: 'Ops@Example.com',
      name: ' Ops ',
      password: 'change-me-now-12',
    });

    expect(result.email).toBe('ops@example.com');
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ops@example.com',
        name: 'Ops',
        passwordHash: 'argon',
      }),
    );
  });

  it('rejects when PLATFORM_BOOTSTRAP_SECRET is unset', async () => {
    const usecase = new BootstrapPlatformUseCase(
      { count: vi.fn() } as unknown as PlatformUserRepository,
      {} as OrganizationAdminRepository,
      { hash: vi.fn(), verify: vi.fn() },
    );
    await expect(
      usecase.execute({
        bootstrapSecret: undefined,
        providedSecret: 'x',
        email: 'a@b.com',
        name: 'A',
        password: 'change-me-now-12',
      }),
    ).rejects.toMatchObject({ code: 'BOOTSTRAP_DISABLED' });
  });

  it('rejects invalid bootstrap secret', async () => {
    const usecase = new BootstrapPlatformUseCase(
      { count: vi.fn() } as unknown as PlatformUserRepository,
      {} as OrganizationAdminRepository,
      { hash: vi.fn(), verify: vi.fn() },
    );
    await expect(
      usecase.execute({
        bootstrapSecret: secret,
        providedSecret: 'wrong-secret-xxxxx',
        email: 'a@b.com',
        name: 'A',
        password: 'change-me-now-12',
      }),
    ).rejects.toMatchObject({ code: 'BOOTSTRAP_FORBIDDEN' });
  });

  it('rejects when platform already has operators', async () => {
    const usecase = new BootstrapPlatformUseCase(
      { count: vi.fn().mockResolvedValue(1) } as unknown as PlatformUserRepository,
      {} as OrganizationAdminRepository,
      { hash: vi.fn(), verify: vi.fn() },
    );
    await expect(
      usecase.execute({
        bootstrapSecret: secret,
        providedSecret: secret,
        email: 'a@b.com',
        name: 'A',
        password: 'change-me-now-12',
      }),
    ).rejects.toMatchObject({ code: 'BOOTSTRAP_ALREADY_DONE' });
  });

  it('rejects weak bootstrap password', async () => {
    const usecase = new BootstrapPlatformUseCase(
      { count: vi.fn().mockResolvedValue(0) } as unknown as PlatformUserRepository,
      {} as OrganizationAdminRepository,
      { hash: vi.fn(), verify: vi.fn() },
    );
    await expect(
      usecase.execute({
        bootstrapSecret: secret,
        providedSecret: secret,
        email: 'a@b.com',
        name: 'A',
        password: 'short',
      }),
    ).rejects.toMatchObject({ code: 'WEAK_PASSWORD' });
  });
});

describe('PlatformLoginUseCase', () => {
  it('issues platform access token on valid credentials', async () => {
    const user = operator();
    const users: PlatformUserRepository = {
      findByEmail: vi.fn().mockResolvedValue(user),
      findById: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      touchLastLogin: vi.fn().mockResolvedValue(undefined),
    };
    const hasher: PasswordHasher = {
      hash: vi.fn(),
      verify: vi.fn().mockResolvedValue(true),
    };
    const tokens: PlatformTokenService = {
      sign: vi.fn().mockResolvedValue({ token: 'plat-jwt', expiresInSeconds: 900 }),
      verify: vi.fn(),
    };
    const usecase = new PlatformLoginUseCase(users, hasher, tokens);
    const result = await usecase.execute({ email: 'Ops@Example.com', password: 'ok-password' });
    expect(result.accessToken).toBe('plat-jwt');
    expect(tokens.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: user.id, email: user.email }),
    );
  });

  it('throws INVALID_CREDENTIALS for unknown email', async () => {
    const hasher: PasswordHasher = { hash: vi.fn(), verify: vi.fn() };
    const usecase = new PlatformLoginUseCase(
      {
        findByEmail: vi.fn().mockResolvedValue(null),
        findById: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        touchLastLogin: vi.fn(),
      },
      hasher,
      { sign: vi.fn(), verify: vi.fn() },
    );
    await expect(
      usecase.execute({ email: 'ghost@example.com', password: 'whatever-long' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(hasher.verify).not.toHaveBeenCalled();
  });

  it('throws PLATFORM_USER_DISABLED for disabled operators', async () => {
    const usecase = new PlatformLoginUseCase(
      {
        findByEmail: vi.fn().mockResolvedValue(operator({ status: 'disabled' })),
        findById: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        touchLastLogin: vi.fn(),
      },
      { hash: vi.fn(), verify: vi.fn().mockResolvedValue(true) },
      { sign: vi.fn(), verify: vi.fn() },
    );
    await expect(
      usecase.execute({ email: 'ops@example.com', password: 'ok-password' }),
    ).rejects.toBeInstanceOf(DomainError);
    await expect(
      usecase.execute({ email: 'ops@example.com', password: 'ok-password' }),
    ).rejects.toMatchObject({ code: 'PLATFORM_USER_DISABLED' });
  });
});
