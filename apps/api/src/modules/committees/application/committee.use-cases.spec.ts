import { describe, expect, it, vi } from 'vitest';
import { CreateCommitteeUseCase, ReplaceCommitteeMembersUseCase } from './committee.use-cases';
import type { CommitteeRepository } from './ports/committee.repository';
import type { ContentRepository } from '../../cms/application/ports/content.repository';
import type { MemberRepository } from '../../members/application/ports/member.repository';

describe('CreateCommitteeUseCase', () => {
  it('rejects unknown contentItemId', async () => {
    const repo = {
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    } as unknown as CommitteeRepository;
    const content = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as ContentRepository;
    const usecase = new CreateCommitteeUseCase(repo, content);
    await expect(
      usecase.execute({
        organizationId: 'o1',
        name: 'Education',
        slug: 'education',
        contentItemId: 'missing',
      }),
    ).rejects.toMatchObject({ code: 'CONTENT_NOT_FOUND' });
  });
});

describe('ReplaceCommitteeMembersUseCase', () => {
  it('rejects unknown member ids', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'c1' }),
      replaceMembers: vi.fn(),
    } as unknown as CommitteeRepository;
    const members = {
      findMemberById: vi.fn().mockResolvedValue(null),
    } as unknown as MemberRepository;
    const usecase = new ReplaceCommitteeMembersUseCase(repo, members);
    await expect(
      usecase.execute('o1', 'c1', [{ memberId: 'm-x', displayName: 'Dr X' }]),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
  });
});
