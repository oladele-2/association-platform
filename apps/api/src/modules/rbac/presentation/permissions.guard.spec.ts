import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import { PermissionsGuard } from './permissions.guard';
import { AuthorizationService } from '../application/rbac.use-cases';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator';

function makeContext(authUser?: { userId: string; organizationId: string; email: string }) {
  const req = { authUser };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  };
}

describe('PermissionsGuard', () => {
  it('allows when no permissions are required', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const authz = { assertPermissions: vi.fn() } as unknown as AuthorizationService;
    const guard = new PermissionsGuard(reflector, authz);
    await expect(guard.canActivate(makeContext() as never)).resolves.toBe(true);
    expect(authz.assertPermissions).not.toHaveBeenCalled();
  });

  it('forbids when authUser is missing', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['roles.manage']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector, {
      assertPermissions: vi.fn(),
    } as unknown as AuthorizationService);
    await expect(guard.canActivate(makeContext() as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('maps FORBIDDEN DomainError to HTTP 403', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['roles.manage']),
    } as unknown as Reflector;
    const authz = {
      assertPermissions: vi
        .fn()
        .mockRejectedValue(new DomainError('FORBIDDEN', 'Missing permission(s): roles.manage')),
    } as unknown as AuthorizationService;
    const guard = new PermissionsGuard(reflector, authz);
    await expect(
      guard.canActivate(
        makeContext({ userId: 'u1', organizationId: 'o1', email: 'a@b.com' }) as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRED_PERMISSIONS_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });

  it('passes when assertPermissions succeeds', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['roles.manage']),
    } as unknown as Reflector;
    const authz = {
      assertPermissions: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthorizationService;
    const guard = new PermissionsGuard(reflector, authz);
    await expect(
      guard.canActivate(
        makeContext({ userId: 'u1', organizationId: 'o1', email: 'a@b.com' }) as never,
      ),
    ).resolves.toBe(true);
  });
});
