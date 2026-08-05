import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { assertEventSlug, assertEventWindow } from '../domain/event.rules';
import { EVENT_REPOSITORY, type EventRepository } from './ports/event.repository';

@Injectable()
export class ListEventsUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly repo: EventRepository) {}

  execute(input: Parameters<EventRepository['list']>[0]) {
    return this.repo.list(input);
  }
}

@Injectable()
export class GetEventUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly repo: EventRepository) {}

  async byId(organizationId: string, id: string) {
    const event = await this.repo.findById(organizationId, id);
    if (!event) throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    return event;
  }

  async bySlug(organizationId: string, slug: string) {
    const event = await this.repo.findBySlug(organizationId, slug);
    if (!event) throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    return event;
  }
}

@Injectable()
export class CreateEventUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly repo: EventRepository) {}

  async execute(input: {
    organizationId: string;
    slug: string;
    title: string;
    description?: string | null;
    venue?: string | null;
    startsAt: string;
    endsAt?: string | null;
    registrationOpensAt?: string | null;
    registrationClosesAt?: string | null;
    capacity?: number | null;
    coverFileId?: string | null;
  }) {
    if (!input.title.trim()) {
      throw new DomainError('INVALID_TITLE', 'Title is required');
    }
    const slug = assertEventSlug(input.slug);
    const startsAt = new Date(input.startsAt);
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    assertEventWindow(startsAt, endsAt);

    const existing = await this.repo.findBySlug(input.organizationId, slug);
    if (existing) throw new DomainError('SLUG_TAKEN', 'Event slug already exists');

    return this.repo.create({
      organizationId: input.organizationId,
      slug,
      title: input.title.trim(),
      description: input.description,
      venue: input.venue,
      startsAt,
      endsAt,
      registrationOpensAt: input.registrationOpensAt ? new Date(input.registrationOpensAt) : null,
      registrationClosesAt: input.registrationClosesAt
        ? new Date(input.registrationClosesAt)
        : null,
      capacity: input.capacity,
      coverFileId: input.coverFileId,
    });
  }
}

@Injectable()
export class UpdateEventUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly repo: EventRepository) {}

  async execute(input: {
    organizationId: string;
    id: string;
    slug?: string;
    title?: string;
    description?: string | null;
    venue?: string | null;
    startsAt?: string;
    endsAt?: string | null;
    registrationOpensAt?: string | null;
    registrationClosesAt?: string | null;
    capacity?: number | null;
    coverFileId?: string | null;
  }) {
    const existing = await this.repo.findById(input.organizationId, input.id);
    if (!existing) throw new DomainError('EVENT_NOT_FOUND', 'Event not found');

    const slug = input.slug !== undefined ? assertEventSlug(input.slug) : undefined;
    if (slug) {
      const clash = await this.repo.findBySlug(input.organizationId, slug);
      if (clash && clash.id !== existing.id) {
        throw new DomainError('SLUG_TAKEN', 'Event slug already exists');
      }
    }

    const startsAt = input.startsAt ? new Date(input.startsAt) : new Date(existing.startsAt);
    const endsAt =
      input.endsAt !== undefined
        ? input.endsAt
          ? new Date(input.endsAt)
          : null
        : existing.endsAt
          ? new Date(existing.endsAt)
          : null;
    assertEventWindow(startsAt, endsAt);

    return this.repo.update({
      organizationId: input.organizationId,
      id: input.id,
      slug,
      title: input.title?.trim(),
      description: input.description,
      venue: input.venue,
      startsAt: input.startsAt ? startsAt : undefined,
      endsAt: input.endsAt !== undefined ? endsAt : undefined,
      registrationOpensAt:
        input.registrationOpensAt !== undefined
          ? input.registrationOpensAt
            ? new Date(input.registrationOpensAt)
            : null
          : undefined,
      registrationClosesAt:
        input.registrationClosesAt !== undefined
          ? input.registrationClosesAt
            ? new Date(input.registrationClosesAt)
            : null
          : undefined,
      capacity: input.capacity,
      coverFileId: input.coverFileId,
    });
  }
}

@Injectable()
export class DeleteEventUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly repo: EventRepository) {}

  async execute(organizationId: string, id: string) {
    const existing = await this.repo.findById(organizationId, id);
    if (!existing) throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    await this.repo.softDelete(organizationId, id);
    return { ok: true as const };
  }
}

@Injectable()
export class PublishEventUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly repo: EventRepository) {}

  async execute(organizationId: string, id: string) {
    const existing = await this.repo.findById(organizationId, id);
    if (!existing) throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    if (existing.status === 'cancelled') {
      throw new DomainError('EVENT_CANCELLED', 'Cancelled events cannot be published');
    }
    return this.repo.publish(organizationId, id);
  }
}

@Injectable()
export class CancelEventUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly repo: EventRepository) {}

  async execute(organizationId: string, id: string) {
    const existing = await this.repo.findById(organizationId, id);
    if (!existing) throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    return this.repo.cancel(organizationId, id);
  }
}

@Injectable()
export class ReplaceEventSpeakersUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly repo: EventRepository) {}

  async execute(
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
    const existing = await this.repo.findById(organizationId, eventId);
    if (!existing) throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    for (const s of speakers) {
      if (!s.name.trim()) {
        throw new DomainError('INVALID_SPEAKER', 'Speaker name is required');
      }
    }
    return this.repo.replaceSpeakers(organizationId, eventId, speakers);
  }
}
