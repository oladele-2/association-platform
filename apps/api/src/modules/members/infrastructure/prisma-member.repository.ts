import { Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { Prisma } from '@association/database';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { MemberStatus, Sex } from '../domain/member.rules';
import type {
  FieldDefinitionView,
  MemberRepository,
  MembershipTypeView,
  MemberView,
} from '../application/ports/member.repository';

@Injectable()
export class PrismaMemberRepository implements MemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listMembershipTypes(organizationId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.membershipType.findMany({
        where: { organizationId, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
      return rows.map(mapType);
    });
  }

  async ensureDefaultMembershipType(organizationId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const existing = await tx.membershipType.findFirst({
        where: { organizationId, deletedAt: null, isDefault: true },
      });
      if (existing) return mapType(existing);
      const any = await tx.membershipType.findFirst({
        where: { organizationId, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      });
      if (any) return mapType(any);
      const created = await tx.membershipType.create({
        data: {
          organizationId,
          code: 'STANDARD',
          name: 'Standard',
          isDefault: true,
          sortOrder: 0,
        },
      });
      return mapType(created);
    });
  }

  async createMembershipType(input: {
    organizationId: string;
    code: string;
    name: string;
    isDefault?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      if (input.isDefault) {
        await tx.membershipType.updateMany({
          where: { organizationId: input.organizationId, deletedAt: null },
          data: { isDefault: false },
        });
      }
      try {
        const row = await tx.membershipType.create({
          data: {
            organizationId: input.organizationId,
            code: input.code,
            name: input.name,
            isDefault: input.isDefault ?? false,
            sortOrder: input.sortOrder ?? 0,
          },
        });
        return mapType(row);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DomainError('CODE_TAKEN', 'Membership type code already exists');
        }
        throw err;
      }
    });
  }

  async updateMembershipType(input: {
    organizationId: string;
    id: string;
    name?: string;
    isDefault?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      if (input.isDefault) {
        await tx.membershipType.updateMany({
          where: { organizationId: input.organizationId, deletedAt: null },
          data: { isDefault: false },
        });
      }
      await tx.membershipType.updateMany({
        where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        },
      });
      const row = await tx.membershipType.findFirst({
        where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
      });
      if (!row) throw new DomainError('MEMBERSHIP_TYPE_NOT_FOUND', 'Membership type not found');
      return mapType(row);
    });
  }

  async listMembers(input: {
    organizationId: string;
    status?: MemberStatus;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));
    const skip = (page - 1) * limit;
    const q = input.q?.trim();

    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const where: Prisma.MemberWhereInput = {
        organizationId: input.organizationId,
        deletedAt: null,
        ...(input.status ? { status: input.status } : {}),
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { membershipNo: { contains: q, mode: 'insensitive' } },
                { alternateEmail: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [total, rows] = await Promise.all([
        tx.member.count({ where }),
        tx.member.findMany({
          where,
          include: { membershipType: true },
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          skip,
          take: limit,
        }),
      ]);
      return { items: rows.map(mapMember), page, limit, total };
    });
  }

  async findMemberById(organizationId: string, id: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.member.findFirst({
        where: { id, organizationId, deletedAt: null },
        include: { membershipType: true },
      });
      return row ? mapMember(row) : null;
    });
  }

  async findMemberByUserId(organizationId: string, userId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.member.findFirst({
        where: { organizationId, userId, deletedAt: null },
        include: { membershipType: true },
      });
      return row ? mapMember(row) : null;
    });
  }

  async createMember(input: {
    organizationId: string;
    membershipTypeId: string;
    membershipNo?: string | null;
    title?: string | null;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    sex?: Sex | null;
    dateOfBirth?: Date | null;
    phone?: string | null;
    alternateEmail?: string | null;
    photographFileId?: string | null;
    primaryInstitutionId?: string | null;
    userId?: string | null;
    joinedOn?: Date | null;
    metadata?: Record<string, unknown>;
    status?: MemberStatus;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const type = await tx.membershipType.findFirst({
        where: {
          id: input.membershipTypeId,
          organizationId: input.organizationId,
          deletedAt: null,
        },
      });
      if (!type) throw new DomainError('MEMBERSHIP_TYPE_NOT_FOUND', 'Membership type not found');

      try {
        const row = await tx.member.create({
          data: {
            organizationId: input.organizationId,
            membershipTypeId: input.membershipTypeId,
            membershipNo: input.membershipNo ?? null,
            title: input.title ?? null,
            firstName: input.firstName,
            middleName: input.middleName ?? null,
            lastName: input.lastName,
            sex: input.sex ?? null,
            dateOfBirth: input.dateOfBirth ?? null,
            phone: input.phone ?? null,
            alternateEmail: input.alternateEmail ?? null,
            photographFileId: input.photographFileId ?? null,
            primaryInstitutionId: input.primaryInstitutionId ?? null,
            userId: input.userId ?? null,
            joinedOn: input.joinedOn ?? null,
            metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
            status: input.status ?? 'draft',
            activatedAt: input.status === 'active' ? new Date() : null,
          },
          include: { membershipType: true },
        });
        return mapMember(row);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DomainError('MEMBER_CONFLICT', 'Member uniqueness conflict');
        }
        throw err;
      }
    });
  }

  async updateMember(input: {
    organizationId: string;
    id: string;
    membershipTypeId?: string;
    membershipNo?: string | null;
    title?: string | null;
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    sex?: Sex | null;
    dateOfBirth?: Date | null;
    phone?: string | null;
    alternateEmail?: string | null;
    photographFileId?: string | null;
    primaryInstitutionId?: string | null;
    userId?: string | null;
    joinedOn?: Date | null;
    metadata?: Record<string, unknown>;
    status?: MemberStatus;
    activatedAt?: Date | null;
    duesExempt?: boolean;
    duesExemptReason?: string | null;
    duesExemptApprovedById?: string | null;
    duesExemptApprovedAt?: Date | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.member.updateMany({
        where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
        data: {
          ...(input.membershipTypeId !== undefined
            ? { membershipTypeId: input.membershipTypeId }
            : {}),
          ...(input.membershipNo !== undefined ? { membershipNo: input.membershipNo } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
          ...(input.middleName !== undefined ? { middleName: input.middleName } : {}),
          ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
          ...(input.sex !== undefined ? { sex: input.sex } : {}),
          ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.alternateEmail !== undefined ? { alternateEmail: input.alternateEmail } : {}),
          ...(input.photographFileId !== undefined
            ? { photographFileId: input.photographFileId }
            : {}),
          ...(input.primaryInstitutionId !== undefined
            ? { primaryInstitutionId: input.primaryInstitutionId }
            : {}),
          ...(input.userId !== undefined ? { userId: input.userId } : {}),
          ...(input.joinedOn !== undefined ? { joinedOn: input.joinedOn } : {}),
          ...(input.metadata !== undefined
            ? { metadata: input.metadata as Prisma.InputJsonValue }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.activatedAt !== undefined ? { activatedAt: input.activatedAt } : {}),
          ...(input.duesExempt !== undefined ? { duesExempt: input.duesExempt } : {}),
          ...(input.duesExemptReason !== undefined
            ? { duesExemptReason: input.duesExemptReason }
            : {}),
          ...(input.duesExemptApprovedById !== undefined
            ? { duesExemptApprovedById: input.duesExemptApprovedById }
            : {}),
          ...(input.duesExemptApprovedAt !== undefined
            ? { duesExemptApprovedAt: input.duesExemptApprovedAt }
            : {}),
        },
      });
      const row = await tx.member.findFirst({
        where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
        include: { membershipType: true },
      });
      if (!row) throw new DomainError('MEMBER_NOT_FOUND', 'Member not found');
      return mapMember(row);
    });
  }

  async softDeleteMember(organizationId: string, id: string) {
    await this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.member.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: { deletedAt: new Date(), status: 'archived' },
      });
      if (result.count === 0) throw new DomainError('MEMBER_NOT_FOUND', 'Member not found');
    });
  }

  async listFieldDefinitions(organizationId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.fieldDefinition.findMany({
        where: { organizationId, entity: 'member', deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
      });
      return rows.map(mapField);
    });
  }

  async createFieldDefinition(input: {
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
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      try {
        const row = await tx.fieldDefinition.create({
          data: {
            organizationId: input.organizationId,
            entity: 'member',
            key: input.key,
            label: input.label,
            dataType: input.dataType as never,
            options:
              input.options === undefined ? undefined : (input.options as Prisma.InputJsonValue),
            isRequired: input.isRequired ?? false,
            isUnique: input.isUnique ?? false,
            sortOrder: input.sortOrder ?? 0,
            visibility: (input.visibility as never) ?? 'admin_and_member',
          },
        });
        return mapField(row);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DomainError('FIELD_KEY_TAKEN', 'Field key already exists');
        }
        throw err;
      }
    });
  }

  async updateFieldDefinition(input: {
    organizationId: string;
    id: string;
    label?: string;
    options?: unknown;
    isRequired?: boolean;
    isUnique?: boolean;
    sortOrder?: number;
    visibility?: string;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.fieldDefinition.updateMany({
        where: {
          id: input.id,
          organizationId: input.organizationId,
          entity: 'member',
          deletedAt: null,
        },
        data: {
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.options !== undefined
            ? { options: input.options as Prisma.InputJsonValue }
            : {}),
          ...(input.isRequired !== undefined ? { isRequired: input.isRequired } : {}),
          ...(input.isUnique !== undefined ? { isUnique: input.isUnique } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          ...(input.visibility !== undefined ? { visibility: input.visibility as never } : {}),
        },
      });
      const row = await tx.fieldDefinition.findFirst({
        where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
      });
      if (!row) throw new DomainError('FIELD_NOT_FOUND', 'Field definition not found');
      return mapField(row);
    });
  }

  async softDeleteFieldDefinition(organizationId: string, id: string) {
    await this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.fieldDefinition.updateMany({
        where: { id, organizationId, entity: 'member', deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (result.count === 0) {
        throw new DomainError('FIELD_NOT_FOUND', 'Field definition not found');
      }
    });
  }
}

function mapType(row: {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
  sortOrder: number;
}): MembershipTypeView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
  };
}

function mapMember(row: {
  id: string;
  organizationId: string;
  userId: string | null;
  membershipTypeId: string;
  membershipNo: string | null;
  title: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  sex: Sex | null;
  dateOfBirth: Date | null;
  phone: string | null;
  alternateEmail: string | null;
  photographFileId: string | null;
  primaryInstitutionId: string | null;
  status: MemberStatus;
  activatedAt: Date | null;
  duesExempt: boolean;
  duesExemptReason: string | null;
  joinedOn: Date | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  membershipType?: { code: string; name: string } | null;
}): MemberView {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    membershipTypeId: row.membershipTypeId,
    membershipTypeCode: row.membershipType?.code ?? null,
    membershipTypeName: row.membershipType?.name ?? null,
    membershipNo: row.membershipNo,
    title: row.title,
    firstName: row.firstName,
    middleName: row.middleName,
    lastName: row.lastName,
    sex: row.sex,
    dateOfBirth: row.dateOfBirth ? row.dateOfBirth.toISOString().slice(0, 10) : null,
    phone: row.phone,
    alternateEmail: row.alternateEmail,
    photographFileId: row.photographFileId,
    primaryInstitutionId: row.primaryInstitutionId,
    status: row.status,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    duesExempt: row.duesExempt,
    duesExemptReason: row.duesExemptReason,
    joinedOn: row.joinedOn ? row.joinedOn.toISOString().slice(0, 10) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapField(row: {
  id: string;
  key: string;
  label: string;
  dataType: string;
  options: Prisma.JsonValue | null;
  isRequired: boolean;
  isUnique: boolean;
  sortOrder: number;
  visibility: string;
}): FieldDefinitionView {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    dataType: row.dataType,
    options: row.options,
    isRequired: row.isRequired,
    isUnique: row.isUnique,
    sortOrder: row.sortOrder,
    visibility: row.visibility,
  };
}
