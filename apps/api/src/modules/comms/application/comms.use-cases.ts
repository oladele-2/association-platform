import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import {
  assertAudienceSize,
  assertCampaignName,
  assertCanQueueCampaign,
  normalizeTemplateKey,
  parseAudienceFilter,
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
  async execute(input: {
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
    const audienceFilter = parseAudienceFilter(input.audienceFilter ?? { allActiveMembers: true });
    return this.repo.createCampaign({
      organizationId: input.organizationId,
      name: assertCampaignName(input.name),
      subject: input.subject.trim(),
      bodyMarkdown: input.bodyMarkdown,
      audienceFilter: {
        allActiveMembers: audienceFilter.membershipStatus === 'active',
        membershipStatus: audienceFilter.membershipStatus,
        ...(audienceFilter.institutionId ? { institutionId: audienceFilter.institutionId } : {}),
        ...(audienceFilter.membershipTypeId
          ? { membershipTypeId: audienceFilter.membershipTypeId }
          : {}),
      },
      createdByUserId: input.createdByUserId,
    });
  }
}

/** Queue campaign: CAS claim → create deliveries → return (async drain sends). */
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

    const audienceFilter = parseAudienceFilter(campaign.audienceFilter);
    const audience = await this.repo.resolveAudience(organizationId, {
      membershipStatus: audienceFilter.membershipStatus,
      ...(audienceFilter.institutionId ? { institutionId: audienceFilter.institutionId } : {}),
      ...(audienceFilter.membershipTypeId
        ? { membershipTypeId: audienceFilter.membershipTypeId }
        : {}),
    });
    if (audience.length === 0) {
      throw new DomainError('EMPTY_AUDIENCE', 'No recipients matched the audience filter');
    }
    assertAudienceSize(audience.length);

    const claimed = await this.repo.claimCampaignForQueue(organizationId, id);
    if (!claimed) {
      throw new DomainError('CAMPAIGN_NOT_DRAFT', 'Only draft campaigns can be queued');
    }

    const created = await this.repo.createDeliveries(
      organizationId,
      id,
      audience.map((a) => ({ userId: a.userId, toEmail: a.email })),
    );

    await this.repo.updateCampaignStatus(organizationId, id, 'sending');

    return {
      campaignId: id,
      recipients: created,
      status: 'sending' as const,
      provider: this.email.driver,
    };
  }
}

@Injectable()
export class DrainEmailDeliveriesUseCase {
  constructor(
    @Inject(COMMS_REPOSITORY) private readonly repo: CommsRepository,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
  ) {}

  async execute(limit = 20) {
    const batch = await this.repo.claimQueuedDeliveries(limit);
    let sent = 0;
    let failed = 0;
    const campaigns = new Set<string>();
    for (const delivery of batch) {
      if (delivery.campaignId) {
        campaigns.add(`${delivery.organizationId}:${delivery.campaignId}`);
      }
      try {
        const result = await this.email.send({
          to: delivery.toEmail,
          subject: delivery.subject,
          bodyMarkdown: delivery.bodyMarkdown,
        });
        await this.repo.markDelivery(delivery.organizationId, delivery.id, 'sent', null, {
          provider: this.email.driver,
          providerMessageId: result.providerMessageId,
        });
        sent += 1;
      } catch (err) {
        await this.repo.markDelivery(
          delivery.organizationId,
          delivery.id,
          'failed',
          err instanceof Error ? err.message : 'send failed',
          { provider: this.email.driver },
        );
        failed += 1;
      }
    }
    for (const key of campaigns) {
      const [organizationId, campaignId] = key.split(':');
      if (organizationId && campaignId) {
        await this.repo.finalizeCampaignIfDrainComplete(organizationId, campaignId);
      }
    }
    return { claimed: batch.length, sent, failed };
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
