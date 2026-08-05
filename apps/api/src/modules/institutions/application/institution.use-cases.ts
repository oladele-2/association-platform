import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import {
  assertInstitutionName,
  assertInstitutionType,
  normalizeInstitutionCode,
  type EmploymentStatus,
  type InstitutionOwnership,
} from '../domain/institution.rules';
import { INSTITUTION_REPOSITORY, type InstitutionRepository } from './ports/institution.repository';
import { AuthorizationService } from '../../rbac/application/rbac.use-cases';
import { RBAC_REPOSITORY, type RbacRepository } from '../../rbac/application/ports/rbac.repository';

@Injectable()
export class ListInstitutionsUseCase {
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository) {}
  execute(input: {
    organizationId: string;
    q?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return this.repo.listInstitutions(input);
  }
}

@Injectable()
export class GetInstitutionUseCase {
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository) {}
  async byId(organizationId: string, id: string) {
    const row = await this.repo.findById(organizationId, id);
    if (!row) throw new DomainError('INSTITUTION_NOT_FOUND', 'Institution not found');
    return row;
  }
}

@Injectable()
export class CreateInstitutionUseCase {
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository) {}
  execute(input: {
    organizationId: string;
    code?: string | null;
    name: string;
    institutionType: string;
    ownership?: InstitutionOwnership | null;
    state?: string | null;
    lga?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    isNetworkAffiliate?: boolean;
    status?: string;
  }) {
    return this.repo.createInstitution({
      ...input,
      name: assertInstitutionName(input.name),
      institutionType: assertInstitutionType(input.institutionType),
      code: input.code ? normalizeInstitutionCode(input.code) : null,
      email: input.email?.trim().toLowerCase() ?? null,
    });
  }
}

@Injectable()
export class UpdateInstitutionUseCase {
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository) {}
  async execute(input: {
    organizationId: string;
    id: string;
    code?: string | null;
    name?: string;
    institutionType?: string;
    ownership?: InstitutionOwnership | null;
    state?: string | null;
    lga?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    isNetworkAffiliate?: boolean;
    status?: string;
  }) {
    const existing = await this.repo.findById(input.organizationId, input.id);
    if (!existing) throw new DomainError('INSTITUTION_NOT_FOUND', 'Institution not found');

    return this.repo.updateInstitution({
      organizationId: input.organizationId,
      id: input.id,
      code:
        input.code !== undefined
          ? input.code
            ? normalizeInstitutionCode(input.code)
            : null
          : undefined,
      name: input.name !== undefined ? assertInstitutionName(input.name) : undefined,
      institutionType:
        input.institutionType !== undefined
          ? assertInstitutionType(input.institutionType)
          : undefined,
      ownership: input.ownership,
      state: input.state,
      lga: input.lga,
      address: input.address,
      phone: input.phone,
      email: input.email !== undefined ? (input.email?.trim().toLowerCase() ?? null) : undefined,
      isNetworkAffiliate: input.isNetworkAffiliate,
      status: input.status,
    });
  }
}

@Injectable()
export class DeleteInstitutionUseCase {
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository) {}
  async execute(organizationId: string, id: string) {
    const existing = await this.repo.findById(organizationId, id);
    if (!existing) throw new DomainError('INSTITUTION_NOT_FOUND', 'Institution not found');
    await this.repo.softDeleteInstitution(organizationId, id);
    return { ok: true as const };
  }
}

@Injectable()
export class ListInstitutionAdminsUseCase {
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository) {}
  async execute(organizationId: string, institutionId: string) {
    await assertInstitution(this.repo, organizationId, institutionId);
    return this.repo.listAdmins(organizationId, institutionId);
  }
}

@Injectable()
export class AssignInstitutionAdminUseCase {
  constructor(
    @Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository,
    @Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository,
  ) {}
  async execute(input: { organizationId: string; institutionId: string; userId: string }) {
    await assertInstitution(this.repo, input.organizationId, input.institutionId);
    const admin = await this.repo.assignAdmin(input);

    const roles = await this.rbac.listRoles(input.organizationId);
    const institutionAdminRole = roles.find((r) => r.key === 'institution_admin');
    if (institutionAdminRole) {
      try {
        await this.rbac.assignUserRole({
          organizationId: input.organizationId,
          userId: input.userId,
          roleId: institutionAdminRole.id,
          scopeType: 'institution',
          scopeId: input.institutionId,
        });
      } catch (err) {
        if (!(err instanceof DomainError && err.code === 'ROLE_ALREADY_ASSIGNED')) {
          throw err;
        }
      }
    }

    return admin;
  }
}

@Injectable()
export class RevokeInstitutionAdminUseCase {
  constructor(
    @Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository,
    @Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository,
  ) {}
  async execute(organizationId: string, institutionId: string, adminId: string) {
    await assertInstitution(this.repo, organizationId, institutionId);
    const admins = await this.repo.listAdmins(organizationId, institutionId);
    const target = admins.find((a) => a.id === adminId);
    if (!target) {
      throw new DomainError('INSTITUTION_ADMIN_NOT_FOUND', 'Institution admin not found');
    }

    await this.repo.revokeAdmin(organizationId, institutionId, adminId);

    const assignments = await this.rbac.listUserRoles(organizationId, target.userId);
    for (const assignment of assignments) {
      if (
        assignment.roleKey === 'institution_admin' &&
        assignment.scopeType === 'institution' &&
        assignment.scopeId === institutionId
      ) {
        await this.rbac.revokeUserRole(organizationId, target.userId, assignment.id);
      }
    }

    return { ok: true as const };
  }
}

@Injectable()
export class ListInstitutionMembersUseCase {
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository) {}
  async execute(organizationId: string, institutionId: string) {
    await assertInstitution(this.repo, organizationId, institutionId);
    return this.repo.listMembers(organizationId, institutionId);
  }
}

@Injectable()
export class LinkInstitutionMemberUseCase {
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository) {}
  async execute(input: {
    organizationId: string;
    institutionId: string;
    memberId: string;
    employmentStatus?: EmploymentStatus;
    isPrimary?: boolean;
    startedOn?: string | null;
    endedOn?: string | null;
  }) {
    await assertInstitution(this.repo, input.organizationId, input.institutionId);
    const exists = await this.repo.memberExists(input.organizationId, input.memberId);
    if (!exists) throw new DomainError('MEMBER_NOT_FOUND', 'Member not found');
    return this.repo.linkMember({
      organizationId: input.organizationId,
      institutionId: input.institutionId,
      memberId: input.memberId,
      employmentStatus: input.employmentStatus,
      isPrimary: input.isPrimary,
      startedOn: input.startedOn ? new Date(input.startedOn) : null,
      endedOn: input.endedOn ? new Date(input.endedOn) : null,
    });
  }
}

@Injectable()
export class UpdateInstitutionMemberLinkUseCase {
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository) {}
  async execute(input: {
    organizationId: string;
    institutionId: string;
    linkId: string;
    employmentStatus?: EmploymentStatus;
    isPrimary?: boolean;
    startedOn?: string | null;
    endedOn?: string | null;
  }) {
    await assertInstitution(this.repo, input.organizationId, input.institutionId);
    return this.repo.updateMemberLink({
      organizationId: input.organizationId,
      institutionId: input.institutionId,
      linkId: input.linkId,
      employmentStatus: input.employmentStatus,
      isPrimary: input.isPrimary,
      startedOn:
        input.startedOn !== undefined
          ? input.startedOn
            ? new Date(input.startedOn)
            : null
          : undefined,
      endedOn:
        input.endedOn !== undefined ? (input.endedOn ? new Date(input.endedOn) : null) : undefined,
    });
  }
}

@Injectable()
export class UnlinkInstitutionMemberUseCase {
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository) {}
  async execute(organizationId: string, institutionId: string, linkId: string) {
    await assertInstitution(this.repo, organizationId, institutionId);
    await this.repo.unlinkMember(organizationId, institutionId, linkId);
    return { ok: true as const };
  }
}

/** Institution-portal scoped: institutions where the user is an institution admin. */
@Injectable()
export class ListMyInstitutionsUseCase {
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository) {}
  execute(organizationId: string, userId: string) {
    return this.repo.listInstitutionsForAdmin(organizationId, userId);
  }
}

@Injectable()
export class AssertInstitutionAdminAccessUseCase {
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository) {}
  async execute(organizationId: string, institutionId: string, userId: string) {
    await assertInstitution(this.repo, organizationId, institutionId);
    const ok = await this.repo.isInstitutionAdmin(organizationId, institutionId, userId);
    if (!ok) {
      throw new DomainError('INSTITUTION_ADMIN_REQUIRED', 'Not an admin of this institution');
    }
  }
}

/**
 * Portal access: must be listed on institution_admins AND hold the permission
 * as an org-wide grant or an institution-scoped grant for this institution.
 */
@Injectable()
export class AssertInstitutionPortalPermissionUseCase {
  constructor(
    private readonly assertAdmin: AssertInstitutionAdminAccessUseCase,
    private readonly authz: AuthorizationService,
  ) {}

  async execute(input: {
    organizationId: string;
    institutionId: string;
    userId: string;
    permissionKey: string;
  }) {
    await this.assertAdmin.execute(input.organizationId, input.institutionId, input.userId);
    await this.authz.assertPermissions({
      organizationId: input.organizationId,
      userId: input.userId,
      permissionKeys: [input.permissionKey],
      scope: { scopeType: 'institution', scopeId: input.institutionId },
    });
  }
}

async function assertInstitution(
  repo: InstitutionRepository,
  organizationId: string,
  institutionId: string,
) {
  const row = await repo.findById(organizationId, institutionId);
  if (!row) throw new DomainError('INSTITUTION_NOT_FOUND', 'Institution not found');
}
