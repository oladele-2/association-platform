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
        audienceFilter: { allActiveMembers: true },
      }),
    );
  });
});

describe('QueueEmailCampaignUseCase', () => {
  it('creates deliveries and mock-sends', async () => {
    const repo = {
      findCampaign: vi.fn().mockResolvedValue({
        id: 'camp1',
        status: 'draft',
        subject: 'Hi',
        bodyMarkdown: 'Body',
        audienceFilter: {},
      }),
      resolveAudience: vi.fn().mockResolvedValue([{ userId: 'u1', email: 'a@b.com' }]),
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
    expect(email.send).toHaveBeenCalled();
  });
});
