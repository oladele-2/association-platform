import { Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { Prisma } from '@association/database';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { EmploymentStatus, InstitutionOwnership } from '../domain/institution.rules';
import type {
  InstitutionAdminView,
  InstitutionMemberLinkView,
  InstitutionRepository,
  InstitutionView,
} from '../application/ports/institution.repository';

@Injectable()
export class PrismaInstitutionRepository implements InstitutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listInstitutions(input: {
    organizationId: string;
    q?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));
    const skip = (page - 1) * limit;
    const q = input.q?.trim();

    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const where: Prisma.InstitutionWhereInput = {
        organizationId: input.organizationId,
        deletedAt: null,
        ...(input.status ? { status: input.status } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [total, rows] = await Promise.all([
        tx.institution.count({ where }),
        tx.institution.findMany({
          where,
          orderBy: { name: 'asc' },
          skip,
          take: limit,
        }),
      ]);
      return { items: rows.map(mapInstitution), page, limit, total };
    });
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.institution.findFirst({
        where: { id, organizationId, deletedAt: null },
      });
      return row ? mapInstitution(row) : null;
    });
  }

  async createInstitution(input: {
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
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const row = await tx.institution.create({
        data: {
          organizationId: input.organizationId,
          code: input.code ?? null,
          name: input.name,
          institutionType: input.institutionType,
          ownership: input.ownership ?? null,
          state: input.state ?? null,
          lga: input.lga ?? null,
          address: input.address ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
          isAgpmpnMember: input.isAgpmpnMember ?? false,
          status: input.status ?? 'active',
        },
      });
      return mapInstitution(row);
    });
  }

  async updateInstitution(input: {
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
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.institution.updateMany({
        where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
        data: {
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.institutionType !== undefined
            ? { institutionType: input.institutionType }
            : {}),
          ...(input.ownership !== undefined ? { ownership: input.ownership } : {}),
          ...(input.state !== undefined ? { state: input.state } : {}),
          ...(input.lga !== undefined ? { lga: input.lga } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.isAgpmpnMember !== undefined ? { isAgpmpnMember: input.isAgpmpnMember } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
      const row = await tx.institution.findFirst({
        where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
      });
      if (!row) throw new DomainError('INSTITUTION_NOT_FOUND', 'Institution not found');
      return mapInstitution(row);
    });
  }

  async softDeleteInstitution(organizationId: string, id: string) {
    await this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.institution.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: { deletedAt: new Date(), status: 'archived' },
      });
      if (result.count === 0) {
        throw new DomainError('INSTITUTION_NOT_FOUND', 'Institution not found');
      }
    });
  }

  async listAdmins(organizationId: string, institutionId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.institutionAdmin.findMany({
        where: { organizationId, institutionId },
        orderBy: { createdAt: 'asc' },
      });
      return rows.map(mapAdmin);
    });
  }

  async assignAdmin(input: { organizationId: string; institutionId: string; userId: string }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          id: input.userId,
          organizationId: input.organizationId,
          deletedAt: null,
        },
      });
      if (!user) throw new DomainError('USER_NOT_FOUND', 'User not found');

      try {
        const row = await tx.institutionAdmin.create({
          data: {
            organizationId: input.organizationId,
            institutionId: input.institutionId,
            userId: input.userId,
          },
        });
        return mapAdmin(row);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DomainError('ADMIN_ALREADY_ASSIGNED', 'User is already an institution admin');
        }
        throw err;
      }
    });
  }

  async revokeAdmin(organizationId: string, institutionId: string, adminId: string) {
    await this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.institutionAdmin.deleteMany({
        where: { id: adminId, organizationId, institutionId },
      });
      if (result.count === 0) {
        throw new DomainError('ADMIN_ASSIGNMENT_NOT_FOUND', 'Institution admin not found');
      }
    });
  }

  async isInstitutionAdmin(organizationId: string, institutionId: string, userId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.institutionAdmin.findFirst({
        where: { organizationId, institutionId, userId },
      });
      return Boolean(row);
    });
  }

  async listInstitutionsForAdmin(organizationId: string, userId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.institution.findMany({
        where: {
          organizationId,
          deletedAt: null,
          admins: { some: { userId } },
        },
        orderBy: { name: 'asc' },
      });
      return rows.map(mapInstitution);
    });
  }

  async listMembers(organizationId: string, institutionId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.institutionMember.findMany({
        where: { organizationId, institutionId },
        include: { member: true },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });
      return rows.map(mapLink);
    });
  }

  async linkMember(input: {
    organizationId: string;
    institutionId: string;
    memberId: string;
    employmentStatus?: EmploymentStatus;
    isPrimary?: boolean;
    startedOn?: Date | null;
    endedOn?: Date | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      if (input.isPrimary) {
        await tx.institutionMember.updateMany({
          where: {
            organizationId: input.organizationId,
            memberId: input.memberId,
          },
          data: { isPrimary: false },
        });
        await tx.member.updateMany({
          where: {
            id: input.memberId,
            organizationId: input.organizationId,
            deletedAt: null,
          },
          data: { primaryInstitutionId: input.institutionId },
        });
      }

      const row = await tx.institutionMember.create({
        data: {
          organizationId: input.organizationId,
          institutionId: input.institutionId,
          memberId: input.memberId,
          employmentStatus: input.employmentStatus ?? 'active',
          isPrimary: input.isPrimary ?? false,
          startedOn: input.startedOn ?? null,
          endedOn: input.endedOn ?? null,
        },
        include: { member: true },
      });
      return mapLink(row);
    });
  }

  async updateMemberLink(input: {
    organizationId: string;
    institutionId: string;
    linkId: string;
    employmentStatus?: EmploymentStatus;
    isPrimary?: boolean;
    startedOn?: Date | null;
    endedOn?: Date | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const existing = await tx.institutionMember.findFirst({
        where: {
          id: input.linkId,
          organizationId: input.organizationId,
          institutionId: input.institutionId,
        },
      });
      if (!existing) {
        throw new DomainError('INSTITUTION_LINK_NOT_FOUND', 'Institution member link not found');
      }

      if (input.isPrimary) {
        await tx.institutionMember.updateMany({
          where: {
            organizationId: input.organizationId,
            memberId: existing.memberId,
          },
          data: { isPrimary: false },
        });
        await tx.member.updateMany({
          where: {
            id: existing.memberId,
            organizationId: input.organizationId,
            deletedAt: null,
          },
          data: { primaryInstitutionId: input.institutionId },
        });
      }

      await tx.institutionMember.updateMany({
        where: {
          id: input.linkId,
          organizationId: input.organizationId,
          institutionId: input.institutionId,
        },
        data: {
          ...(input.employmentStatus !== undefined
            ? { employmentStatus: input.employmentStatus }
            : {}),
          ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
          ...(input.startedOn !== undefined ? { startedOn: input.startedOn } : {}),
          ...(input.endedOn !== undefined ? { endedOn: input.endedOn } : {}),
        },
      });

      const row = await tx.institutionMember.findFirst({
        where: { id: input.linkId },
        include: { member: true },
      });
      if (!row) {
        throw new DomainError('INSTITUTION_LINK_NOT_FOUND', 'Institution member link not found');
      }
      return mapLink(row);
    });
  }

  async unlinkMember(organizationId: string, institutionId: string, linkId: string) {
    await this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.institutionMember.deleteMany({
        where: { id: linkId, organizationId, institutionId },
      });
      if (result.count === 0) {
        throw new DomainError('INSTITUTION_LINK_NOT_FOUND', 'Institution member link not found');
      }
    });
  }

  async memberExists(organizationId: string, memberId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.member.findFirst({
        where: { id: memberId, organizationId, deletedAt: null },
        select: { id: true },
      });
      return Boolean(row);
    });
  }
}

function mapInstitution(row: {
  id: string;
  organizationId: string;
  code: string | null;
  name: string;
  institutionType: string;
  ownership: InstitutionOwnership | null;
  state: string | null;
  lga: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isAgpmpnMember: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): InstitutionView {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    name: row.name,
    institutionType: row.institutionType,
    ownership: row.ownership,
    state: row.state,
    lga: row.lga,
    address: row.address,
    phone: row.phone,
    email: row.email,
    isAgpmpnMember: row.isAgpmpnMember,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapAdmin(row: {
  id: string;
  institutionId: string;
  userId: string;
  createdAt: Date;
}): InstitutionAdminView {
  return {
    id: row.id,
    institutionId: row.institutionId,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapLink(row: {
  id: string;
  institutionId: string;
  memberId: string;
  employmentStatus: EmploymentStatus;
  isPrimary: boolean;
  startedOn: Date | null;
  endedOn: Date | null;
  member?: {
    firstName: string;
    lastName: string;
    membershipNo: string | null;
  } | null;
}): InstitutionMemberLinkView {
  return {
    id: row.id,
    institutionId: row.institutionId,
    memberId: row.memberId,
    employmentStatus: row.employmentStatus,
    isPrimary: row.isPrimary,
    startedOn: row.startedOn ? row.startedOn.toISOString().slice(0, 10) : null,
    endedOn: row.endedOn ? row.endedOn.toISOString().slice(0, 10) : null,
    memberFirstName: row.member?.firstName ?? null,
    memberLastName: row.member?.lastName ?? null,
    membershipNo: row.member?.membershipNo ?? null,
  };
}
