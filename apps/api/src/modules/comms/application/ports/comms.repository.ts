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
  markDelivery(
    organizationId: string,
    deliveryId: string,
    status: 'sent' | 'failed',
    error?: string | null,
  ): Promise<void>;
  listNotifications(organizationId: string, userId: string): Promise<NotificationView[]>;
  markNotificationRead(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<NotificationView>;
  markAllNotificationsRead(organizationId: string, userId: string): Promise<{ updated: number }>;
}

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
