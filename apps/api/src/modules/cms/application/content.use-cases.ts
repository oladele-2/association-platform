import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import {
  assertCanPublish,
  assertContentSlug,
  PUBLIC_CONTENT_TYPES,
  type ContentType,
} from '../domain/content.rules';
import {
  CONTENT_REPOSITORY,
  type ContentRepository,
  type CreateContentInput,
  type UpdateContentInput,
} from './ports/content.repository';
import { GetReadyFileUseCase } from '../../files/application/file.use-cases';
import { EMAIL_SENDER, type EmailSender } from '../../identity/application/ports/email.sender';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class ListContentUseCase {
  constructor(@Inject(CONTENT_REPOSITORY) private readonly repo: ContentRepository) {}

  execute(query: Parameters<ContentRepository['list']>[0]) {
    return this.repo.list(query);
  }
}

@Injectable()
export class GetContentUseCase {
  constructor(@Inject(CONTENT_REPOSITORY) private readonly repo: ContentRepository) {}

  async byId(organizationId: string, id: string) {
    const item = await this.repo.findById(organizationId, id);
    if (!item) throw new DomainError('CONTENT_NOT_FOUND', 'Content not found');
    return item;
  }

  async bySlug(organizationId: string, type: ContentType, slug: string) {
    const item = await this.repo.findBySlug(organizationId, type, slug);
    if (!item) throw new DomainError('CONTENT_NOT_FOUND', 'Content not found');
    return item;
  }
}

@Injectable()
export class CreateContentUseCase {
  constructor(
    @Inject(CONTENT_REPOSITORY) private readonly repo: ContentRepository,
    private readonly getReadyFile: GetReadyFileUseCase,
  ) {}

  async execute(input: CreateContentInput) {
    if (!input.title.trim()) {
      throw new DomainError('INVALID_TITLE', 'Title is required');
    }
    if (!PUBLIC_CONTENT_TYPES.includes(input.type) && input.type !== 'committee') {
      throw new DomainError('INVALID_CONTENT_TYPE', 'Unsupported content type');
    }
    const slug = assertContentSlug(input.slug);
    const existing = await this.repo.findBySlug(input.organizationId, input.type, slug);
    if (existing) {
      throw new DomainError('SLUG_TAKEN', 'Slug already used for this content type');
    }
    await assertCmsFiles(this.getReadyFile, input.organizationId, {
      coverFileId: input.coverFileId,
      ogImageFileId: input.ogImageFileId,
    });
    return this.repo.create({
      ...input,
      slug,
      title: input.title.trim(),
    });
  }
}

@Injectable()
export class UpdateContentUseCase {
  constructor(
    @Inject(CONTENT_REPOSITORY) private readonly repo: ContentRepository,
    private readonly getReadyFile: GetReadyFileUseCase,
  ) {}

  async execute(input: UpdateContentInput) {
    const existing = await this.repo.findById(input.organizationId, input.id);
    if (!existing) throw new DomainError('CONTENT_NOT_FOUND', 'Content not found');

    let slug = input.slug;
    if (slug !== undefined) {
      slug = assertContentSlug(slug);
      const clash = await this.repo.findBySlug(input.organizationId, existing.type, slug);
      if (clash && clash.id !== existing.id) {
        throw new DomainError('SLUG_TAKEN', 'Slug already used for this content type');
      }
    }

    await assertCmsFiles(this.getReadyFile, input.organizationId, {
      coverFileId: input.coverFileId,
      ogImageFileId: input.ogImageFileId,
    });

    return this.repo.update({
      ...input,
      slug,
      title: input.title?.trim(),
    });
  }
}

@Injectable()
export class DeleteContentUseCase {
  constructor(@Inject(CONTENT_REPOSITORY) private readonly repo: ContentRepository) {}

  async execute(organizationId: string, id: string) {
    const existing = await this.repo.findById(organizationId, id);
    if (!existing) throw new DomainError('CONTENT_NOT_FOUND', 'Content not found');
    await this.repo.softDelete(organizationId, id);
    return { ok: true as const };
  }
}

@Injectable()
export class PublishContentUseCase {
  constructor(@Inject(CONTENT_REPOSITORY) private readonly repo: ContentRepository) {}

  async execute(organizationId: string, id: string) {
    const existing = await this.repo.findById(organizationId, id);
    if (!existing) throw new DomainError('CONTENT_NOT_FOUND', 'Content not found');
    assertCanPublish(existing.status);
    return this.repo.publish(organizationId, id, new Date());
  }
}

@Injectable()
export class UnpublishContentUseCase {
  constructor(@Inject(CONTENT_REPOSITORY) private readonly repo: ContentRepository) {}

  async execute(organizationId: string, id: string) {
    const existing = await this.repo.findById(organizationId, id);
    if (!existing) throw new DomainError('CONTENT_NOT_FOUND', 'Content not found');
    if (existing.status !== 'published' && existing.status !== 'scheduled') {
      throw new DomainError('CONTENT_NOT_PUBLISHED', 'Content is not published');
    }
    return this.repo.unpublish(organizationId, id);
  }
}

/** Accept public contact form; deliver via org branding inbox (console/provider). */
@Injectable()
export class SubmitPublicContactUseCase {
  constructor(
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: {
    organizationId: string;
    name: string;
    email: string;
    subject: string;
    body: string;
  }) {
    const name = input.name.trim();
    const email = input.email.trim();
    const subject = input.subject.trim();
    const body = input.body.trim();
    if (!name || !email || !subject || !body) {
      throw new DomainError('INVALID_CONTACT', 'Name, email, subject, and message are required');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new DomainError('INVALID_EMAIL', 'A valid email is required');
    }

    const inbox = await this.prisma.asPlatform(async (tx) => {
      const branding = await tx.organizationBranding.findUnique({
        where: { organizationId: input.organizationId },
      });
      return branding?.emailFromAddress?.trim() || null;
    });

    if (!inbox) {
      throw new DomainError(
        'CONTACT_NOT_CONFIGURED',
        'This organization has not configured a contact inbox yet',
      );
    }

    await this.email.send({
      to: inbox,
      subject: `[Website contact] ${subject}`,
      text: [`From: ${name} <${email}>`, '', body].join('\n'),
    });

    return { ok: true as const };
  }
}

async function assertCmsFiles(
  getReadyFile: GetReadyFileUseCase,
  organizationId: string,
  files: { coverFileId?: string | null; ogImageFileId?: string | null },
) {
  for (const id of [files.coverFileId, files.ogImageFileId]) {
    if (!id) continue;
    await getReadyFile.execute(organizationId, id, { purposes: ['cms', 'branding'] });
  }
}
