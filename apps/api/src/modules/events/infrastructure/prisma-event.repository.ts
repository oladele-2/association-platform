import { Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { Prisma } from '@association/database';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { EventStatus } from '../domain/event.rules';
import type {
  EventRepository,
  EventSpeakerView,
  EventView,
} from '../application/ports/event.repository';

const speakerInclude = {
  speakers: { orderBy: { sortOrder: 'asc' as const } },
};

@Injectable()
export class PrismaEventRepository implements EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: {
    organizationId: string;
    status?: EventStatus;
    publishedOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));
    const skip = (page - 1) * limit;

    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const where: Prisma.EventWhereInput = {
        organizationId: input.organizationId,
        deletedAt: null,
        ...(input.status ? { status: input.status } : {}),
        ...(input.publishedOnly ? { status: 'published' } : {}),
      };
      const [total, rows] = await Promise.all([
        tx.event.count({ where }),
        tx.event.findMany({
          where,
          include: speakerInclude,
          orderBy: { startsAt: 'asc' },
          skip,
          take: limit,
        }),
      ]);
      return { items: rows.map(mapEvent), page, limit, total };
    });
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.event.findFirst({
        where: { id, organizationId, deletedAt: null },
        include: speakerInclude,
      });
      return row ? mapEvent(row) : null;
    });
  }

  async findBySlug(organizationId: string, slug: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.event.findFirst({
        where: { organizationId, slug, deletedAt: null },
        include: speakerInclude,
      });
      return row ? mapEvent(row) : null;
    });
  }

  async create(input: {
    organizationId: string;
    slug: string;
    title: string;
    description?: string | null;
    venue?: string | null;
    startsAt: Date;
    endsAt?: Date | null;
    registrationOpensAt?: Date | null;
    registrationClosesAt?: Date | null;
    capacity?: number | null;
    coverFileId?: string | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      try {
        const row = await tx.event.create({
          data: {
            organizationId: input.organizationId,
            slug: input.slug,
            title: input.title,
            description: input.description ?? null,
            venue: input.venue ?? null,
            startsAt: input.startsAt,
            endsAt: input.endsAt ?? null,
            registrationOpensAt: input.registrationOpensAt ?? null,
            registrationClosesAt: input.registrationClosesAt ?? null,
            capacity: input.capacity ?? null,
            coverFileId: input.coverFileId ?? null,
            status: 'draft',
          },
          include: speakerInclude,
        });
        return mapEvent(row);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DomainError('SLUG_TAKEN', 'Event slug already exists');
        }
        throw err;
      }
    });
  }

  async update(input: {
    organizationId: string;
    id: string;
    slug?: string;
    title?: string;
    description?: string | null;
    venue?: string | null;
    startsAt?: Date;
    endsAt?: Date | null;
    registrationOpensAt?: Date | null;
    registrationClosesAt?: Date | null;
    capacity?: number | null;
    coverFileId?: string | null;
    status?: EventStatus;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.event.updateMany({
        where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
        data: {
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.venue !== undefined ? { venue: input.venue } : {}),
          ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
          ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
          ...(input.registrationOpensAt !== undefined
            ? { registrationOpensAt: input.registrationOpensAt }
            : {}),
          ...(input.registrationClosesAt !== undefined
            ? { registrationClosesAt: input.registrationClosesAt }
            : {}),
          ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
          ...(input.coverFileId !== undefined ? { coverFileId: input.coverFileId } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
      const row = await tx.event.findFirst({
        where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
        include: speakerInclude,
      });
      if (!row) throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
      return mapEvent(row);
    });
  }

  async softDelete(organizationId: string, id: string) {
    await this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.event.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (result.count === 0) throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    });
  }

  async publish(organizationId: string, id: string) {
    return this.update({ organizationId, id, status: 'published' });
  }

  async cancel(organizationId: string, id: string) {
    return this.update({ organizationId, id, status: 'cancelled' });
  }

  async replaceSpeakers(
    organizationId: string,
    eventId: string,
    speakers: Array<{
      name: string;
      title?: string | null;
      bio?: string | null;
      photoFileId?: string | null;
      sortOrder?: number;
    }>,
  ) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const event = await tx.event.findFirst({
        where: { id: eventId, organizationId, deletedAt: null },
      });
      if (!event) throw new DomainError('EVENT_NOT_FOUND', 'Event not found');

      await tx.eventSpeaker.deleteMany({ where: { eventId, organizationId } });
      if (speakers.length > 0) {
        await tx.eventSpeaker.createMany({
          data: speakers.map((s, index) => ({
            organizationId,
            eventId,
            name: s.name.trim(),
            title: s.title ?? null,
            bio: s.bio ?? null,
            photoFileId: s.photoFileId ?? null,
            sortOrder: s.sortOrder ?? index,
          })),
        });
      }

      const row = await tx.event.findFirstOrThrow({
        where: { id: eventId },
        include: speakerInclude,
      });
      return mapEvent(row);
    });
  }
}

function mapSpeaker(row: {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photoFileId: string | null;
  sortOrder: number;
}): EventSpeakerView {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    bio: row.bio,
    photoFileId: row.photoFileId,
    sortOrder: row.sortOrder,
  };
}

function mapEvent(row: {
  id: string;
  organizationId: string;
  slug: string;
  title: string;
  description: string | null;
  venue: string | null;
  startsAt: Date;
  endsAt: Date | null;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  capacity: number | null;
  status: EventStatus;
  coverFileId: string | null;
  createdAt: Date;
  updatedAt: Date;
  speakers: Array<{
    id: string;
    name: string;
    title: string | null;
    bio: string | null;
    photoFileId: string | null;
    sortOrder: number;
  }>;
}): EventView {
  return {
    id: row.id,
    organizationId: row.organizationId,
    slug: row.slug,
    title: row.title,
    description: row.description,
    venue: row.venue,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    registrationOpensAt: row.registrationOpensAt?.toISOString() ?? null,
    registrationClosesAt: row.registrationClosesAt?.toISOString() ?? null,
    capacity: row.capacity,
    status: row.status,
    coverFileId: row.coverFileId,
    speakers: row.speakers.map(mapSpeaker),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
