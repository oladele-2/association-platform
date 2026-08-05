import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { TenantContext } from '../domain/tenant-context';
import { ResolveTenantUseCase } from './resolve-tenant.use-case';

export type PublicTenantResolution = {
  organization: TenantContext;
  branding: {
    primaryColor: string | null;
    secondaryColor: string | null;
    emailFromName: string | null;
    emailFromAddress: string | null;
    socialLinks: Record<string, unknown>;
    logoFileId: string | null;
    faviconFileId: string | null;
  } | null;
  features: Array<{
    featureKey: string;
    enabled: boolean;
    config: Record<string, unknown>;
  }>;
};

@Injectable()
export class ResolvePublicTenantUseCase {
  constructor(
    private readonly resolveTenant: ResolveTenantUseCase,
    private readonly prisma: PrismaService,
  ) {}

  async bySlug(slug: string): Promise<PublicTenantResolution> {
    const organization = await this.resolveTenant.bySlug(slug);
    return this.withExtras(organization);
  }

  async byHostname(hostname: string): Promise<PublicTenantResolution> {
    const organization = await this.resolveTenant.byHostname(hostname);
    return this.withExtras(organization);
  }

  private async withExtras(organization: TenantContext): Promise<PublicTenantResolution> {
    return this.prisma.asPlatform(async (tx) => {
      const branding = await tx.organizationBranding.findUnique({
        where: { organizationId: organization.organizationId },
      });
      const features = await tx.organizationFeature.findMany({
        where: { organizationId: organization.organizationId },
        orderBy: { featureKey: 'asc' },
      });
      return {
        organization,
        branding: branding
          ? {
              primaryColor: branding.primaryColor,
              secondaryColor: branding.secondaryColor,
              emailFromName: branding.emailFromName,
              emailFromAddress: branding.emailFromAddress,
              socialLinks: (branding.socialLinks as Record<string, unknown>) ?? {},
              logoFileId: branding.logoFileId,
              faviconFileId: branding.faviconFileId,
            }
          : null,
        features: features.map((f) => ({
          featureKey: f.featureKey,
          enabled: f.enabled,
          config: (f.config as Record<string, unknown>) ?? {},
        })),
      };
    });
  }
}
