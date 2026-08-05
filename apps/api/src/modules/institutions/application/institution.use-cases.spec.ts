import { describe, expect, it, vi } from 'vitest';
import {
  AssertInstitutionAdminAccessUseCase,
  CreateInstitutionUseCase,
  LinkInstitutionMemberUseCase,
} from './institution.use-cases';
import type { InstitutionRepository } from './ports/institution.repository';

describe('CreateInstitutionUseCase', () => {
  it('normalizes code and type', async () => {
    const repo = {
      createInstitution: vi.fn().mockResolvedValue({ id: 'i1' }),
    } as unknown as InstitutionRepository;

    const usecase = new CreateInstitutionUseCase(repo);
    await usecase.execute({
      organizationId: 'o1',
      code: 'abc-1',
      name: 'State Hospital',
      institutionType: 'Hospital',
    });

    expect(repo.createInstitution).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'ABC-1',
        institutionType: 'hospital',
        name: 'State Hospital',
      }),
    );
  });
});

describe('LinkInstitutionMemberUseCase', () => {
  it('rejects unknown members', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'i1' }),
      memberExists: vi.fn().mockResolvedValue(false),
      linkMember: vi.fn(),
    } as unknown as InstitutionRepository;

    const usecase = new LinkInstitutionMemberUseCase(repo);
    await expect(
      usecase.execute({
        organizationId: 'o1',
        institutionId: 'i1',
        memberId: 'm1',
      }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
  });
});

describe('AssertInstitutionAdminAccessUseCase', () => {
  it('forbids non-admins', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'i1' }),
      isInstitutionAdmin: vi.fn().mockResolvedValue(false),
    } as unknown as InstitutionRepository;

    const usecase = new AssertInstitutionAdminAccessUseCase(repo);
    await expect(usecase.execute('o1', 'i1', 'u1')).rejects.toMatchObject({
      code: 'INSTITUTION_ADMIN_REQUIRED',
    });
  });
});
