import { describe, expect, it, vi } from 'vitest';
import { ApproveCmeUseCase, RejectCmeUseCase, SubmitCmeUseCase } from './cme.use-cases';
import type { CmeRepository } from './ports/cme.repository';
import type { GetReadyFileUseCase } from '../../files/application/file.use-cases';
import type { FanOutPushUseCase } from '../../comms/application/comms.use-cases';

function mockPush(): FanOutPushUseCase {
  return {
    execute: vi.fn().mockResolvedValue({ attempted: 0, successCount: 0, revoked: 0 }),
  } as unknown as FanOutPushUseCase;
}

describe('SubmitCmeUseCase', () => {
  it('requires member profile and ready file', async () => {
    const repo = {
      findMemberIdByUserId: vi.fn().mockResolvedValue('m1'),
      create: vi.fn().mockResolvedValue({ id: 'c1', status: 'pending' }),
    } as unknown as CmeRepository;
    const getReadyFile = {
      execute: vi.fn().mockResolvedValue({ id: 'f1', status: 'ready' }),
    } as unknown as GetReadyFileUseCase;

    const usecase = new SubmitCmeUseCase(repo, getReadyFile);
    await usecase.execute({
      organizationId: 'o1',
      userId: 'u1',
      fileId: 'f1',
      title: 'Conference 2026',
      creditHours: '3',
      completedOn: '2026-03-01',
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'm1',
        title: 'Conference 2026',
        creditHours: '3.00',
        completedOn: expect.any(Date),
      }),
    );
  });
});

describe('ApproveCmeUseCase', () => {
  it('approves pending submissions and notifies', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({
        id: 'c1',
        status: 'pending',
        memberId: 'm1',
      }),
      reviewIfPending: vi.fn().mockResolvedValue({ id: 'c1', status: 'approved' }),
      findMemberUserId: vi.fn().mockResolvedValue('u1'),
      writeOutbox: vi.fn(),
      createNotification: vi.fn(),
    } as unknown as CmeRepository;
    const push = mockPush();

    const usecase = new ApproveCmeUseCase(repo, push);
    const result = await usecase.execute('o1', 'c1', 'admin1');
    expect(result.status).toBe('approved');
    expect(repo.writeOutbox).toHaveBeenCalled();
    expect(repo.createNotification).toHaveBeenCalled();
    expect(push.execute).toHaveBeenCalled();
  });

  it('fails closed when CAS loses the race', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'c1', status: 'pending', memberId: 'm1' }),
      reviewIfPending: vi.fn().mockResolvedValue(null),
      writeOutbox: vi.fn(),
    } as unknown as CmeRepository;
    const usecase = new ApproveCmeUseCase(repo, mockPush());
    await expect(usecase.execute('o1', 'c1', 'admin1')).rejects.toMatchObject({
      code: 'CME_NOT_PENDING',
    });
    expect(repo.writeOutbox).not.toHaveBeenCalled();
  });
});

describe('RejectCmeUseCase', () => {
  it('requires a reason', async () => {
    const repo = {
      findById: vi.fn(),
    } as unknown as CmeRepository;
    const usecase = new RejectCmeUseCase(repo, mockPush());
    await expect(usecase.execute('o1', 'c1', 'admin1', '  ')).rejects.toMatchObject({
      code: 'REJECTION_REASON_REQUIRED',
    });
  });
});
