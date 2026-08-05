export type OrgType = 'professional_association' | 'alumni' | 'ngo' | 'society' | 'other';

export type OrganizationStatus = 'provisioning' | 'active' | 'suspended';

export type DomainPurpose = 'web' | 'portal' | 'api';

export type OrganizationSummary = {
  id: string;
  slug: string;
  legalName: string;
  displayName: string;
  orgType: OrgType;
  countryCode: string;
  timezone: string;
  defaultCurrency: string;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationDomainView = {
  id: string;
  hostname: string;
  purpose: DomainPurpose;
  isPrimary: boolean;
  verifiedAt: string | null;
  verificationToken: string | null;
};

export type OrganizationFeatureView = {
  featureKey: string;
  enabled: boolean;
  config: Record<string, unknown>;
};

export type OrganizationBrandingView = {
  primaryColor: string | null;
  secondaryColor: string | null;
  emailFromName: string | null;
  emailFromAddress: string | null;
  socialLinks: Record<string, unknown>;
  logoFileId: string | null;
  faviconFileId: string | null;
};

export type OrganizationDetail = OrganizationSummary & {
  domains: OrganizationDomainView[];
  features: OrganizationFeatureView[];
  branding: OrganizationBrandingView | null;
  subscription: {
    planCode: string;
    planName: string;
    status: string;
    trialEndsAt: string | null;
  } | null;
};

export interface OrganizationAdminRepository {
  list(input?: { status?: OrganizationStatus }): Promise<OrganizationSummary[]>;
  findById(id: string): Promise<OrganizationDetail | null>;
  findBySlug(slug: string): Promise<OrganizationSummary | null>;
  provision(input: {
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
  }): Promise<OrganizationDetail>;
  update(input: {
    id: string;
    legalName?: string;
    displayName?: string;
    countryCode?: string;
    timezone?: string;
    defaultCurrency?: string;
    status?: OrganizationStatus;
  }): Promise<OrganizationDetail>;
  addDomain(input: {
    organizationId: string;
    hostname: string;
    purpose: DomainPurpose;
    isPrimary: boolean;
    verificationToken: string;
  }): Promise<OrganizationDomainView>;
  verifyDomain(input: {
    organizationId: string;
    domainId: string;
    token?: string;
    force?: boolean;
  }): Promise<OrganizationDomainView>;
  listDomains(organizationId: string): Promise<OrganizationDomainView[]>;
  upsertFeature(input: {
    organizationId: string;
    featureKey: string;
    enabled: boolean;
    config?: Record<string, unknown>;
  }): Promise<OrganizationFeatureView>;
  listFeatures(organizationId: string): Promise<OrganizationFeatureView[]>;
  upsertBranding(input: {
    organizationId: string;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    emailFromName?: string | null;
    emailFromAddress?: string | null;
    socialLinks?: Record<string, unknown>;
  }): Promise<OrganizationBrandingView>;
  getBranding(organizationId: string): Promise<OrganizationBrandingView | null>;
  ensureDefaultPlan(code: string, name: string): Promise<{ id: string; code: string }>;
  ensurePlatformRole(key: string, name: string): Promise<void>;
}

export const ORGANIZATION_ADMIN_REPOSITORY = Symbol('ORGANIZATION_ADMIN_REPOSITORY');
