import { Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { Prisma } from '@association/database';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { ContentStatus, ContentType } from '../domain/content.rules';
import type {
  ContentListQuery,
  ContentListResult,
  ContentRepository,
  ContentView,
  CreateContentInput,
  UpdateContentInput,
} from '../application/ports/content.repository';

@Injectable()
export class PrismaContentRepository implements ContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ContentListQuery): Promise<ContentListResult> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    return this.prisma.asTenant(query.organizationId, async (tx) => {
      const where: Prisma.ContentItemWhereInput = {
        organizationId: query.organizationId,
        deletedAt: null,
        ...(query.type ? { type: query.type } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.publishedOnly ? { status: 'published' } : {}),
      };

      const [total, rows] = await Promise.all([
        tx.contentItem.count({ where }),
        tx.contentItem.findMany({
          where,
          orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
      ]);

      return { items: rows.map(mapContent), page, limit, total };
    });
  }

  async findById(organizationId: string, id: string): Promise<ContentView | null> {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.contentItem.findFirst({
        where: { id, organizationId, deletedAt: null },
      });
      return row ? mapContent(row) : null;
    });
  }

  async findBySlug(
    organizationId: string,
    type: ContentType,
    slug: string,
  ): Promise<ContentView | null> {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.contentItem.findFirst({
        where: { organizationId, type, slug, deletedAt: null },
      });
      return row ? mapContent(row) : null;
    });
  }

  async create(input: CreateContentInput): Promise<ContentView> {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      try {
        const row = await tx.contentItem.create({
          data: {
            organizationId: input.organizationId,
            type: input.type,
            slug: input.slug,
            title: input.title,
            subtitle: input.subtitle ?? null,
            bodyMarkdown: input.bodyMarkdown ?? null,
            bodyJson:
              input.bodyJson === undefined ? undefined : (input.bodyJson as Prisma.InputJsonValue),
            excerpt: input.excerpt ?? null,
            coverFileId: input.coverFileId ?? null,
            seoTitle: input.seoTitle ?? null,
            seoDescription: input.seoDescription ?? null,
            ogImageFileId: input.ogImageFileId ?? null,
            sortOrder: input.sortOrder ?? 0,
            attributes: (input.attributes ?? {}) as Prisma.InputJsonValue,
            authorUserId: input.authorUserId ?? null,
            scheduledAt: input.scheduledAt ?? null,
            status: input.scheduledAt ? 'scheduled' : 'draft',
          },
        });
        return mapContent(row);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DomainError('SLUG_TAKEN', 'Slug already used for this content type');
        }
        throw err;
      }
    });
  }

  async update(input: UpdateContentInput): Promise<ContentView> {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      try {
        await tx.contentItem.updateMany({
          where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
          data: {
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
            ...(input.slug !== undefined ? { slug: input.slug } : {}),
            ...(input.bodyMarkdown !== undefined ? { bodyMarkdown: input.bodyMarkdown } : {}),
            ...(input.bodyJson !== undefined
              ? { bodyJson: input.bodyJson as Prisma.InputJsonValue }
              : {}),
            ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
            ...(input.coverFileId !== undefined ? { coverFileId: input.coverFileId } : {}),
            ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle } : {}),
            ...(input.seoDescription !== undefined ? { seoDescription: input.seoDescription } : {}),
            ...(input.ogImageFileId !== undefined ? { ogImageFileId: input.ogImageFileId } : {}),
            ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
            ...(input.attributes !== undefined
              ? { attributes: input.attributes as Prisma.InputJsonValue }
              : {}),
            ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DomainError('SLUG_TAKEN', 'Slug already used for this content type');
        }
        throw err;
      }

      const row = await tx.contentItem.findFirst({
        where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
      });
      if (!row) throw new DomainError('CONTENT_NOT_FOUND', 'Content not found');
      return mapContent(row);
    });
  }

  async softDelete(organizationId: string, id: string): Promise<void> {
    await this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.contentItem.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: { deletedAt: new Date(), status: 'archived' },
      });
      if (result.count === 0) {
        throw new DomainError('CONTENT_NOT_FOUND', 'Content not found');
      }
    });
  }

  async publish(organizationId: string, id: string, at: Date): Promise<ContentView> {
    return this.prisma.asTenant(organizationId, async (tx) => {
      await tx.contentItem.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: { status: 'published', publishedAt: at, scheduledAt: null },
      });
      const row = await tx.contentItem.findFirst({
        where: { id, organizationId, deletedAt: null },
      });
      if (!row) throw new DomainError('CONTENT_NOT_FOUND', 'Content not found');
      return mapContent(row);
    });
  }

  async unpublish(organizationId: string, id: string): Promise<ContentView> {
    return this.prisma.asTenant(organizationId, async (tx) => {
      await tx.contentItem.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: { status: 'draft', publishedAt: null },
      });
      const row = await tx.contentItem.findFirst({
        where: { id, organizationId, deletedAt: null },
      });
      if (!row) throw new DomainError('CONTENT_NOT_FOUND', 'Content not found');
      return mapContent(row);
    });
  }
}

function mapContent(row: {
  id: string;
  organizationId: string;
  type: ContentType;
  slug: string;
  title: string;
  subtitle: string | null;
  bodyMarkdown: string | null;
  bodyJson: Prisma.JsonValue | null;
  excerpt: string | null;
  coverFileId: string | null;
  status: ContentStatus;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageFileId: string | null;
  sortOrder: number;
  attributes: Prisma.JsonValue;
  authorUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ContentView {
  return {
    id: row.id,
    organizationId: row.organizationId,
    type: row.type,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    bodyMarkdown: row.bodyMarkdown,
    bodyJson: row.bodyJson,
    excerpt: row.excerpt,
    coverFileId: row.coverFileId,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    ogImageFileId: row.ogImageFileId,
    sortOrder: row.sortOrder,
    attributes: (row.attributes as Record<string, unknown>) ?? {},
    authorUserId: row.authorUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
