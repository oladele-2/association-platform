export type TenantContext = {
  organizationId: string;
  slug: string;
  displayName: string;
  status: 'provisioning' | 'active' | 'suspended';
};
