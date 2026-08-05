import { describe, expect, it, vi } from 'vitest';
import { FanOutPushUseCase } from './comms.use-cases';
import type { CommsRepository, PushProvider } from './ports/comms.repository';

describe('FanOutPushUseCase', () => {
  it('sends to active tokens and revokes invalid ones', async () => {
    const repo = {
      listActiveDeviceTokens: vi.fn().mockResolvedValue([
        { id: '1', token: 'a'.repeat(40), platform: 'android' },
        { id: '2', token: 'b'.repeat(40), platform: 'android' },
      ]),
      revokeDeviceTokensByValues: vi.fn().mockResolvedValue(1),
    } as unknown as CommsRepository;
    const push = {
      driver: 'mock',
      send: vi.fn().mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        invalidTokens: ['b'.repeat(40)],
      }),
    } as unknown as PushProvider;

    const usecase = new FanOutPushUseCase(repo, push);
    const result = await usecase.execute({
      organizationId: 'o1',
      userId: 'u1',
      title: 'Hello',
      body: 'World',
      data: { k: 1 },
    });
    expect(result).toEqual({ attempted: 2, successCount: 1, revoked: 1 });
    expect(push.send).toHaveBeenCalled();
    expect(repo.revokeDeviceTokensByValues).toHaveBeenCalledWith('o1', ['b'.repeat(40)]);
  });

  it('swallows provider errors', async () => {
    const repo = {
      listActiveDeviceTokens: vi.fn().mockRejectedValue(new Error('db down')),
    } as unknown as CommsRepository;
    const push = { driver: 'mock', send: vi.fn() } as unknown as PushProvider;
    const usecase = new FanOutPushUseCase(repo, push);
    await expect(
      usecase.execute({
        organizationId: 'o1',
        userId: 'u1',
        title: 't',
        body: 'b',
      }),
    ).resolves.toEqual({ attempted: 0, successCount: 0, revoked: 0 });
  });
});
