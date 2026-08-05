import { describe, expect, it, vi } from 'vitest';
import { AuthorizationService, CreateRoleUseCase } from './rbac.use-cases';
import type { RbacRepository } from './ports/rbac.repository';

describe('AuthorizationService', () => {
  it('assertPermissions uses loaded grants', async () => {
    const rbac = {
      loadEffectiveGrants: vi
        .fn()
        .mockResolvedValue([{ permissionKey: 'roles.manage', scopeType: null, scopeId: null }]),
    } as unknown as RbacRepository;

    const authz = new AuthorizationService(rbac);
    await expect(
      authz.assertPermissions({
        organizationId: 'o1',
        userId: 'u1',
        permissionKeys: ['roles.manage'],
      }),
    ).resolves.toBeUndefined();

    await expect(
      authz.assertPermissions({
        organizationId: 'o1',
        userId: 'u1',
        permissionKeys: ['payments.verify'],
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('CreateRoleUseCase', () => {
  it('normalizes key and rejects invalid keys', async () => {
    const rbac = {
      createRole: vi.fn().mockResolvedValue({ id: 'r1', key: 'custom_officer' }),
    } as unknown as RbacRepository;
    const usecase = new CreateRoleUseCase(rbac);

    await usecase.execute({
      organizationId: 'o1',
      key: 'Custom_Officer',
      name: 'Custom Officer',
      permissionKeys: ['members.read'],
    });
    expect(rbac.createRole).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'custom_officer' }),
    );

    await expect(
      usecase.execute({
        organizationId: 'o1',
        key: 'bad key',
        name: 'X',
        permissionKeys: [],
      }),
    ).rejects.toMatchObject({ code: 'INVALID_ROLE_KEY' });
  });
});
