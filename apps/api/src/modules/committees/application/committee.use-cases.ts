import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { assertCommitteeSlug } from '../domain/committee.rules';
import { COMMITTEE_REPOSITORY, type CommitteeRepository } from './ports/committee.repository';

@Injectable()
export class ListCommitteesUseCase {
  constructor(@Inject(COMMITTEE_REPOSITORY) private readonly repo: CommitteeRepository) {}

  execute(organizationId: string) {
    return this.repo.list(organizationId);
  }
}

@Injectable()
export class GetCommitteeUseCase {
  constructor(@Inject(COMMITTEE_REPOSITORY) private readonly repo: CommitteeRepository) {}

  async byId(organizationId: string, id: string) {
    const item = await this.repo.findById(organizationId, id);
    if (!item) throw new DomainError('COMMITTEE_NOT_FOUND', 'Committee not found');
    return item;
  }

  async bySlug(organizationId: string, slug: string) {
    const item = await this.repo.findBySlug(organizationId, slug);
    if (!item) throw new DomainError('COMMITTEE_NOT_FOUND', 'Committee not found');
    return item;
  }
}

@Injectable()
export class CreateCommitteeUseCase {
  constructor(@Inject(COMMITTEE_REPOSITORY) private readonly repo: CommitteeRepository) {}

  async execute(input: {
    organizationId: string;
    name: string;
    slug: string;
    description?: string | null;
    contentItemId?: string | null;
  }) {
    if (!input.name.trim()) {
      throw new DomainError('INVALID_TITLE', 'Committee name is required');
    }
    const slug = assertCommitteeSlug(input.slug);
    const existing = await this.repo.findBySlug(input.organizationId, slug);
    if (existing) throw new DomainError('SLUG_TAKEN', 'Committee slug already exists');
    return this.repo.create({
      organizationId: input.organizationId,
      name: input.name.trim(),
      slug,
      description: input.description,
      contentItemId: input.contentItemId,
    });
  }
}

@Injectable()
export class UpdateCommitteeUseCase {
  constructor(@Inject(COMMITTEE_REPOSITORY) private readonly repo: CommitteeRepository) {}

  async execute(input: {
    organizationId: string;
    id: string;
    name?: string;
    slug?: string;
    description?: string | null;
    contentItemId?: string | null;
  }) {
    const existing = await this.repo.findById(input.organizationId, input.id);
    if (!existing) throw new DomainError('COMMITTEE_NOT_FOUND', 'Committee not found');
    const slug = input.slug !== undefined ? assertCommitteeSlug(input.slug) : undefined;
    if (slug) {
      const clash = await this.repo.findBySlug(input.organizationId, slug);
      if (clash && clash.id !== existing.id) {
        throw new DomainError('SLUG_TAKEN', 'Committee slug already exists');
      }
    }
    return this.repo.update({
      ...input,
      slug,
      name: input.name?.trim(),
    });
  }
}

@Injectable()
export class DeleteCommitteeUseCase {
  constructor(@Inject(COMMITTEE_REPOSITORY) private readonly repo: CommitteeRepository) {}

  async execute(organizationId: string, id: string) {
    const existing = await this.repo.findById(organizationId, id);
    if (!existing) throw new DomainError('COMMITTEE_NOT_FOUND', 'Committee not found');
    await this.repo.softDelete(organizationId, id);
    return { ok: true as const };
  }
}

@Injectable()
export class ReplaceCommitteeMembersUseCase {
  constructor(@Inject(COMMITTEE_REPOSITORY) private readonly repo: CommitteeRepository) {}

  async execute(
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
    const existing = await this.repo.findById(organizationId, committeeId);
    if (!existing) throw new DomainError('COMMITTEE_NOT_FOUND', 'Committee not found');
    for (const m of members) {
      if (!m.displayName.trim()) {
        throw new DomainError('INVALID_MEMBER', 'displayName is required');
      }
    }
    return this.repo.replaceMembers(organizationId, committeeId, members);
  }
}
