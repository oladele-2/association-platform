import type { CampaignStatus } from '../../domain/comms.rules';

export type EmailTemplateView = {
  id: string;
  key: string;
  subject: string;
  bodyMarkdown: string;
  updatedAt: string;
};

export type EmailCampaignView = {
  id: string;
  name: string;
  subject: string;
  bodyMarkdown: string;
  audienceFilter: Record<string, unknown>;
  status: CampaignStatus;
  scheduledAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  deliveryCount?: number;
};

export type EmailDeliveryView = {
  id: string;
  campaignId: string | null;
  toEmail: string;
  status: string;
  error: string | null;
  createdAt: string;
};

export type NotificationView = {
  id: string;
  channel: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type AudienceMember = {
  userId: string | null;
  email: string;
};

export interface CommsRepository {
  listTemplates(organizationId: string): Promise<EmailTemplateView[]>;
  upsertTemplate(input: {
    organizationId: string;
    key: string;
    subject: string;
    bodyMarkdown: string;
  }): Promise<EmailTemplateView>;
  listCampaigns(organizationId: string): Promise<EmailCampaignView[]>;
  findCampaign(organizationId: string, id: string): Promise<EmailCampaignView | null>;
  createCampaign(input: {
    organizationId: string;
    name: string;
    subject: string;
    bodyMarkdown: string;
    audienceFilter?: Record<string, unknown>;
    createdByUserId?: string | null;
  }): Promise<EmailCampaignView>;
  updateCampaignStatus(
    organizationId: string,
    id: string,
    status: CampaignStatus,
  ): Promise<EmailCampaignView>;
  /** CAS: draft → queued. Returns null if not draft / missing. */
  claimCampaignForQueue(organizationId: string, id: string): Promise<EmailCampaignView | null>;
  resolveAudience(
    organizationId: string,
    filter: Record<string, unknown>,
  ): Promise<AudienceMember[]>;
  createDeliveries(
    organizationId: string,
    campaignId: string,
    recipients: { userId: string | null; toEmail: string }[],
  ): Promise<number>;
  listQueuedDeliveries(organizationId: string, campaignId: string): Promise<EmailDeliveryView[]>;
  /** Claim up to `limit` queued deliveries globally for the drain worker. */
  claimQueuedDeliveries(limit: number): Promise<ClaimedDelivery[]>;
  markDelivery(
    organizationId: string,
    deliveryId: string,
    status: 'sent' | 'failed',
    error?: string | null,
    meta?: { provider?: string; providerMessageId?: string | null },
  ): Promise<void>;
  /** Recount sent/failed and set campaign terminal status when no queued remain. */
  finalizeCampaignIfDrainComplete(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignStatus | null>;
  listNotifications(organizationId: string, userId: string): Promise<NotificationView[]>;
  markNotificationRead(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<NotificationView>;
  markAllNotificationsRead(organizationId: string, userId: string): Promise<{ updated: number }>;
  upsertDeviceToken(input: {
    organizationId: string;
    userId: string;
    token: string;
    platform: 'android' | 'ios' | 'web';
  }): Promise<DeviceTokenView>;
  revokeDeviceToken(input: {
    organizationId: string;
    userId: string;
    token: string;
  }): Promise<{ revoked: boolean }>;
  listActiveDeviceTokens(organizationId: string, userId: string): Promise<DeviceTokenView[]>;
  revokeDeviceTokensByValues(organizationId: string, tokens: string[]): Promise<number>;
}

export type ClaimedDelivery = EmailDeliveryView & {
  organizationId: string;
  subject: string;
  bodyMarkdown: string;
};

export type DeviceTokenView = {
  id: string;
  token: string;
  platform: string;
  createdAt: string;
  revokedAt: string | null;
};

export const COMMS_REPOSITORY = Symbol('COMMS_REPOSITORY');

export interface EmailProvider {
  readonly driver: 'mock' | 'smtp';
  send(input: {
    to: string;
    subject: string;
    bodyMarkdown: string;
  }): Promise<{ providerMessageId: string }>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export type PushSendResult = {
  successCount: number;
  failureCount: number;
  /** Tokens FCM reported as permanently invalid — caller should revoke. */
  invalidTokens: string[];
};

export interface PushProvider {
  readonly driver: 'mock' | 'fcm';
  send(input: {
    tokens: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<PushSendResult>;
}

export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');
