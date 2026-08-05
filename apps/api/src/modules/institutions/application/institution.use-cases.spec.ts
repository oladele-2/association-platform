import { describe, expect, it, vi } from 'vitest';
import {
  AssertInstitutionAdminAccessUseCase,
  AssertInstitutionPortalPermissionUseCase,
  AssignInstitutionAdminUseCase,
  CreateInstitutionUseCase,
  LinkInstitutionMemberUseCase,
} from './institution.use-cases';
import type { InstitutionRepository } from './ports/institution.repository';
import type { AuthorizationService } from '../../rbac/application/rbac.use-cases';
import type { RbacRepository } from '../../rbac/application/ports/rbac.repository';

describe('CreateInstitutionUseCase', () => {
  it('normalizes code and type', async () => {
    const repo = {
      createInstitution: vi.fn().mockResolvedValue({ id: 'i1' }),
    } as unknown as InstitutionRepository;

    const usecase = new CreateInstitutionUseCase(repo);
    await usecase.execute({
      organizationId: 'o1',
      code: 'abc-1',
      name: 'State Hospital',
      institutionType: 'Hospital',
    });

    expect(repo.createInstitution).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'ABC-1',
        institutionType: 'hospital',
        name: 'State Hospital',
      }),
    );
  });
});

describe('LinkInstitutionMemberUseCase', () => {
  it('rejects unknown members', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'i1' }),
      memberExists: vi.fn().mockResolvedValue(false),
      linkMember: vi.fn(),
    } as unknown as InstitutionRepository;

    const usecase = new LinkInstitutionMemberUseCase(repo);
    await expect(
      usecase.execute({
        organizationId: 'o1',
        institutionId: 'i1',
        memberId: 'm1',
      }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
  });
});

describe('AssertInstitutionAdminAccessUseCase', () => {
  it('forbids non-admins', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'i1' }),
      isInstitutionAdmin: vi.fn().mockResolvedValue(false),
    } as unknown as InstitutionRepository;

    const usecase = new AssertInstitutionAdminAccessUseCase(repo);
    await expect(usecase.execute('o1', 'i1', 'u1')).rejects.toMatchObject({
      code: 'INSTITUTION_ADMIN_REQUIRED',
    });
  });
});

describe('AssertInstitutionPortalPermissionUseCase', () => {
  it('requires institution_admins row then scoped permission', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'i1' }),
      isInstitutionAdmin: vi.fn().mockResolvedValue(true),
    } as unknown as InstitutionRepository;
    const authz = {
      assertPermissions: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthorizationService;

    const usecase = new AssertInstitutionPortalPermissionUseCase(
      new AssertInstitutionAdminAccessUseCase(repo),
      authz,
    );
    await usecase.execute({
      organizationId: 'o1',
      institutionId: 'i1',
      userId: 'u1',
      permissionKey: 'institutions.read',
    });
    expect(authz.assertPermissions).toHaveBeenCalledWith({
      organizationId: 'o1',
      userId: 'u1',
      permissionKeys: ['institutions.read'],
      scope: { scopeType: 'institution', scopeId: 'i1' },
    });
  });

  it('denies when scoped permission fails', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'i1' }),
      isInstitutionAdmin: vi.fn().mockResolvedValue(true),
    } as unknown as InstitutionRepository;
    const authz = {
      assertPermissions: vi.fn().mockRejectedValue({ code: 'FORBIDDEN' }),
    } as unknown as AuthorizationService;

    const usecase = new AssertInstitutionPortalPermissionUseCase(
      new AssertInstitutionAdminAccessUseCase(repo),
      authz,
    );
    await expect(
      usecase.execute({
        organizationId: 'o1',
        institutionId: 'i1',
        userId: 'u1',
        permissionKey: 'institutions.read',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('AssignInstitutionAdminUseCase', () => {
  it('assigns table admin and scoped institution_admin role', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'i1' }),
      assignAdmin: vi.fn().mockResolvedValue({ id: 'a1', userId: 'u1' }),
    } as unknown as InstitutionRepository;
    const rbac = {
      listRoles: vi.fn().mockResolvedValue([{ id: 'role-ia', key: 'institution_admin' }]),
      assignUserRole: vi.fn().mockResolvedValue({ id: 'ur1' }),
    } as unknown as RbacRepository;

    const usecase = new AssignInstitutionAdminUseCase(repo, rbac);
    await usecase.execute({ organizationId: 'o1', institutionId: 'i1', userId: 'u1' });
    expect(rbac.assignUserRole).toHaveBeenCalledWith({
      organizationId: 'o1',
      userId: 'u1',
      roleId: 'role-ia',
      scopeType: 'institution',
      scopeId: 'i1',
    });
  });
});
