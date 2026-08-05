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

  findMemberIdByUserId(organizationId: string, userId: string): Promise<string | null>;

  listPublishedForMember(organizationId: string, memberId: string): Promise<MemberEventView[]>;

  countActiveRegistrations(organizationId: string, eventId: string): Promise<number>;

  findRegistration(
    organizationId: string,
    eventId: string,
    memberId: string,
  ): Promise<RegistrationView | null>;

  /** Race-safe register with capacity check. */
  register(organizationId: string, eventId: string, memberId: string): Promise<RegistrationView>;

  cancelRegistration(
    organizationId: string,
    eventId: string,
    memberId: string,
  ): Promise<RegistrationView>;

  listRegistrations(organizationId: string, eventId: string): Promise<RegistrationView[]>;

  updateRegistrationStatus(
    organizationId: string,
    eventId: string,
    registrationId: string,
    status: RegistrationStatus,
  ): Promise<RegistrationView>;
}

export type RegistrationStatus = 'registered' | 'cancelled' | 'attended' | 'no_show';

export type RegistrationView = {
  id: string;
  eventId: string;
  memberId: string;
  membershipNo: string | null;
  status: RegistrationStatus;
  registeredAt: string;
  checkedInAt: string | null;
};

export type MemberEventView = EventView & {
  myRegistration: RegistrationView | null;
};

export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY');
