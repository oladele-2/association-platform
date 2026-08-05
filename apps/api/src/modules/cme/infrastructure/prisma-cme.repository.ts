import { Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { Prisma } from '@association/database';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { CmeStatus } from '../domain/cme.rules';
import type { CmeRepository, CmeSubmissionView } from '../application/ports/cme.repository';

@Injectable()
export class PrismaCmeRepository implements CmeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: {
    organizationId: string;
    memberId?: string;
    status?: CmeStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));
    const skip = (page - 1) * limit;
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const where: Prisma.CmeSubmissionWhereInput = {
        organizationId: input.organizationId,
        ...(input.memberId ? { memberId: input.memberId } : {}),
        ...(input.status ? { status: input.status } : {}),
      };
      const [total, rows] = await Promise.all([
        tx.cmeSubmission.count({ where }),
        tx.cmeSubmission.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);
      return { items: rows.map(mapCme), page, limit, total };
    });
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.cmeSubmission.findFirst({ where: { id, organizationId } });
      return row ? mapCme(row) : null;
    });
  }

  async create(input: {
    organizationId: string;
    memberId: string;
    fileId: string;
    title: string;
    provider?: string | null;
    creditHours?: string | null;
    completedOn?: Date | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const row = await tx.cmeSubmission.create({
        data: {
          organizationId: input.organizationId,
          memberId: input.memberId,
          fileId: input.fileId,
          title: input.title,
          provider: input.provider ?? null,
          creditHours: input.creditHours ?? null,
          completedOn: input.completedOn ?? null,
        },
      });
      return mapCme(row);
    });
  }

  async review(input: {
    organizationId: string;
    id: string;
    status: 'approved' | 'rejected';
    reviewerUserId: string;
    rejectionReason?: string | null;
  }) {
    const claimed = await this.reviewIfPending(input);
    if (!claimed) {
      const row = await this.findById(input.organizationId, input.id);
      if (!row) throw new DomainError('CME_NOT_FOUND', 'CME submission not found');
      throw new DomainError('CME_NOT_PENDING', 'Only pending CME submissions can be reviewed');
    }
    return claimed;
  }

  async reviewIfPending(input: {
    organizationId: string;
    id: string;
    status: 'approved' | 'rejected';
    reviewerUserId: string;
    rejectionReason?: string | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const cas = await tx.cmeSubmission.updateMany({
        where: {
          id: input.id,
          organizationId: input.organizationId,
          status: 'pending',
        },
        data: {
          status: input.status,
          reviewerUserId: input.reviewerUserId,
          reviewedAt: new Date(),
          rejectionReason: input.status === 'rejected' ? (input.rejectionReason ?? null) : null,
        },
      });
      if (cas.count === 0) return null;
      const row = await tx.cmeSubmission.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
      });
      if (!row) return null;
      return mapCme(row);
    });
  }

  async findMemberIdByUserId(organizationId: string, userId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.member.findFirst({
        where: { organizationId, userId, deletedAt: null },
        select: { id: true },
      });
      return row?.id ?? null;
    });
  }

  async findMemberUserId(organizationId: string, memberId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.member.findFirst({
        where: { id: memberId, organizationId, deletedAt: null },
        select: { userId: true },
      });
      return row?.userId ?? null;
    });
  }

  async writeOutbox(input: {
    organizationId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
  }) {
    await this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.domainEventOutbox.create({
        data: {
          organizationId: input.organizationId,
          eventType: input.eventType,
          aggregateType: input.aggregateType,
          aggregateId: input.aggregateId,
          payload: input.payload as Prisma.InputJsonValue,
        },
      });
    });
  }

  async createNotification(input: {
    organizationId: string;
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    await this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.notification.create({
        data: {
          organizationId: input.organizationId,
          userId: input.userId,
          channel: 'in_app',
          title: input.title,
          body: input.body,
          data: (input.data ?? {}) as Prisma.InputJsonValue,
        },
      });
    });
  }
}

function mapCme(row: {
  id: string;
  memberId: string;
  fileId: string;
  title: string;
  provider: string | null;
  creditHours: Prisma.Decimal | null;
  completedOn: Date | null;
  status: CmeStatus;
  reviewerUserId: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CmeSubmissionView {
  return {
    id: row.id,
    memberId: row.memberId,
    fileId: row.fileId,
    title: row.title,
    provider: row.provider,
    creditHours: row.creditHours != null ? row.creditHours.toString() : null,
    completedOn: row.completedOn ? row.completedOn.toISOString().slice(0, 10) : null,
    status: row.status,
    reviewerUserId: row.reviewerUserId,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
