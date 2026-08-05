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
    isAgpmpnMember?: boolean;
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
    isAgpmpnMember?: boolean;
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
      isAgpmpnMember: input.isAgpmpnMember,
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
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository) {}
  async execute(input: { organizationId: string; institutionId: string; userId: string }) {
    await assertInstitution(this.repo, input.organizationId, input.institutionId);
    return this.repo.assignAdmin(input);
  }
}

@Injectable()
export class RevokeInstitutionAdminUseCase {
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repo: InstitutionRepository) {}
  async execute(organizationId: string, institutionId: string, adminId: string) {
    await assertInstitution(this.repo, organizationId, institutionId);
    await this.repo.revokeAdmin(organizationId, institutionId, adminId);
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

async function assertInstitution(
  repo: InstitutionRepository,
  organizationId: string,
  institutionId: string,
) {
  const row = await repo.findById(organizationId, institutionId);
  if (!row) throw new DomainError('INSTITUTION_NOT_FOUND', 'Institution not found');
}
