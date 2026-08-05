import { Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { Prisma } from '@association/database';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type {
  DomainPurpose,
  OrganizationAdminRepository,
  OrganizationBrandingView,
  OrganizationDetail,
  OrganizationDomainView,
  OrganizationFeatureView,
  OrganizationStatus,
  OrganizationSummary,
  OrgType,
} from '../application/ports/organization-admin.repository';

@Injectable()
export class PrismaOrganizationAdminRepository implements OrganizationAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(input?: { status?: OrganizationStatus }): Promise<OrganizationSummary[]> {
    return this.prisma.asPlatform(async (tx) => {
      const rows = await tx.organization.findMany({
        where: {
          deletedAt: null,
          ...(input?.status ? { status: input.status } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(mapSummary);
    });
  }

  async findById(id: string): Promise<OrganizationDetail | null> {
    return this.prisma.asPlatform(async (tx) => {
      const row = await tx.organization.findFirst({
        where: { id, deletedAt: null },
        include: {
          domains: { orderBy: { createdAt: 'asc' } },
          features: { orderBy: { featureKey: 'asc' } },
          branding: true,
          subscription: { include: { plan: true } },
        },
      });
      return row ? mapDetail(row) : null;
    });
  }

  async findBySlug(slug: string): Promise<OrganizationSummary | null> {
    return this.prisma.asPlatform(async (tx) => {
      const row = await tx.organization.findFirst({
        where: { slug, deletedAt: null },
      });
      return row ? mapSummary(row) : null;
    });
  }

  async provision(input: {
    slug: string;
    legalName: string;
    displayName: string;
    orgType: OrgType;
    countryCode: string;
    timezone: string;
    defaultCurrency: string;
    planCode: string;
    trialDays: number;
    features: Array<{ key: string; enabled: boolean; config?: Record<string, unknown> }>;
  }): Promise<OrganizationDetail> {
    return this.prisma.asPlatform(async (tx) => {
      const plan = await tx.plan.findUnique({ where: { code: input.planCode } });
      if (!plan || !plan.isActive) {
        throw new DomainError('PLAN_NOT_FOUND', `Plan ${input.planCode} not found`);
      }

      const trialEndsAt = new Date(Date.now() + Math.max(1, input.trialDays) * 24 * 60 * 60 * 1000);

      const org = await tx.organization.create({
        data: {
          slug: input.slug,
          legalName: input.legalName,
          displayName: input.displayName,
          orgType: input.orgType,
          countryCode: input.countryCode,
          timezone: input.timezone,
          defaultCurrency: input.defaultCurrency,
          status: 'provisioning',
          subscription: {
            create: {
              planId: plan.id,
              status: 'trialing',
              trialEndsAt,
            },
          },
          features: {
            create: input.features.map((f) => ({
              featureKey: f.key,
              enabled: f.enabled,
              config: (f.config ?? {}) as Prisma.InputJsonValue,
            })),
          },
          branding: { create: {} },
        },
        include: {
          domains: true,
          features: true,
          branding: true,
          subscription: { include: { plan: true } },
        },
      });

      return mapDetail(org);
    });
  }

  async update(input: {
    id: string;
    legalName?: string;
    displayName?: string;
    countryCode?: string;
    timezone?: string;
    defaultCurrency?: string;
    status?: OrganizationStatus;
  }): Promise<OrganizationDetail> {
    await this.prisma.asPlatform(async (tx) => {
      await tx.organization.update({
        where: { id: input.id },
        data: {
          legalName: input.legalName,
          displayName: input.displayName,
          countryCode: input.countryCode,
          timezone: input.timezone,
          defaultCurrency: input.defaultCurrency,
          status: input.status,
        },
      });
    });
    const detail = await this.findById(input.id);
    if (!detail) throw new DomainError('ORG_NOT_FOUND', 'Organization not found');
    return detail;
  }

  async addDomain(input: {
    organizationId: string;
    hostname: string;
    purpose: DomainPurpose;
    isPrimary: boolean;
    verificationToken: string;
  }): Promise<OrganizationDomainView> {
    return this.prisma.asPlatform(async (tx) => {
      if (input.isPrimary) {
        await tx.organizationDomain.updateMany({
          where: { organizationId: input.organizationId, purpose: input.purpose },
          data: { isPrimary: false },
        });
      }
      try {
        const row = await tx.organizationDomain.create({
          data: {
            organizationId: input.organizationId,
            hostname: input.hostname,
            purpose: input.purpose,
            isPrimary: input.isPrimary,
            verificationToken: input.verificationToken,
          },
        });
        return mapDomain(row);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DomainError('HOSTNAME_TAKEN', 'Hostname already registered');
        }
        throw err;
      }
    });
  }

  async verifyDomain(input: {
    organizationId: string;
    domainId: string;
    token?: string;
    force?: boolean;
  }): Promise<OrganizationDomainView> {
    return this.prisma.asPlatform(async (tx) => {
      const row = await tx.organizationDomain.findFirst({
        where: { id: input.domainId, organizationId: input.organizationId },
      });
      if (!row) throw new DomainError('DOMAIN_NOT_FOUND', 'Domain not found');

      if (!input.force) {
        if (!input.token || input.token !== row.verificationToken) {
          throw new DomainError('INVALID_DOMAIN_TOKEN', 'Invalid domain verification token');
        }
      }

      const updated = await tx.organizationDomain.update({
        where: { id: row.id },
        data: {
          verifiedAt: new Date(),
          verificationToken: null,
        },
      });
      return mapDomain(updated);
    });
  }

  async listDomains(organizationId: string): Promise<OrganizationDomainView[]> {
    return this.prisma.asPlatform(async (tx) => {
      const rows = await tx.organizationDomain.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
      });
      return rows.map(mapDomain);
    });
  }

  async upsertFeature(input: {
    organizationId: string;
    featureKey: string;
    enabled: boolean;
    config?: Record<string, unknown>;
  }): Promise<OrganizationFeatureView> {
    return this.prisma.asPlatform(async (tx) => {
      const row = await tx.organizationFeature.upsert({
        where: {
          organizationId_featureKey: {
            organizationId: input.organizationId,
            featureKey: input.featureKey,
          },
        },
        create: {
          organizationId: input.organizationId,
          featureKey: input.featureKey,
          enabled: input.enabled,
          config: (input.config ?? {}) as Prisma.InputJsonValue,
        },
        update: {
          enabled: input.enabled,
          ...(input.config !== undefined ? { config: input.config as Prisma.InputJsonValue } : {}),
        },
      });
      return mapFeature(row);
    });
  }

  async listFeatures(organizationId: string): Promise<OrganizationFeatureView[]> {
    return this.prisma.asPlatform(async (tx) => {
      const rows = await tx.organizationFeature.findMany({
        where: { organizationId },
        orderBy: { featureKey: 'asc' },
      });
      return rows.map(mapFeature);
    });
  }

  async upsertBranding(input: {
    organizationId: string;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    emailFromName?: string | null;
    emailFromAddress?: string | null;
    socialLinks?: Record<string, unknown>;
  }): Promise<OrganizationBrandingView> {
    return this.prisma.asPlatform(async (tx) => {
      const row = await tx.organizationBranding.upsert({
        where: { organizationId: input.organizationId },
        create: {
          organizationId: input.organizationId,
          primaryColor: input.primaryColor ?? null,
          secondaryColor: input.secondaryColor ?? null,
          emailFromName: input.emailFromName ?? null,
          emailFromAddress: input.emailFromAddress ?? null,
          socialLinks: (input.socialLinks ?? {}) as Prisma.InputJsonValue,
        },
        update: {
          ...(input.primaryColor !== undefined ? { primaryColor: input.primaryColor } : {}),
          ...(input.secondaryColor !== undefined ? { secondaryColor: input.secondaryColor } : {}),
          ...(input.emailFromName !== undefined ? { emailFromName: input.emailFromName } : {}),
          ...(input.emailFromAddress !== undefined
            ? { emailFromAddress: input.emailFromAddress }
            : {}),
          ...(input.socialLinks !== undefined
            ? { socialLinks: input.socialLinks as Prisma.InputJsonValue }
            : {}),
        },
      });
      return mapBranding(row);
    });
  }

  async getBranding(organizationId: string): Promise<OrganizationBrandingView | null> {
    return this.prisma.asPlatform(async (tx) => {
      const row = await tx.organizationBranding.findUnique({
        where: { organizationId },
      });
      return row ? mapBranding(row) : null;
    });
  }

  async ensureDefaultPlan(code: string, name: string): Promise<{ id: string; code: string }> {
    return this.prisma.asPlatform(async (tx) => {
      const row = await tx.plan.upsert({
        where: { code },
        create: { code, name, description: 'Default SaaS plan', isActive: true },
        update: {},
      });
      return { id: row.id, code: row.code };
    });
  }

  async ensurePlatformRole(key: string, name: string): Promise<void> {
    await this.prisma.asPlatform(async (tx) => {
      await tx.platformRole.upsert({
        where: { key },
        create: { key, name, description: 'Platform operator' },
        update: {},
      });
    });
  }
}

function mapSummary(row: {
  id: string;
  slug: string;
  legalName: string;
  displayName: string;
  orgType: OrgType;
  countryCode: string;
  timezone: string;
  defaultCurrency: string;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
}): OrganizationSummary {
  return {
    id: row.id,
    slug: row.slug,
    legalName: row.legalName,
    displayName: row.displayName,
    orgType: row.orgType,
    countryCode: row.countryCode,
    timezone: row.timezone,
    defaultCurrency: row.defaultCurrency,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapDomain(row: {
  id: string;
  hostname: string;
  purpose: DomainPurpose;
  isPrimary: boolean;
  verifiedAt: Date | null;
  verificationToken: string | null;
}): OrganizationDomainView {
  return {
    id: row.id,
    hostname: row.hostname,
    purpose: row.purpose,
    isPrimary: row.isPrimary,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    verificationToken: row.verificationToken,
  };
}

function mapFeature(row: {
  featureKey: string;
  enabled: boolean;
  config: Prisma.JsonValue;
}): OrganizationFeatureView {
  return {
    featureKey: row.featureKey,
    enabled: row.enabled,
    config: (row.config as Record<string, unknown>) ?? {},
  };
}

function mapBranding(row: {
  primaryColor: string | null;
  secondaryColor: string | null;
  emailFromName: string | null;
  emailFromAddress: string | null;
  socialLinks: Prisma.JsonValue;
  logoFileId: string | null;
  faviconFileId: string | null;
}): OrganizationBrandingView {
  return {
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    emailFromName: row.emailFromName,
    emailFromAddress: row.emailFromAddress,
    socialLinks: (row.socialLinks as Record<string, unknown>) ?? {},
    logoFileId: row.logoFileId,
    faviconFileId: row.faviconFileId,
  };
}

function mapDetail(row: {
  id: string;
  slug: string;
  legalName: string;
  displayName: string;
  orgType: OrgType;
  countryCode: string;
  timezone: string;
  defaultCurrency: string;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
  domains: Array<{
    id: string;
    hostname: string;
    purpose: DomainPurpose;
    isPrimary: boolean;
    verifiedAt: Date | null;
    verificationToken: string | null;
  }>;
  features: Array<{
    featureKey: string;
    enabled: boolean;
    config: Prisma.JsonValue;
  }>;
  branding: {
    primaryColor: string | null;
    secondaryColor: string | null;
    emailFromName: string | null;
    emailFromAddress: string | null;
    socialLinks: Prisma.JsonValue;
    logoFileId: string | null;
    faviconFileId: string | null;
  } | null;
  subscription: {
    status: string;
    trialEndsAt: Date | null;
    plan: { code: string; name: string };
  } | null;
}): OrganizationDetail {
  return {
    ...mapSummary(row),
    domains: row.domains.map(mapDomain),
    features: row.features.map(mapFeature),
    branding: row.branding ? mapBranding(row.branding) : null,
    subscription: row.subscription
      ? {
          planCode: row.subscription.plan.code,
          planName: row.subscription.plan.name,
          status: row.subscription.status,
          trialEndsAt: row.subscription.trialEndsAt?.toISOString() ?? null,
        }
      : null,
  };
}
