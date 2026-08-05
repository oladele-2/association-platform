import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { CachedPrismaOrganizationLookup } from '../../tenancy/infrastructure/cached-prisma-organization.lookup';
import {
  ORGANIZATION_ADMIN_REPOSITORY,
  type OrganizationAdminRepository,
  type OrganizationStatus,
} from './ports/organization-admin.repository';

@Injectable()
export class ListOrganizationsUseCase {
  constructor(
    @Inject(ORGANIZATION_ADMIN_REPOSITORY)
    private readonly orgs: OrganizationAdminRepository,
  ) {}

  execute(status?: OrganizationStatus) {
    return this.orgs.list(status ? { status } : undefined);
  }
}

@Injectable()
export class GetOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_ADMIN_REPOSITORY)
    private readonly orgs: OrganizationAdminRepository,
  ) {}

  async execute(id: string) {
    const org = await this.orgs.findById(id);
    if (!org) throw new DomainError('ORG_NOT_FOUND', 'Organization not found');
    return org;
  }
}

@Injectable()
export class UpdateOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_ADMIN_REPOSITORY)
    private readonly orgs: OrganizationAdminRepository,
    private readonly tenantCache: CachedPrismaOrganizationLookup,
  ) {}

  async execute(input: {
    id: string;
    legalName?: string;
    displayName?: string;
    countryCode?: string;
    timezone?: string;
    defaultCurrency?: string;
    status?: OrganizationStatus;
  }) {
    const existing = await this.orgs.findById(input.id);
    if (!existing) throw new DomainError('ORG_NOT_FOUND', 'Organization not found');
    const updated = await this.orgs.update(input);
    this.tenantCache.invalidateAll();
    return updated;
  }
}

@Injectable()
export class ActivateOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_ADMIN_REPOSITORY)
    private readonly orgs: OrganizationAdminRepository,
    private readonly tenantCache: CachedPrismaOrganizationLookup,
  ) {}

  async execute(id: string) {
    const org = await this.orgs.findById(id);
    if (!org) throw new DomainError('ORG_NOT_FOUND', 'Organization not found');
    const updated = await this.orgs.update({ id, status: 'active' });
    this.tenantCache.invalidateAll();
    return updated;
  }
}
