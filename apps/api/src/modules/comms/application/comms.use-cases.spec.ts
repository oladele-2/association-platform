import { describe, expect, it, vi } from 'vitest';
import { CreateEmailCampaignUseCase, QueueEmailCampaignUseCase } from './comms.use-cases';
import type { CommsRepository, EmailProvider } from './ports/comms.repository';

describe('CreateEmailCampaignUseCase', () => {
  it('defaults audience to all active members', async () => {
    const repo = {
      createCampaign: vi.fn().mockResolvedValue({ id: 'camp1', status: 'draft' }),
    } as unknown as CommsRepository;
    const usecase = new CreateEmailCampaignUseCase(repo);
    await usecase.execute({
      organizationId: 'o1',
      name: 'Dues reminder',
      subject: 'Pay your dues',
      bodyMarkdown: 'Please pay',
      createdByUserId: 'u1',
    });
    expect(repo.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceFilter: expect.objectContaining({
          membershipStatus: 'active',
          allActiveMembers: true,
        }),
      }),
    );
  });

  it('rejects unknown audience keys', async () => {
    const repo = { createCampaign: vi.fn() } as unknown as CommsRepository;
    const usecase = new CreateEmailCampaignUseCase(repo);
    await expect(
      usecase.execute({
        organizationId: 'o1',
        name: 'Bad',
        subject: 'Hi',
        bodyMarkdown: 'Body',
        audienceFilter: { hacked: true },
        createdByUserId: 'u1',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_AUDIENCE_FILTER' });
  });
});

describe('QueueEmailCampaignUseCase', () => {
  it('claims draft, creates deliveries, and mock-sends', async () => {
    const repo = {
      findCampaign: vi.fn().mockResolvedValue({
        id: 'camp1',
        status: 'draft',
        subject: 'Hi',
        bodyMarkdown: 'Body',
        audienceFilter: { allActiveMembers: true },
      }),
      resolveAudience: vi.fn().mockResolvedValue([{ userId: 'u1', email: 'a@b.com' }]),
      claimCampaignForQueue: vi.fn().mockResolvedValue({ id: 'camp1', status: 'queued' }),
      updateCampaignStatus: vi.fn().mockResolvedValue({}),
      createDeliveries: vi.fn().mockResolvedValue(1),
      listQueuedDeliveries: vi
        .fn()
        .mockResolvedValue([{ id: 'd1', toEmail: 'a@b.com', status: 'queued' }]),
      markDelivery: vi.fn(),
    } as unknown as CommsRepository;
    const email = {
      driver: 'mock',
      send: vi.fn().mockResolvedValue({ providerMessageId: 'm1' }),
    } as unknown as EmailProvider;

    const usecase = new QueueEmailCampaignUseCase(repo, email);
    const result = await usecase.execute('o1', 'camp1');
    expect(result.sent).toBe(1);
    expect(result.status).toBe('sent');
    expect(repo.claimCampaignForQueue).toHaveBeenCalled();
    expect(email.send).toHaveBeenCalled();
  });

  it('fails when another worker already claimed the campaign', async () => {
    const repo = {
      findCampaign: vi.fn().mockResolvedValue({
        id: 'camp1',
        status: 'draft',
        subject: 'Hi',
        bodyMarkdown: 'Body',
        audienceFilter: {},
      }),
      resolveAudience: vi.fn().mockResolvedValue([{ userId: 'u1', email: 'a@b.com' }]),
      claimCampaignForQueue: vi.fn().mockResolvedValue(null),
      createDeliveries: vi.fn(),
    } as unknown as CommsRepository;
    const email = { driver: 'mock', send: vi.fn() } as unknown as EmailProvider;
    const usecase = new QueueEmailCampaignUseCase(repo, email);
    await expect(usecase.execute('o1', 'camp1')).rejects.toMatchObject({
      code: 'CAMPAIGN_NOT_DRAFT',
    });
    expect(repo.createDeliveries).not.toHaveBeenCalled();
  });

  it('rejects empty audiences', async () => {
    const repo = {
      findCampaign: vi.fn().mockResolvedValue({
        id: 'camp1',
        status: 'draft',
        subject: 'Hi',
        bodyMarkdown: 'Body',
        audienceFilter: {},
      }),
      resolveAudience: vi.fn().mockResolvedValue([]),
      claimCampaignForQueue: vi.fn(),
    } as unknown as CommsRepository;
    const usecase = new QueueEmailCampaignUseCase(repo, {
      driver: 'mock',
      send: vi.fn(),
    } as unknown as EmailProvider);
    await expect(usecase.execute('o1', 'camp1')).rejects.toMatchObject({
      code: 'EMPTY_AUDIENCE',
    });
  });
});
