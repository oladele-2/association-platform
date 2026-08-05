import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import type { TenantContext } from '../domain/tenant-context';
import { ORGANIZATION_LOOKUP, type OrganizationLookup } from './ports/organization-lookup';

@Injectable()
export class ResolveTenantUseCase {
  constructor(@Inject(ORGANIZATION_LOOKUP) private readonly orgs: OrganizationLookup) {}

  async byHostname(hostname: string): Promise<TenantContext> {
    const host = hostname.split(':')[0]?.toLowerCase() ?? hostname;
    const org = await this.orgs.findByHostname(host);
    return this.toContext(org);
  }

  async bySlug(slug: string): Promise<TenantContext> {
    const org = await this.orgs.findBySlug(slug.trim().toLowerCase());
    return this.toContext(org);
  }

  private toContext(
    org: {
      id: string;
      slug: string;
      displayName: string;
      status: TenantContext['status'];
    } | null,
  ): TenantContext {
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    if (org.status === 'suspended') {
      throw new DomainError('ORG_SUSPENDED', 'Organization is suspended');
    }
    return {
      organizationId: org.id,
      slug: org.slug,
      displayName: org.displayName,
      status: org.status,
    };
  }
}
