import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { DomainError } from '@association/shared-kernel';
import { assertValidHostname } from '../domain/org-rules';
import { CachedPrismaOrganizationLookup } from '../../tenancy/infrastructure/cached-prisma-organization.lookup';
import {
  ORGANIZATION_ADMIN_REPOSITORY,
  type DomainPurpose,
  type OrganizationAdminRepository,
} from './ports/organization-admin.repository';

@Injectable()
export class AddOrganizationDomainUseCase {
  constructor(
    @Inject(ORGANIZATION_ADMIN_REPOSITORY)
    private readonly orgs: OrganizationAdminRepository,
    private readonly tenantCache: CachedPrismaOrganizationLookup,
  ) {}

  async execute(input: {
    organizationId: string;
    hostname: string;
    purpose: DomainPurpose;
    isPrimary?: boolean;
  }) {
    const org = await this.orgs.findById(input.organizationId);
    if (!org) throw new DomainError('ORG_NOT_FOUND', 'Organization not found');

    const domain = await this.orgs.addDomain({
      organizationId: input.organizationId,
      hostname: assertValidHostname(input.hostname),
      purpose: input.purpose,
      isPrimary: input.isPrimary ?? false,
      verificationToken: randomBytes(24).toString('base64url'),
    });
    this.tenantCache.invalidateAll();
    return domain;
  }
}

@Injectable()
export class VerifyOrganizationDomainUseCase {
  constructor(
    @Inject(ORGANIZATION_ADMIN_REPOSITORY)
    private readonly orgs: OrganizationAdminRepository,
    private readonly tenantCache: CachedPrismaOrganizationLookup,
  ) {}

  async execute(input: {
    organizationId: string;
    domainId: string;
    token?: string;
    force?: boolean;
  }) {
    const domain = await this.orgs.verifyDomain(input);
    this.tenantCache.invalidateAll();
    return domain;
  }
}

@Injectable()
export class ListOrganizationDomainsUseCase {
  constructor(
    @Inject(ORGANIZATION_ADMIN_REPOSITORY)
    private readonly orgs: OrganizationAdminRepository,
  ) {}

  execute(organizationId: string) {
    return this.orgs.listDomains(organizationId);
  }
}
