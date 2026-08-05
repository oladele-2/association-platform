import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import {
  assertMemberCanActivate,
  assertMemberCanSuspend,
  normalizeMembershipCode,
  type MemberStatus,
  type Sex,
} from '../domain/member.rules';
import { MEMBER_REPOSITORY, type MemberRepository } from './ports/member.repository';

@Injectable()
export class ListMembershipTypesUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  execute(organizationId: string) {
    return this.repo.listMembershipTypes(organizationId);
  }
}

@Injectable()
export class CreateMembershipTypeUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  async execute(input: {
    organizationId: string;
    code: string;
    name: string;
    isDefault?: boolean;
    sortOrder?: number;
  }) {
    if (!input.name.trim()) throw new DomainError('INVALID_TITLE', 'Name is required');
    return this.repo.createMembershipType({
      ...input,
      code: normalizeMembershipCode(input.code),
      name: input.name.trim(),
    });
  }
}

@Injectable()
export class UpdateMembershipTypeUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  async execute(input: {
    organizationId: string;
    id: string;
    name?: string;
    isDefault?: boolean;
    sortOrder?: number;
  }) {
    return this.repo.updateMembershipType({
      ...input,
      name: input.name?.trim(),
    });
  }
}

@Injectable()
export class ListMembersUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  execute(input: {
    organizationId: string;
    status?: MemberStatus;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    return this.repo.listMembers(input);
  }
}

@Injectable()
export class GetMemberUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  async byId(organizationId: string, id: string) {
    const member = await this.repo.findMemberById(organizationId, id);
    if (!member) throw new DomainError('MEMBER_NOT_FOUND', 'Member not found');
    return member;
  }
}

@Injectable()
export class CreateMemberUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  async execute(input: {
    organizationId: string;
    membershipTypeId?: string;
    membershipNo?: string | null;
    title?: string | null;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    sex?: Sex | null;
    dateOfBirth?: string | null;
    phone?: string | null;
    alternateEmail?: string | null;
    photographFileId?: string | null;
    primaryInstitutionId?: string | null;
    userId?: string | null;
    joinedOn?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    if (!input.firstName.trim() || !input.lastName.trim()) {
      throw new DomainError('INVALID_NAME', 'firstName and lastName are required');
    }

    let membershipTypeId = input.membershipTypeId;
    if (!membershipTypeId) {
      const fallback = await this.repo.ensureDefaultMembershipType(input.organizationId);
      membershipTypeId = fallback.id;
    }

    return this.repo.createMember({
      organizationId: input.organizationId,
      membershipTypeId,
      membershipNo: input.membershipNo ?? null,
      title: input.title ?? null,
      firstName: input.firstName.trim(),
      middleName: input.middleName ?? null,
      lastName: input.lastName.trim(),
      sex: input.sex ?? null,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      phone: input.phone ?? null,
      alternateEmail: input.alternateEmail?.trim().toLowerCase() ?? null,
      photographFileId: input.photographFileId ?? null,
      primaryInstitutionId: input.primaryInstitutionId ?? null,
      userId: input.userId ?? null,
      joinedOn: input.joinedOn ? new Date(input.joinedOn) : null,
      metadata: input.metadata,
      status: 'draft',
    });
  }
}

@Injectable()
export class UpdateMemberUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  async execute(input: {
    organizationId: string;
    id: string;
    membershipTypeId?: string;
    membershipNo?: string | null;
    title?: string | null;
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    sex?: Sex | null;
    dateOfBirth?: string | null;
    phone?: string | null;
    alternateEmail?: string | null;
    photographFileId?: string | null;
    primaryInstitutionId?: string | null;
    userId?: string | null;
    joinedOn?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const existing = await this.repo.findMemberById(input.organizationId, input.id);
    if (!existing) throw new DomainError('MEMBER_NOT_FOUND', 'Member not found');

    return this.repo.updateMember({
      organizationId: input.organizationId,
      id: input.id,
      membershipTypeId: input.membershipTypeId,
      membershipNo: input.membershipNo,
      title: input.title,
      firstName: input.firstName?.trim(),
      middleName: input.middleName,
      lastName: input.lastName?.trim(),
      sex: input.sex,
      dateOfBirth:
        input.dateOfBirth !== undefined
          ? input.dateOfBirth
            ? new Date(input.dateOfBirth)
            : null
          : undefined,
      phone: input.phone,
      alternateEmail:
        input.alternateEmail !== undefined
          ? (input.alternateEmail?.trim().toLowerCase() ?? null)
          : undefined,
      photographFileId: input.photographFileId,
      primaryInstitutionId: input.primaryInstitutionId,
      userId: input.userId,
      joinedOn:
        input.joinedOn !== undefined
          ? input.joinedOn
            ? new Date(input.joinedOn)
            : null
          : undefined,
      metadata: input.metadata,
    });
  }
}

@Injectable()
export class ActivateMemberUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  async execute(organizationId: string, id: string) {
    const existing = await this.repo.findMemberById(organizationId, id);
    if (!existing) throw new DomainError('MEMBER_NOT_FOUND', 'Member not found');
    assertMemberCanActivate(existing.status);
    return this.repo.updateMember({
      organizationId,
      id,
      status: 'active',
      activatedAt: new Date(),
    });
  }
}

@Injectable()
export class SuspendMemberUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  async execute(organizationId: string, id: string) {
    const existing = await this.repo.findMemberById(organizationId, id);
    if (!existing) throw new DomainError('MEMBER_NOT_FOUND', 'Member not found');
    assertMemberCanSuspend(existing.status);
    return this.repo.updateMember({
      organizationId,
      id,
      status: 'suspended',
    });
  }
}

@Injectable()
export class SetMemberExemptionUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  async execute(input: {
    organizationId: string;
    id: string;
    actorUserId: string;
    duesExempt: boolean;
    reason?: string | null;
  }) {
    const existing = await this.repo.findMemberById(input.organizationId, input.id);
    if (!existing) throw new DomainError('MEMBER_NOT_FOUND', 'Member not found');
    if (input.duesExempt && !input.reason?.trim()) {
      throw new DomainError('EXEMPTION_REASON_REQUIRED', 'Exemption reason is required');
    }
    return this.repo.updateMember({
      organizationId: input.organizationId,
      id: input.id,
      duesExempt: input.duesExempt,
      duesExemptReason: input.duesExempt ? input.reason!.trim() : null,
      duesExemptApprovedById: input.duesExempt ? input.actorUserId : null,
      duesExemptApprovedAt: input.duesExempt ? new Date() : null,
    });
  }
}

@Injectable()
export class DeleteMemberUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  async execute(organizationId: string, id: string) {
    const existing = await this.repo.findMemberById(organizationId, id);
    if (!existing) throw new DomainError('MEMBER_NOT_FOUND', 'Member not found');
    await this.repo.softDeleteMember(organizationId, id);
    return { ok: true as const };
  }
}

@Injectable()
export class GetMyProfileUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  async execute(organizationId: string, userId: string) {
    const member = await this.repo.findMemberByUserId(organizationId, userId);
    if (!member) throw new DomainError('MEMBER_PROFILE_NOT_FOUND', 'No member profile linked');
    return member;
  }
}

@Injectable()
export class UpdateMyProfileUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  async execute(input: {
    organizationId: string;
    userId: string;
    phone?: string | null;
    alternateEmail?: string | null;
    photographFileId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const member = await this.repo.findMemberByUserId(input.organizationId, input.userId);
    if (!member) throw new DomainError('MEMBER_PROFILE_NOT_FOUND', 'No member profile linked');
    return this.repo.updateMember({
      organizationId: input.organizationId,
      id: member.id,
      phone: input.phone,
      alternateEmail:
        input.alternateEmail !== undefined
          ? (input.alternateEmail?.trim().toLowerCase() ?? null)
          : undefined,
      photographFileId: input.photographFileId,
      metadata: input.metadata,
    });
  }
}

@Injectable()
export class ListFieldDefinitionsUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  execute(organizationId: string) {
    return this.repo.listFieldDefinitions(organizationId);
  }
}

@Injectable()
export class CreateFieldDefinitionUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  async execute(input: {
    organizationId: string;
    key: string;
    label: string;
    dataType: string;
    options?: unknown;
    isRequired?: boolean;
    isUnique?: boolean;
    sortOrder?: number;
    visibility?: string;
  }) {
    const key = input.key.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      throw new DomainError('INVALID_FIELD_KEY', 'Field key must be snake_case');
    }
    if (!input.label.trim()) throw new DomainError('INVALID_TITLE', 'Label is required');
    return this.repo.createFieldDefinition({
      ...input,
      key,
      label: input.label.trim(),
    });
  }
}

@Injectable()
export class UpdateFieldDefinitionUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  execute(input: {
    organizationId: string;
    id: string;
    label?: string;
    options?: unknown;
    isRequired?: boolean;
    isUnique?: boolean;
    sortOrder?: number;
    visibility?: string;
  }) {
    return this.repo.updateFieldDefinition({
      ...input,
      label: input.label?.trim(),
    });
  }
}

@Injectable()
export class DeleteFieldDefinitionUseCase {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly repo: MemberRepository) {}
  async execute(organizationId: string, id: string) {
    await this.repo.softDeleteFieldDefinition(organizationId, id);
    return { ok: true as const };
  }
}
