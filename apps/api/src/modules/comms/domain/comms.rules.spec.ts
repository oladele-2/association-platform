import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import {
  assertAudienceSize,
  assertCanQueueCampaign,
  campaignStatusAfterSend,
  normalizeTemplateKey,
  parseAudienceFilter,
  MAX_CAMPAIGN_AUDIENCE,
} from './comms.rules';

describe('comms.rules', () => {
  it('normalizes template keys', () => {
    expect(normalizeTemplateKey('Dues_Reminder')).toBe('dues_reminder');
  });

  it('rejects bad template keys', () => {
    expect(() => normalizeTemplateKey('Bad Key')).toThrow(DomainError);
  });

  it('only queues drafts', () => {
    expect(() => assertCanQueueCampaign('sent')).toThrow(DomainError);
  });

  it('parses default active audience', () => {
    expect(parseAudienceFilter(undefined)).toEqual({
      membershipStatus: 'active',
      institutionId: undefined,
      membershipTypeId: undefined,
    });
  });

  it('rejects unknown audience keys', () => {
    expect(() => parseAudienceFilter({ weird: true })).toThrow(DomainError);
  });

  it('rejects invalid membership status', () => {
    expect(() => parseAudienceFilter({ membershipStatus: 'vip' })).toThrow(DomainError);
  });

  it('enforces audience size', () => {
    expect(() => assertAudienceSize(MAX_CAMPAIGN_AUDIENCE + 1)).toThrow(DomainError);
  });

  it('maps send outcomes to campaign status', () => {
    expect(campaignStatusAfterSend(1, 0)).toBe('sent');
    expect(campaignStatusAfterSend(1, 2)).toBe('sent');
    expect(campaignStatusAfterSend(0, 3)).toBe('cancelled');
  });
});
