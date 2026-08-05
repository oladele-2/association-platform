import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { assertOptionalHexColor } from '../domain/org-rules';
import {
  ORGANIZATION_ADMIN_REPOSITORY,
  type OrganizationAdminRepository,
} from './ports/organization-admin.repository';

@Injectable()
export class UpsertOrganizationFeatureUseCase {
  constructor(
    @Inject(ORGANIZATION_ADMIN_REPOSITORY)
    private readonly orgs: OrganizationAdminRepository,
  ) {}

  async execute(input: {
    organizationId: string;
    featureKey: string;
    enabled: boolean;
    config?: Record<string, unknown>;
  }) {
    const key = input.featureKey.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      throw new DomainError('INVALID_FEATURE_KEY', 'featureKey must be snake_case alphanumeric');
    }
    const org = await this.orgs.findById(input.organizationId);
    if (!org) throw new DomainError('ORG_NOT_FOUND', 'Organization not found');
    return this.orgs.upsertFeature({
      organizationId: input.organizationId,
      featureKey: key,
      enabled: input.enabled,
      config: input.config,
    });
  }
}

@Injectable()
export class ListOrganizationFeaturesUseCase {
  constructor(
    @Inject(ORGANIZATION_ADMIN_REPOSITORY)
    private readonly orgs: OrganizationAdminRepository,
  ) {}

  execute(organizationId: string) {
    return this.orgs.listFeatures(organizationId);
  }
}

@Injectable()
export class UpsertOrganizationBrandingUseCase {
  constructor(
    @Inject(ORGANIZATION_ADMIN_REPOSITORY)
    private readonly orgs: OrganizationAdminRepository,
  ) {}

  async execute(input: {
    organizationId: string;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    emailFromName?: string | null;
    emailFromAddress?: string | null;
    socialLinks?: Record<string, unknown>;
  }) {
    const org = await this.orgs.findById(input.organizationId);
    if (!org) throw new DomainError('ORG_NOT_FOUND', 'Organization not found');

    return this.orgs.upsertBranding({
      organizationId: input.organizationId,
      primaryColor: assertOptionalHexColor(input.primaryColor),
      secondaryColor: assertOptionalHexColor(input.secondaryColor),
      emailFromName: input.emailFromName,
      emailFromAddress: input.emailFromAddress,
      socialLinks: input.socialLinks,
    });
  }
}

@Injectable()
export class GetOrganizationBrandingUseCase {
  constructor(
    @Inject(ORGANIZATION_ADMIN_REPOSITORY)
    private readonly orgs: OrganizationAdminRepository,
  ) {}

  execute(organizationId: string) {
    return this.orgs.getBranding(organizationId);
  }
}
