import { Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { Prisma } from '@association/database';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type {
  CommitteeMemberView,
  CommitteeRepository,
  CommitteeView,
} from '../application/ports/committee.repository';

const memberInclude = {
  members: { orderBy: { sortOrder: 'asc' as const } },
};

@Injectable()
export class PrismaCommitteeRepository implements CommitteeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.committee.findMany({
        where: { organizationId, deletedAt: null },
        include: memberInclude,
        orderBy: { name: 'asc' },
      });
      return rows.map(mapCommittee);
    });
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.committee.findFirst({
        where: { id, organizationId, deletedAt: null },
        include: memberInclude,
      });
      return row ? mapCommittee(row) : null;
    });
  }

  async findBySlug(organizationId: string, slug: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.committee.findFirst({
        where: { organizationId, slug, deletedAt: null },
        include: memberInclude,
      });
      return row ? mapCommittee(row) : null;
    });
  }

  async create(input: {
    organizationId: string;
    name: string;
    slug: string;
    description?: string | null;
    contentItemId?: string | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      try {
        const row = await tx.committee.create({
          data: {
            organizationId: input.organizationId,
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            contentItemId: input.contentItemId ?? null,
          },
          include: memberInclude,
        });
        return mapCommittee(row);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DomainError('SLUG_TAKEN', 'Committee slug already exists');
        }
        throw err;
      }
    });
  }

  async update(input: {
    organizationId: string;
    id: string;
    name?: string;
    slug?: string;
    description?: string | null;
    contentItemId?: string | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.committee.updateMany({
        where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.contentItemId !== undefined ? { contentItemId: input.contentItemId } : {}),
        },
      });
      const row = await tx.committee.findFirst({
        where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
        include: memberInclude,
      });
      if (!row) throw new DomainError('COMMITTEE_NOT_FOUND', 'Committee not found');
      return mapCommittee(row);
    });
  }

  async softDelete(organizationId: string, id: string) {
    await this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.committee.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (result.count === 0) {
        throw new DomainError('COMMITTEE_NOT_FOUND', 'Committee not found');
      }
    });
  }

  async replaceMembers(
    organizationId: string,
    committeeId: string,
    members: Array<{
      memberId?: string | null;
      displayName: string;
      roleTitle?: string | null;
      sortOrder?: number;
      startedOn?: string | null;
      endedOn?: string | null;
    }>,
  ) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const committee = await tx.committee.findFirst({
        where: { id: committeeId, organizationId, deletedAt: null },
      });
      if (!committee) throw new DomainError('COMMITTEE_NOT_FOUND', 'Committee not found');

      await tx.committeeMember.deleteMany({ where: { committeeId, organizationId } });
      if (members.length > 0) {
        await tx.committeeMember.createMany({
          data: members.map((m, index) => ({
            organizationId,
            committeeId,
            memberId: m.memberId ?? null,
            displayName: m.displayName.trim(),
            roleTitle: m.roleTitle ?? null,
            sortOrder: m.sortOrder ?? index,
            startedOn: m.startedOn ? new Date(m.startedOn) : null,
            endedOn: m.endedOn ? new Date(m.endedOn) : null,
          })),
        });
      }

      const row = await tx.committee.findFirstOrThrow({
        where: { id: committeeId },
        include: memberInclude,
      });
      return mapCommittee(row);
    });
  }
}

function mapMember(row: {
  id: string;
  memberId: string | null;
  displayName: string;
  roleTitle: string | null;
  sortOrder: number;
  startedOn: Date | null;
  endedOn: Date | null;
}): CommitteeMemberView {
  return {
    id: row.id,
    memberId: row.memberId,
    displayName: row.displayName,
    roleTitle: row.roleTitle,
    sortOrder: row.sortOrder,
    startedOn: row.startedOn ? row.startedOn.toISOString().slice(0, 10) : null,
    endedOn: row.endedOn ? row.endedOn.toISOString().slice(0, 10) : null,
  };
}

function mapCommittee(row: {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  contentItemId: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: Array<{
    id: string;
    memberId: string | null;
    displayName: string;
    roleTitle: string | null;
    sortOrder: number;
    startedOn: Date | null;
    endedOn: Date | null;
  }>;
}): CommitteeView {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    contentItemId: row.contentItemId,
    members: row.members.map(mapMember),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
