import { describe, expect, it, vi } from 'vitest';
import { RegisterForEventUseCase } from './registration.use-cases';
import type { EventRepository } from './ports/event.repository';

describe('RegisterForEventUseCase', () => {
  it('registers when published and open', async () => {
    const repo = {
      findMemberIdByUserId: vi.fn().mockResolvedValue('m1'),
      findById: vi.fn().mockResolvedValue({
        id: 'e1',
        status: 'published',
        registrationOpensAt: null,
        registrationClosesAt: null,
        capacity: 50,
      }),
      register: vi.fn().mockResolvedValue({ id: 'r1', status: 'registered' }),
    } as unknown as EventRepository;
    const usecase = new RegisterForEventUseCase(repo);
    await usecase.execute('o1', 'u1', 'e1');
    expect(repo.register).toHaveBeenCalledWith('o1', 'e1', 'm1');
  });

  it('rejects unpublished events', async () => {
    const repo = {
      findMemberIdByUserId: vi.fn().mockResolvedValue('m1'),
      findById: vi.fn().mockResolvedValue({
        id: 'e1',
        status: 'draft',
        registrationOpensAt: null,
        registrationClosesAt: null,
        capacity: null,
      }),
      register: vi.fn(),
    } as unknown as EventRepository;
    const usecase = new RegisterForEventUseCase(repo);
    await expect(usecase.execute('o1', 'u1', 'e1')).rejects.toMatchObject({
      code: 'EVENT_NOT_PUBLISHED',
    });
    expect(repo.register).not.toHaveBeenCalled();
  });
});
