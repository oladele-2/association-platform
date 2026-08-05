import { describe, expect, it, vi } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import { ProvisionOrganizationUseCase } from './provision-organization.use-case';
import type { OrganizationAdminRepository } from './ports/organization-admin.repository';
import type { CachedPrismaOrganizationLookup } from '../../tenancy/infrastructure/cached-prisma-organization.lookup';
import type { SeedOrganizationRolesUseCase } from '../../rbac/application/seed-rbac.use-case';

function seedStub(): SeedOrganizationRolesUseCase {
  return {
    execute: vi.fn().mockResolvedValue([{ key: 'org_admin' }]),
  } as unknown as SeedOrganizationRolesUseCase;
}

describe('ProvisionOrganizationUseCase', () => {
  it('rejects duplicate slug', async () => {
    const orgs = {
      findBySlug: vi.fn().mockResolvedValue({ id: '1', slug: 'taken' }),
      ensureDefaultPlan: vi.fn(),
      provision: vi.fn(),
    } as unknown as OrganizationAdminRepository;
    const cache = { invalidateAll: vi.fn() } as unknown as CachedPrismaOrganizationLookup;

    const usecase = new ProvisionOrganizationUseCase(orgs, cache, seedStub());
    await expect(
      usecase.execute({
        slug: 'taken',
        legalName: 'Taken Org',
        displayName: 'Taken',
        orgType: 'ngo',
      }),
    ).rejects.toMatchObject({ code: 'SLUG_TAKEN' });
  });

  it('provisions with default features, seeds RBAC, and clears tenant cache', async () => {
    const created = { id: 'org-1', slug: 'demo-association' };
    const orgs = {
      findBySlug: vi.fn().mockResolvedValue(null),
      ensureDefaultPlan: vi.fn().mockResolvedValue({ id: 'p1', code: 'starter' }),
      provision: vi.fn().mockResolvedValue(created),
    } as unknown as OrganizationAdminRepository;
    const cache = { invalidateAll: vi.fn() } as unknown as CachedPrismaOrganizationLookup;
    const seed = seedStub();

    const usecase = new ProvisionOrganizationUseCase(orgs, cache, seed);
    const result = await usecase.execute({
      slug: 'Demo-Association',
      legalName: 'Demo Association Ltd',
      displayName: 'Demo Association',
      orgType: 'professional_association',
    });

    expect(result).toMatchObject({ id: 'org-1', systemRoles: [{ key: 'org_admin' }] });
    expect(seed.execute).toHaveBeenCalledWith('org-1');
    expect(orgs.provision).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'demo-association',
        features: expect.arrayContaining([
          expect.objectContaining({ key: 'members', enabled: true }),
        ]),
      }),
    );
    expect(cache.invalidateAll).toHaveBeenCalled();
  });

  it('rejects empty names', async () => {
    const usecase = new ProvisionOrganizationUseCase(
      { findBySlug: vi.fn() } as unknown as OrganizationAdminRepository,
      { invalidateAll: vi.fn() } as unknown as CachedPrismaOrganizationLookup,
      seedStub(),
    );
    await expect(
      usecase.execute({
        slug: 'ok-slug',
        legalName: ' ',
        displayName: 'X',
        orgType: 'other',
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
