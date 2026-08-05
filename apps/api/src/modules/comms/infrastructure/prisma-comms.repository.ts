import { Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { Prisma } from '@association/database';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { CampaignStatus } from '../domain/comms.rules';
import { MAX_CAMPAIGN_AUDIENCE, parseAudienceFilter } from '../domain/comms.rules';
import type {
  AudienceMember,
  ClaimedDelivery,
  CommsRepository,
  EmailCampaignView,
  EmailDeliveryView,
  EmailTemplateView,
  NotificationView,
} from '../application/ports/comms.repository';
import { campaignStatusAfterSend } from '../domain/comms.rules';

@Injectable()
export class PrismaCommsRepository implements CommsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(organizationId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.emailTemplate.findMany({
        where: { organizationId },
        orderBy: { key: 'asc' },
      });
      return rows.map(mapTemplate);
    });
  }

  async upsertTemplate(input: {
    organizationId: string;
    key: string;
    subject: string;
    bodyMarkdown: string;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const row = await tx.emailTemplate.upsert({
        where: {
          organizationId_key: {
            organizationId: input.organizationId,
            key: input.key,
          },
        },
        create: {
          organizationId: input.organizationId,
          key: input.key,
          subject: input.subject,
          bodyMarkdown: input.bodyMarkdown,
        },
        update: {
          subject: input.subject,
          bodyMarkdown: input.bodyMarkdown,
        },
      });
      return mapTemplate(row);
    });
  }

  async listCampaigns(organizationId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.emailCampaign.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { deliveries: true } } },
      });
      return rows.map((r) => mapCampaign(r, r._count.deliveries));
    });
  }

  async findCampaign(organizationId: string, id: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.emailCampaign.findFirst({
        where: { id, organizationId },
        include: { _count: { select: { deliveries: true } } },
      });
      return row ? mapCampaign(row, row._count.deliveries) : null;
    });
  }

  async createCampaign(input: {
    organizationId: string;
    name: string;
    subject: string;
    bodyMarkdown: string;
    audienceFilter?: Record<string, unknown>;
    createdByUserId?: string | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const row = await tx.emailCampaign.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          subject: input.subject,
          bodyMarkdown: input.bodyMarkdown,
          audienceFilter: (input.audienceFilter ?? {}) as Prisma.InputJsonValue,
          createdByUserId: input.createdByUserId ?? null,
        },
      });
      return mapCampaign(row, 0);
    });
  }

  async updateCampaignStatus(organizationId: string, id: string, status: CampaignStatus) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      await tx.emailCampaign.updateMany({
        where: { id, organizationId },
        data: { status },
      });
      const row = await tx.emailCampaign.findFirst({
        where: { id, organizationId },
        include: { _count: { select: { deliveries: true } } },
      });
      if (!row) throw new DomainError('CAMPAIGN_NOT_FOUND', 'Campaign not found');
      return mapCampaign(row, row._count.deliveries);
    });
  }

  async claimCampaignForQueue(organizationId: string, id: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const cas = await tx.emailCampaign.updateMany({
        where: { id, organizationId, status: 'draft' },
        data: { status: 'queued' },
      });
      if (cas.count === 0) return null;
      const row = await tx.emailCampaign.findFirst({
        where: { id, organizationId },
        include: { _count: { select: { deliveries: true } } },
      });
      if (!row) return null;
      return mapCampaign(row, row._count.deliveries);
    });
  }

  async resolveAudience(organizationId: string, filter: Record<string, unknown>) {
    const parsed = parseAudienceFilter(filter);
    return this.prisma.asTenant(organizationId, async (tx) => {
      const members = await tx.member.findMany({
        where: {
          organizationId,
          deletedAt: null,
          status: parsed.membershipStatus as never,
          ...(parsed.membershipTypeId ? { membershipTypeId: parsed.membershipTypeId } : {}),
          ...(parsed.institutionId
            ? {
                OR: [
                  { primaryInstitutionId: parsed.institutionId },
                  { institutionLinks: { some: { institutionId: parsed.institutionId } } },
                ],
              }
            : {}),
          userId: { not: null },
        },
        include: { user: true },
        take: MAX_CAMPAIGN_AUDIENCE + 1,
      });

      const out: AudienceMember[] = [];
      for (const m of members) {
        const email = m.user?.email ?? m.alternateEmail;
        if (!email) continue;
        out.push({ userId: m.userId, email });
      }
      return out;
    });
  }

  async createDeliveries(
    organizationId: string,
    campaignId: string,
    recipients: { userId: string | null; toEmail: string }[],
  ) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.emailDelivery.createMany({
        data: recipients.map((r) => ({
          organizationId,
          campaignId,
          userId: r.userId,
          toEmail: r.toEmail,
          status: 'queued',
          provider: null,
        })),
      });
      return result.count;
    });
  }

  async listQueuedDeliveries(organizationId: string, campaignId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.emailDelivery.findMany({
        where: { organizationId, campaignId, status: 'queued' },
      });
      return rows.map(mapDelivery);
    });
  }

  async claimQueuedDeliveries(limit: number) {
    const take = Math.min(100, Math.max(1, limit));
    return this.prisma.asPlatform(async (tx) => {
      const candidates = await tx.emailDelivery.findMany({
        where: { status: 'queued', campaignId: { not: null } },
        orderBy: { createdAt: 'asc' },
        take,
        include: { campaign: true },
      });
      const out: ClaimedDelivery[] = [];
      for (const row of candidates) {
        if (!row.campaign) continue;
        const cas = await tx.emailDelivery.updateMany({
          where: { id: row.id, status: 'queued' },
          data: { status: 'sending' },
        });
        if (cas.count === 0) continue;
        out.push({
          id: row.id,
          organizationId: row.organizationId,
          campaignId: row.campaignId,
          toEmail: row.toEmail,
          status: 'sending',
          error: null,
          createdAt: row.createdAt.toISOString(),
          subject: row.campaign.subject,
          bodyMarkdown: row.campaign.bodyMarkdown,
        });
      }
      return out;
    });
  }

  async markDelivery(
    organizationId: string,
    deliveryId: string,
    status: 'sent' | 'failed',
    error?: string | null,
    meta?: { provider?: string; providerMessageId?: string | null },
  ) {
    await this.prisma.asTenant(organizationId, async (tx) => {
      await tx.emailDelivery.updateMany({
        where: { id: deliveryId, organizationId },
        data: {
          status,
          error: error ?? null,
          ...(meta?.provider ? { provider: meta.provider } : {}),
          ...(meta?.providerMessageId !== undefined
            ? { providerMessageId: meta.providerMessageId }
            : {}),
        },
      });
    });
  }

  async finalizeCampaignIfDrainComplete(organizationId: string, campaignId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const remaining = await tx.emailDelivery.count({
        where: {
          organizationId,
          campaignId,
          status: { in: ['queued', 'sending'] },
        },
      });
      if (remaining > 0) return null;
      const sent = await tx.emailDelivery.count({
        where: { organizationId, campaignId, status: 'sent' },
      });
      const failed = await tx.emailDelivery.count({
        where: { organizationId, campaignId, status: 'failed' },
      });
      const status = campaignStatusAfterSend(sent, failed);
      await tx.emailCampaign.updateMany({
        where: { id: campaignId, organizationId },
        data: { status },
      });
      return status;
    });
  }

  async listNotifications(organizationId: string, userId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.notification.findMany({
        where: { organizationId, userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return rows.map(mapNotification);
    });
  }

  async markNotificationRead(organizationId: string, userId: string, id: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      await tx.notification.updateMany({
        where: { id, organizationId, userId, readAt: null },
        data: { readAt: new Date() },
      });
      const row = await tx.notification.findFirst({
        where: { id, organizationId, userId },
      });
      if (!row) throw new DomainError('NOTIFICATION_NOT_FOUND', 'Notification not found');
      return mapNotification(row);
    });
  }

  async markAllNotificationsRead(organizationId: string, userId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.notification.updateMany({
        where: { organizationId, userId, readAt: null },
        data: { readAt: new Date() },
      });
      return { updated: result.count };
    });
  }

  async upsertDeviceToken(input: {
    organizationId: string;
    userId: string;
    token: string;
    platform: 'android' | 'ios' | 'web';
  }) {
    // Token is globally unique; rebind requires platform context so RLS can
    // clear a prior org/user claim when the same device signs into a new session.
    return this.prisma.asPlatform(async (tx) => {
      await tx.deviceToken.deleteMany({ where: { token: input.token } });
      const row = await tx.deviceToken.create({
        data: {
          organizationId: input.organizationId,
          userId: input.userId,
          token: input.token,
          platform: input.platform,
        },
      });
      return mapDeviceToken(row);
    });
  }

  async revokeDeviceToken(input: { organizationId: string; userId: string; token: string }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const result = await tx.deviceToken.updateMany({
        where: {
          organizationId: input.organizationId,
          userId: input.userId,
          token: input.token,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      return { revoked: result.count > 0 };
    });
  }

  async listActiveDeviceTokens(organizationId: string, userId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.deviceToken.findMany({
        where: { organizationId, userId, revokedAt: null },
        orderBy: { updatedAt: 'desc' },
      });
      return rows.map(mapDeviceToken);
    });
  }

  async revokeDeviceTokensByValues(organizationId: string, tokens: string[]) {
    if (tokens.length === 0) return 0;
    return this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.deviceToken.updateMany({
        where: {
          organizationId,
          token: { in: tokens },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      return result.count;
    });
  }
}

function mapTemplate(row: {
  id: string;
  key: string;
  subject: string;
  bodyMarkdown: string;
  updatedAt: Date;
}): EmailTemplateView {
  return {
    id: row.id,
    key: row.key,
    subject: row.subject,
    bodyMarkdown: row.bodyMarkdown,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapCampaign(
  row: {
    id: string;
    name: string;
    subject: string;
    bodyMarkdown: string;
    audienceFilter: Prisma.JsonValue;
    status: CampaignStatus;
    scheduledAt: Date | null;
    createdByUserId: string | null;
    createdAt: Date;
  },
  deliveryCount = 0,
): EmailCampaignView {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    bodyMarkdown: row.bodyMarkdown,
    audienceFilter: (row.audienceFilter as Record<string, unknown>) ?? {},
    status: row.status,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    deliveryCount,
  };
}

function mapDelivery(row: {
  id: string;
  campaignId: string | null;
  toEmail: string;
  status: string;
  error: string | null;
  createdAt: Date;
}): EmailDeliveryView {
  return {
    id: row.id,
    campaignId: row.campaignId,
    toEmail: row.toEmail,
    status: row.status,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapNotification(row: {
  id: string;
  channel: string;
  title: string;
  body: string;
  data: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
}): NotificationView {
  return {
    id: row.id,
    channel: row.channel,
    title: row.title,
    body: row.body,
    data: (row.data as Record<string, unknown>) ?? {},
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapDeviceToken(row: {
  id: string;
  token: string;
  platform: string;
  createdAt: Date;
  revokedAt: Date | null;
}) {
  return {
    id: row.id,
    token: row.token,
    platform: row.platform,
    createdAt: row.createdAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}
