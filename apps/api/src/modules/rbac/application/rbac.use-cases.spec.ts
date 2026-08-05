import { describe, expect, it, vi } from 'vitest';
import {
  AssignUserRoleUseCase,
  AuthorizationService,
  CreateRoleUseCase,
  DeleteRoleUseCase,
  RenameRoleUseCase,
  RevokeUserRoleUseCase,
  UpdateRolePermissionsUseCase,
} from './rbac.use-cases';
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

  it('hasPermission and getPermissionKeys respect org-wide grants only for org-level', async () => {
    const rbac = {
      loadEffectiveGrants: vi.fn().mockResolvedValue([
        { permissionKey: 'members.read', scopeType: null, scopeId: null },
        {
          permissionKey: 'institution.members.manage',
          scopeType: 'institution',
          scopeId: 'inst-1',
        },
      ]),
    } as unknown as RbacRepository;
    const authz = new AuthorizationService(rbac);

    await expect(
      authz.hasPermission({
        organizationId: 'o1',
        userId: 'u1',
        permissionKey: 'institution.members.manage',
      }),
    ).resolves.toBe(false);

    await expect(
      authz.hasPermission({
        organizationId: 'o1',
        userId: 'u1',
        permissionKey: 'institution.members.manage',
        scope: { scopeType: 'institution', scopeId: 'inst-1' },
      }),
    ).resolves.toBe(true);

    await expect(authz.getPermissionKeys('o1', 'u1')).resolves.toEqual([
      'institution.members.manage',
      'members.read',
    ]);
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

describe('system role locks', () => {
  const systemRole = {
    id: 'r-sys',
    key: 'org_admin',
    name: 'Organization Administrator',
    isSystem: true,
    permissionKeys: ['roles.manage'],
  };

  it('UpdateRolePermissions rejects system roles', async () => {
    const usecase = new UpdateRolePermissionsUseCase({
      findRole: vi.fn().mockResolvedValue(systemRole),
      setRolePermissions: vi.fn(),
    } as unknown as RbacRepository);
    await expect(
      usecase.execute({ organizationId: 'o1', roleId: 'r-sys', permissionKeys: [] }),
    ).rejects.toMatchObject({ code: 'SYSTEM_ROLE_LOCKED' });
  });

  it('RenameRole rejects system roles', async () => {
    const usecase = new RenameRoleUseCase({
      findRole: vi.fn().mockResolvedValue(systemRole),
      renameRole: vi.fn(),
    } as unknown as RbacRepository);
    await expect(
      usecase.execute({ organizationId: 'o1', roleId: 'r-sys', name: 'Nope' }),
    ).rejects.toMatchObject({ code: 'SYSTEM_ROLE_LOCKED' });
  });

  it('DeleteRole rejects system roles', async () => {
    const usecase = new DeleteRoleUseCase({
      findRole: vi.fn().mockResolvedValue(systemRole),
      deleteRole: vi.fn(),
    } as unknown as RbacRepository);
    await expect(usecase.execute('o1', 'r-sys')).rejects.toMatchObject({
      code: 'SYSTEM_ROLE_LOCKED',
    });
  });
});

describe('AssignUserRoleUseCase', () => {
  it('requires scopeId for institution/committee scope', async () => {
    const usecase = new AssignUserRoleUseCase({
      findRole: vi.fn().mockResolvedValue({ id: 'r1', isSystem: false }),
      assignUserRole: vi.fn(),
    } as unknown as RbacRepository);
    await expect(
      usecase.execute({
        organizationId: 'o1',
        userId: 'u1',
        roleId: 'r1',
        scopeType: 'institution',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_SCOPE' });
  });
});

describe('RevokeUserRoleUseCase', () => {
  it('binds revoke to organization + user + assignment', async () => {
    const rbac = {
      revokeUserRole: vi.fn().mockResolvedValue(undefined),
    } as unknown as RbacRepository;
    const usecase = new RevokeUserRoleUseCase(rbac);
    await expect(usecase.execute('o1', 'u1', 'a1')).resolves.toEqual({ ok: true });
    expect(rbac.revokeUserRole).toHaveBeenCalledWith('o1', 'u1', 'a1');
  });
});
