import { describe, expect, it, vi } from 'vitest';
import { PublishEventUseCase, CreateEventUseCase } from './event.use-cases';
import type { EventRepository } from './ports/event.repository';
import type { GetReadyFileUseCase } from '../../files/application/file.use-cases';

describe('CreateEventUseCase', () => {
  it('rejects duplicate slug', async () => {
    const repo = {
      findBySlug: vi.fn().mockResolvedValue({ id: 'e1' }),
      create: vi.fn(),
    } as unknown as EventRepository;
    const getReadyFile = { execute: vi.fn() } as unknown as GetReadyFileUseCase;
    const usecase = new CreateEventUseCase(repo, getReadyFile);
    await expect(
      usecase.execute({
        organizationId: 'o1',
        slug: 'agm-2026',
        title: 'AGM',
        startsAt: '2026-09-01T10:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'SLUG_TAKEN' });
  });
});

describe('PublishEventUseCase', () => {
  it('publishes draft events', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'e1', status: 'draft' }),
      publish: vi.fn().mockResolvedValue({ id: 'e1', status: 'published' }),
    } as unknown as EventRepository;
    const usecase = new PublishEventUseCase(repo);
    await usecase.execute('o1', 'e1');
    expect(repo.publish).toHaveBeenCalledWith('o1', 'e1');
  });

  it('blocks republishing cancelled events', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'e1', status: 'cancelled' }),
      publish: vi.fn(),
    } as unknown as EventRepository;
    const usecase = new PublishEventUseCase(repo);
    await expect(usecase.execute('o1', 'e1')).rejects.toMatchObject({ code: 'EVENT_CANCELLED' });
  });
});
