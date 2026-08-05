import { describe, expect, it, vi } from 'vitest';
import {
  ActivateOrganizationUseCase,
  UpdateOrganizationUseCase,
} from './organization-lifecycle.use-case';
import {
  AddOrganizationDomainUseCase,
  VerifyOrganizationDomainUseCase,
} from './organization-domain.use-case';
import { UpsertOrganizationFeatureUseCase } from './organization-features-branding.use-case';
import type { OrganizationAdminRepository } from './ports/organization-admin.repository';
import type { CachedPrismaOrganizationLookup } from '../../tenancy/infrastructure/cached-prisma-organization.lookup';

function cacheStub() {
  return { invalidateAll: vi.fn() } as unknown as CachedPrismaOrganizationLookup;
}

describe('ActivateOrganizationUseCase', () => {
  it('sets status active and clears tenant cache', async () => {
    const orgs = {
      findById: vi.fn().mockResolvedValue({ id: 'org-1', status: 'provisioning' }),
      update: vi.fn().mockResolvedValue({ id: 'org-1', status: 'active' }),
    } as unknown as OrganizationAdminRepository;
    const cache = cacheStub();
    const usecase = new ActivateOrganizationUseCase(orgs, cache);
    await expect(usecase.execute('org-1')).resolves.toMatchObject({ status: 'active' });
    expect(orgs.update).toHaveBeenCalledWith({ id: 'org-1', status: 'active' });
    expect(cache.invalidateAll).toHaveBeenCalled();
  });

  it('throws ORG_NOT_FOUND when missing', async () => {
    const usecase = new ActivateOrganizationUseCase(
      { findById: vi.fn().mockResolvedValue(null) } as unknown as OrganizationAdminRepository,
      cacheStub(),
    );
    await expect(usecase.execute('missing')).rejects.toMatchObject({ code: 'ORG_NOT_FOUND' });
  });
});

describe('UpdateOrganizationUseCase', () => {
  it('suspends org and clears tenant cache', async () => {
    const orgs = {
      findById: vi.fn().mockResolvedValue({ id: 'org-1', status: 'active' }),
      update: vi.fn().mockResolvedValue({ id: 'org-1', status: 'suspended' }),
    } as unknown as OrganizationAdminRepository;
    const cache = cacheStub();
    const usecase = new UpdateOrganizationUseCase(orgs, cache);
    await usecase.execute({ id: 'org-1', status: 'suspended' });
    expect(cache.invalidateAll).toHaveBeenCalled();
  });
});

describe('AddOrganizationDomainUseCase', () => {
  it('normalizes hostname and invalidates cache', async () => {
    const orgs = {
      findById: vi.fn().mockResolvedValue({ id: 'org-1' }),
      addDomain: vi.fn().mockResolvedValue({
        id: 'd1',
        hostname: 'portal.example.com',
        purpose: 'portal',
        isPrimary: true,
        verifiedAt: null,
        verificationToken: 'tok',
      }),
    } as unknown as OrganizationAdminRepository;
    const cache = cacheStub();
    const usecase = new AddOrganizationDomainUseCase(orgs, cache);
    await usecase.execute({
      organizationId: 'org-1',
      hostname: 'Portal.Example.com:443',
      purpose: 'portal',
      isPrimary: true,
    });
    expect(orgs.addDomain).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'portal.example.com',
        verificationToken: expect.any(String),
      }),
    );
    expect(cache.invalidateAll).toHaveBeenCalled();
  });
});

describe('VerifyOrganizationDomainUseCase', () => {
  it('delegates verify and clears cache', async () => {
    const orgs = {
      verifyDomain: vi.fn().mockResolvedValue({
        id: 'd1',
        hostname: 'portal.example.com',
        verifiedAt: '2030-01-01T00:00:00.000Z',
      }),
    } as unknown as OrganizationAdminRepository;
    const cache = cacheStub();
    const usecase = new VerifyOrganizationDomainUseCase(orgs, cache);
    await usecase.execute({
      organizationId: 'org-1',
      domainId: 'd1',
      force: true,
    });
    expect(orgs.verifyDomain).toHaveBeenCalledWith({
      organizationId: 'org-1',
      domainId: 'd1',
      force: true,
    });
    expect(cache.invalidateAll).toHaveBeenCalled();
  });
});

describe('UpsertOrganizationFeatureUseCase', () => {
  it('rejects invalid feature keys', async () => {
    const usecase = new UpsertOrganizationFeatureUseCase({
      findById: vi.fn(),
    } as unknown as OrganizationAdminRepository);
    await expect(
      usecase.execute({
        organizationId: 'org-1',
        featureKey: 'Bad Key!',
        enabled: true,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_FEATURE_KEY' });
  });

  it('normalizes key and upserts', async () => {
    const orgs = {
      findById: vi.fn().mockResolvedValue({ id: 'org-1' }),
      upsertFeature: vi.fn().mockResolvedValue({
        featureKey: 'members',
        enabled: true,
        config: {},
      }),
    } as unknown as OrganizationAdminRepository;
    const usecase = new UpsertOrganizationFeatureUseCase(orgs);
    await usecase.execute({
      organizationId: 'org-1',
      featureKey: ' Members ',
      enabled: true,
    });
    expect(orgs.upsertFeature).toHaveBeenCalledWith(
      expect.objectContaining({ featureKey: 'members', enabled: true }),
    );
  });
});
