import type { EventStatus } from '../../domain/event.rules';

export type EventSpeakerView = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photoFileId: string | null;
  sortOrder: number;
};

export type EventView = {
  id: string;
  organizationId: string;
  slug: string;
  title: string;
  description: string | null;
  venue: string | null;
  startsAt: string;
  endsAt: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  capacity: number | null;
  status: EventStatus;
  coverFileId: string | null;
  speakers: EventSpeakerView[];
  createdAt: string;
  updatedAt: string;
};

export interface EventRepository {
  list(input: {
    organizationId: string;
    status?: EventStatus;
    publishedOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: EventView[]; page: number; limit: number; total: number }>;

  findById(organizationId: string, id: string): Promise<EventView | null>;
  findBySlug(organizationId: string, slug: string): Promise<EventView | null>;

  create(input: {
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
  }): Promise<EventView>;

  update(input: {
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
  }): Promise<EventView>;

  softDelete(organizationId: string, id: string): Promise<void>;
  publish(organizationId: string, id: string): Promise<EventView>;
  cancel(organizationId: string, id: string): Promise<EventView>;

  replaceSpeakers(
    organizationId: string,
    eventId: string,
    speakers: Array<{
      name: string;
      title?: string | null;
      bio?: string | null;
      photoFileId?: string | null;
      sortOrder?: number;
    }>,
  ): Promise<EventView>;
}

export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY');
