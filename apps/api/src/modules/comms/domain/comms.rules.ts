import { DomainError } from '@association/shared-kernel';

export type CampaignStatus = 'draft' | 'queued' | 'sending' | 'sent' | 'cancelled';

export function normalizeTemplateKey(key: string): string {
  const normalized = key.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]*$/.test(normalized)) {
    throw new DomainError('INVALID_TEMPLATE_KEY', 'Template key must be snake_case');
  }
  return normalized;
}

export function assertCanQueueCampaign(status: CampaignStatus): void {
  if (status !== 'draft') {
    throw new DomainError('CAMPAIGN_NOT_DRAFT', 'Only draft campaigns can be queued');
  }
}

export function assertCampaignName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new DomainError('INVALID_TITLE', 'Campaign name is required');
  }
  return trimmed;
}
