import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { assertCanRegister } from '../domain/event.rules';
import {
  EVENT_REPOSITORY,
  type EventRepository,
  type RegistrationStatus,
} from './ports/event.repository';

@Injectable()
export class ListMyEventsUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly repo: EventRepository) {}

  async execute(organizationId: string, userId: string) {
    const memberId = await this.requireMemberId(organizationId, userId);
    return this.repo.listPublishedForMember(organizationId, memberId);
  }

  private async requireMemberId(organizationId: string, userId: string) {
    const memberId = await this.repo.findMemberIdByUserId(organizationId, userId);
    if (!memberId) throw new DomainError('MEMBER_NOT_FOUND', 'Member profile not found');
    return memberId;
  }
}

@Injectable()
export class RegisterForEventUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly repo: EventRepository) {}

  async execute(organizationId: string, userId: string, eventId: string) {
    const memberId = await this.repo.findMemberIdByUserId(organizationId, userId);
    if (!memberId) throw new DomainError('MEMBER_NOT_FOUND', 'Member profile not found');
    const event = await this.repo.findById(organizationId, eventId);
    if (!event) throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    assertCanRegister(event);
    return this.repo.register(organizationId, eventId, memberId);
  }
}

@Injectable()
export class CancelEventRegistrationUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly repo: EventRepository) {}

  async execute(organizationId: string, userId: string, eventId: string) {
    const memberId = await this.repo.findMemberIdByUserId(organizationId, userId);
    if (!memberId) throw new DomainError('MEMBER_NOT_FOUND', 'Member profile not found');
    return this.repo.cancelRegistration(organizationId, eventId, memberId);
  }
}

@Injectable()
export class ListEventRegistrationsUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly repo: EventRepository) {}

  async execute(organizationId: string, eventId: string) {
    const event = await this.repo.findById(organizationId, eventId);
    if (!event) throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    return this.repo.listRegistrations(organizationId, eventId);
  }
}

@Injectable()
export class UpdateEventRegistrationStatusUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly repo: EventRepository) {}

  async execute(
    organizationId: string,
    eventId: string,
    registrationId: string,
    status: RegistrationStatus,
  ) {
    const event = await this.repo.findById(organizationId, eventId);
    if (!event) throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    return this.repo.updateRegistrationStatus(organizationId, eventId, registrationId, status);
  }
}
