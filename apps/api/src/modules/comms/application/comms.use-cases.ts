import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import {
  assertCampaignName,
  assertCanQueueCampaign,
  normalizeTemplateKey,
} from '../domain/comms.rules';
import {
  COMMS_REPOSITORY,
  EMAIL_PROVIDER,
  type CommsRepository,
  type EmailProvider,
} from './ports/comms.repository';

@Injectable()
export class ListEmailTemplatesUseCase {
  constructor(@Inject(COMMS_REPOSITORY) private readonly repo: CommsRepository) {}
  execute(organizationId: string) {
    return this.repo.listTemplates(organizationId);
  }
}

@Injectable()
export class UpsertEmailTemplateUseCase {
  constructor(@Inject(COMMS_REPOSITORY) private readonly repo: CommsRepository) {}
  execute(input: { organizationId: string; key: string; subject: string; bodyMarkdown: string }) {
    if (!input.subject.trim()) throw new DomainError('INVALID_TITLE', 'Subject is required');
    if (!input.bodyMarkdown.trim()) {
      throw new DomainError('INVALID_BODY', 'bodyMarkdown is required');
    }
    return this.repo.upsertTemplate({
      organizationId: input.organizationId,
      key: normalizeTemplateKey(input.key),
      subject: input.subject.trim(),
      bodyMarkdown: input.bodyMarkdown,
    });
  }
}

@Injectable()
export class ListEmailCampaignsUseCase {
  constructor(@Inject(COMMS_REPOSITORY) private readonly repo: CommsRepository) {}
  execute(organizationId: string) {
    return this.repo.listCampaigns(organizationId);
  }
}

@Injectable()
export class GetEmailCampaignUseCase {
  constructor(@Inject(COMMS_REPOSITORY) private readonly repo: CommsRepository) {}
  async execute(organizationId: string, id: string) {
    const row = await this.repo.findCampaign(organizationId, id);
    if (!row) throw new DomainError('CAMPAIGN_NOT_FOUND', 'Campaign not found');
    return row;
  }
}

@Injectable()
export class CreateEmailCampaignUseCase {
  constructor(@Inject(COMMS_REPOSITORY) private readonly repo: CommsRepository) {}
  execute(input: {
    organizationId: string;
    name: string;
    subject: string;
    bodyMarkdown: string;
    audienceFilter?: Record<string, unknown>;
    createdByUserId: string;
  }) {
    if (!input.subject.trim()) throw new DomainError('INVALID_TITLE', 'Subject is required');
    if (!input.bodyMarkdown.trim()) {
      throw new DomainError('INVALID_BODY', 'bodyMarkdown is required');
    }
    return this.repo.createCampaign({
      organizationId: input.organizationId,
      name: assertCampaignName(input.name),
      subject: input.subject.trim(),
      bodyMarkdown: input.bodyMarkdown,
      audienceFilter: input.audienceFilter ?? { allActiveMembers: true },
      createdByUserId: input.createdByUserId,
    });
  }
}

/** Queue campaign: create deliveries + mock-send (provider stub). */
@Injectable()
export class QueueEmailCampaignUseCase {
  constructor(
    @Inject(COMMS_REPOSITORY) private readonly repo: CommsRepository,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
  ) {}

  async execute(organizationId: string, id: string) {
    const campaign = await this.repo.findCampaign(organizationId, id);
    if (!campaign) throw new DomainError('CAMPAIGN_NOT_FOUND', 'Campaign not found');
    assertCanQueueCampaign(campaign.status);

    const audience = await this.repo.resolveAudience(organizationId, campaign.audienceFilter);
    if (audience.length === 0) {
      throw new DomainError('EMPTY_AUDIENCE', 'No recipients matched the audience filter');
    }

    await this.repo.updateCampaignStatus(organizationId, id, 'queued');
    const created = await this.repo.createDeliveries(
      organizationId,
      id,
      audience.map((a) => ({ userId: a.userId, toEmail: a.email })),
    );

    await this.repo.updateCampaignStatus(organizationId, id, 'sending');
    const deliveries = await this.repo.listQueuedDeliveries(organizationId, id);
    let sent = 0;
    let failed = 0;
    for (const delivery of deliveries) {
      try {
        await this.email.send({
          to: delivery.toEmail,
          subject: campaign.subject,
          bodyMarkdown: campaign.bodyMarkdown,
        });
        await this.repo.markDelivery(organizationId, delivery.id, 'sent');
        sent += 1;
      } catch (err) {
        await this.repo.markDelivery(
          organizationId,
          delivery.id,
          'failed',
          err instanceof Error ? err.message : 'send failed',
        );
        failed += 1;
      }
    }
    await this.repo.updateCampaignStatus(organizationId, id, 'sent');

    return {
      campaignId: id,
      recipients: created,
      sent,
      failed,
      provider: this.email.driver,
    };
  }
}

@Injectable()
export class ListMyNotificationsUseCase {
  constructor(@Inject(COMMS_REPOSITORY) private readonly repo: CommsRepository) {}
  execute(organizationId: string, userId: string) {
    return this.repo.listNotifications(organizationId, userId);
  }
}

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(@Inject(COMMS_REPOSITORY) private readonly repo: CommsRepository) {}
  execute(organizationId: string, userId: string, id: string) {
    return this.repo.markNotificationRead(organizationId, userId, id);
  }
}

@Injectable()
export class MarkAllNotificationsReadUseCase {
  constructor(@Inject(COMMS_REPOSITORY) private readonly repo: CommsRepository) {}
  execute(organizationId: string, userId: string) {
    return this.repo.markAllNotificationsRead(organizationId, userId);
  }
}
