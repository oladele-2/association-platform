import { describe, expect, it, vi } from 'vitest';
import { ApproveCmeUseCase, SubmitCmeUseCase } from './cme.use-cases';
import type { CmeRepository } from './ports/cme.repository';
import type { GetReadyFileUseCase } from '../../files/application/file.use-cases';

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
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'm1',
        title: 'Conference 2026',
        creditHours: '3.00',
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
      review: vi.fn().mockResolvedValue({ id: 'c1', status: 'approved' }),
      findMemberUserId: vi.fn().mockResolvedValue('u1'),
      writeOutbox: vi.fn(),
      createNotification: vi.fn(),
    } as unknown as CmeRepository;

    const usecase = new ApproveCmeUseCase(repo);
    const result = await usecase.execute('o1', 'c1', 'admin1');
    expect(result.status).toBe('approved');
    expect(repo.writeOutbox).toHaveBeenCalled();
    expect(repo.createNotification).toHaveBeenCalled();
  });
});
