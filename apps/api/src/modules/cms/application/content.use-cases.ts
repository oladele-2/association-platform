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
  constructor(@Inject(CONTENT_REPOSITORY) private readonly repo: ContentRepository) {}

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
    return this.repo.create({
      ...input,
      slug,
      title: input.title.trim(),
    });
  }
}

@Injectable()
export class UpdateContentUseCase {
  constructor(@Inject(CONTENT_REPOSITORY) private readonly repo: ContentRepository) {}

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
