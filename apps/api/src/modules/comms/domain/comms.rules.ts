import { DomainError } from '@association/shared-kernel';

export type CampaignStatus = 'draft' | 'queued' | 'sending' | 'sent' | 'cancelled';

export const MAX_CAMPAIGN_AUDIENCE = 5_000;

const MEMBER_STATUSES = new Set(['draft', 'pending_approval', 'active', 'suspended', 'archived']);

const AUDIENCE_KEYS = new Set([
  'allActiveMembers',
  'membershipStatus',
  'institutionId',
  'membershipTypeId',
]);

export type ParsedAudienceFilter = {
  membershipStatus: string;
  institutionId?: string;
  membershipTypeId?: string;
};

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

export function parseAudienceFilter(
  raw: Record<string, unknown> | null | undefined,
): ParsedAudienceFilter {
  const input = raw && Object.keys(raw).length > 0 ? raw : { allActiveMembers: true };

  for (const key of Object.keys(input)) {
    if (!AUDIENCE_KEYS.has(key)) {
      throw new DomainError('INVALID_AUDIENCE_FILTER', `Unknown audience filter key: ${key}`);
    }
  }

  const allActive = input.allActiveMembers === true || input.allActiveMembers === undefined;
  let membershipStatus = 'active';
  if (typeof input.membershipStatus === 'string' && input.membershipStatus.trim()) {
    membershipStatus = input.membershipStatus.trim();
  } else if (allActive) {
    membershipStatus = 'active';
  }

  if (!MEMBER_STATUSES.has(membershipStatus)) {
    throw new DomainError(
      'INVALID_AUDIENCE_FILTER',
      `membershipStatus must be one of: ${[...MEMBER_STATUSES].join(', ')}`,
    );
  }

  const institutionId =
    typeof input.institutionId === 'string' && input.institutionId.trim()
      ? input.institutionId.trim()
      : undefined;
  const membershipTypeId =
    typeof input.membershipTypeId === 'string' && input.membershipTypeId.trim()
      ? input.membershipTypeId.trim()
      : undefined;

  return { membershipStatus, institutionId, membershipTypeId };
}

export function assertAudienceSize(count: number, max = MAX_CAMPAIGN_AUDIENCE): void {
  if (count > max) {
    throw new DomainError('AUDIENCE_TOO_LARGE', `Audience exceeds maximum of ${max} recipients`);
  }
}

/** Final campaign status after sync mock send (schema has no `failed`). */
export function campaignStatusAfterSend(sent: number, failed: number): CampaignStatus {
  if (sent === 0 && failed > 0) return 'cancelled';
  return 'sent';
}
