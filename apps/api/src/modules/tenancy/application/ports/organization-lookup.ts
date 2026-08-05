export type OrganizationLookupResult = {
  id: string;
  slug: string;
  displayName: string;
  status: 'provisioning' | 'active' | 'suspended';
};

export interface OrganizationLookup {
  findByHostname(hostname: string): Promise<OrganizationLookupResult | null>;
  findBySlug(slug: string): Promise<OrganizationLookupResult | null>;
}

export const ORGANIZATION_LOOKUP = Symbol('ORGANIZATION_LOOKUP');
