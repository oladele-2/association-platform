import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ResolveTenantUseCase } from './resolve-tenant.use-case';
import type { OrganizationLookup } from './ports/organization-lookup';

function lookup(overrides: Partial<OrganizationLookup> = {}): OrganizationLookup {
  return {
    findByHostname: vi.fn().mockResolvedValue(null),
    findBySlug: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('ResolveTenantUseCase', () => {
  it('resolves by slug (normalized)', async () => {
    const orgs = lookup({
      findBySlug: vi.fn().mockResolvedValue({
        id: 'org-1',
        slug: 'nma-ogun',
        displayName: 'NMA Ogun',
        status: 'active',
      }),
    });
    const usecase = new ResolveTenantUseCase(orgs);
    const tenant = await usecase.bySlug('  NMA-Ogun ');
    expect(orgs.findBySlug).toHaveBeenCalledWith('nma-ogun');
    expect(tenant).toMatchObject({
      organizationId: 'org-1',
      slug: 'nma-ogun',
      displayName: 'NMA Ogun',
      status: 'active',
    });
  });

  it('resolves by hostname without port', async () => {
    const orgs = lookup({
      findByHostname: vi.fn().mockResolvedValue({
        id: 'org-1',
        slug: 'nma-ogun',
        displayName: 'NMA Ogun',
        status: 'active',
      }),
    });
    const usecase = new ResolveTenantUseCase(orgs);
    await usecase.byHostname('nmaogun.com.ng:443');
    expect(orgs.findByHostname).toHaveBeenCalledWith('nmaogun.com.ng');
  });

  it('throws NotFoundException when organization missing', async () => {
    const usecase = new ResolveTenantUseCase(lookup());
    await expect(usecase.bySlug('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ORG_SUSPENDED for suspended tenants', async () => {
    const orgs = lookup({
      findBySlug: vi.fn().mockResolvedValue({
        id: 'org-1',
        slug: 'paused',
        displayName: 'Paused',
        status: 'suspended',
      }),
    });
    const usecase = new ResolveTenantUseCase(orgs);
    await expect(usecase.bySlug('paused')).rejects.toMatchObject({
      code: 'ORG_SUSPENDED',
    });
  });
});
