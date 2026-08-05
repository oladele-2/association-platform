import { describe, expect, it, vi } from 'vitest';
import {
  ActivateMemberUseCase,
  CreateMemberUseCase,
  DeleteMemberUseCase,
  SetMemberExemptionUseCase,
  SuspendMemberUseCase,
} from './member.use-cases';
import type { MemberRepository } from './ports/member.repository';

describe('CreateMemberUseCase', () => {
  it('falls back to default membership type', async () => {
    const repo = {
      ensureDefaultMembershipType: vi.fn().mockResolvedValue({ id: 'mt1' }),
      createMember: vi.fn().mockResolvedValue({ id: 'm1', status: 'draft' }),
    } as unknown as MemberRepository;

    const usecase = new CreateMemberUseCase(repo);
    await usecase.execute({
      organizationId: 'o1',
      firstName: 'Ada',
      lastName: 'Okoye',
    });

    expect(repo.ensureDefaultMembershipType).toHaveBeenCalledWith('o1');
    expect(repo.createMember).toHaveBeenCalledWith(
      expect.objectContaining({
        membershipTypeId: 'mt1',
        firstName: 'Ada',
        lastName: 'Okoye',
        status: 'draft',
      }),
    );
  });
});

describe('ActivateMemberUseCase', () => {
  it('activates draft members', async () => {
    const repo = {
      findMemberById: vi.fn().mockResolvedValue({ id: 'm1', status: 'draft' }),
      updateMember: vi.fn().mockResolvedValue({ id: 'm1', status: 'active' }),
    } as unknown as MemberRepository;

    const usecase = new ActivateMemberUseCase(repo);
    const result = await usecase.execute('o1', 'm1');
    expect(result.status).toBe('active');
    expect(repo.updateMember).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        activatedAt: expect.any(Date),
      }),
    );
  });

  it('rejects already-active members', async () => {
    const usecase = new ActivateMemberUseCase({
      findMemberById: vi.fn().mockResolvedValue({ id: 'm1', status: 'active' }),
      updateMember: vi.fn(),
    } as unknown as MemberRepository);
    await expect(usecase.execute('o1', 'm1')).rejects.toMatchObject({
      code: 'MEMBER_ALREADY_ACTIVE',
    });
  });
});

describe('SuspendMemberUseCase', () => {
  it('suspends active members', async () => {
    const repo = {
      findMemberById: vi.fn().mockResolvedValue({ id: 'm1', status: 'active' }),
      updateMember: vi.fn().mockResolvedValue({ id: 'm1', status: 'suspended' }),
    } as unknown as MemberRepository;
    const usecase = new SuspendMemberUseCase(repo);
    await expect(usecase.execute('o1', 'm1')).resolves.toMatchObject({ status: 'suspended' });
  });
});

describe('DeleteMemberUseCase', () => {
  it('soft-deletes existing members', async () => {
    const repo = {
      findMemberById: vi.fn().mockResolvedValue({ id: 'm1', status: 'active' }),
      softDeleteMember: vi.fn().mockResolvedValue(undefined),
    } as unknown as MemberRepository;
    const usecase = new DeleteMemberUseCase(repo);
    await expect(usecase.execute('o1', 'm1')).resolves.toEqual({ ok: true });
    expect(repo.softDeleteMember).toHaveBeenCalledWith('o1', 'm1');
  });
});

describe('SetMemberExemptionUseCase', () => {
  it('requires a reason when granting exemption', async () => {
    const repo = {
      findMemberById: vi.fn().mockResolvedValue({ id: 'm1', status: 'active' }),
      updateMember: vi.fn(),
    } as unknown as MemberRepository;

    const usecase = new SetMemberExemptionUseCase(repo);
    await expect(
      usecase.execute({
        organizationId: 'o1',
        id: 'm1',
        actorUserId: 'u1',
        duesExempt: true,
      }),
    ).rejects.toMatchObject({ code: 'EXEMPTION_REASON_REQUIRED' });
  });
});
