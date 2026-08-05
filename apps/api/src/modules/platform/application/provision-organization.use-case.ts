import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { DEFAULT_FEATURE_FLAGS, DEFAULT_PLAN_CODE } from '../domain/feature-catalog';
import { assertValidSlug } from '../domain/org-rules';
import { CachedPrismaOrganizationLookup } from '../../tenancy/infrastructure/cached-prisma-organization.lookup';
import { SeedOrganizationRolesUseCase } from '../../rbac/application/seed-rbac.use-case';
import {
  ORGANIZATION_ADMIN_REPOSITORY,
  type OrgType,
  type OrganizationAdminRepository,
} from './ports/organization-admin.repository';

export type ProvisionOrganizationCommand = {
  slug: string;
  legalName: string;
  displayName: string;
  orgType: OrgType;
  countryCode?: string;
  timezone?: string;
  defaultCurrency?: string;
  planCode?: string;
  trialDays?: number;
};

@Injectable()
export class ProvisionOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_ADMIN_REPOSITORY)
    private readonly orgs: OrganizationAdminRepository,
    private readonly tenantCache: CachedPrismaOrganizationLookup,
    private readonly seedRoles: SeedOrganizationRolesUseCase,
  ) {}

  async execute(cmd: ProvisionOrganizationCommand) {
    const slug = assertValidSlug(cmd.slug);
    if (!cmd.legalName.trim() || !cmd.displayName.trim()) {
      throw new DomainError('INVALID_ORG_NAME', 'legalName and displayName are required');
    }

    const existing = await this.orgs.findBySlug(slug);
    if (existing) {
      throw new DomainError('SLUG_TAKEN', 'Organization slug already exists');
    }

    await this.orgs.ensureDefaultPlan(cmd.planCode ?? DEFAULT_PLAN_CODE, 'Starter');

    const created = await this.orgs.provision({
      slug,
      legalName: cmd.legalName.trim(),
      displayName: cmd.displayName.trim(),
      orgType: cmd.orgType,
      countryCode: (cmd.countryCode ?? 'NG').toUpperCase(),
      timezone: cmd.timezone ?? 'Africa/Lagos',
      defaultCurrency: (cmd.defaultCurrency ?? 'NGN').toUpperCase(),
      planCode: cmd.planCode ?? DEFAULT_PLAN_CODE,
      trialDays: cmd.trialDays ?? 30,
      features: DEFAULT_FEATURE_FLAGS.map((f) => ({
        key: f.key,
        enabled: f.enabled,
        config: f.config,
      })),
    });

    const roles = await this.seedRoles.execute(created.id);
    this.tenantCache.invalidateAll();
    return { ...created, systemRoles: roles };
  }
}
