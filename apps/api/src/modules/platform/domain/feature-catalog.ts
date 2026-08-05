/** Default feature flags seeded on org provision (org-agnostic). */
export const DEFAULT_FEATURE_FLAGS: ReadonlyArray<{
  key: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}> = [
  { key: 'members', enabled: true },
  { key: 'institutions', enabled: true },
  { key: 'billing', enabled: true },
  { key: 'cms', enabled: true },
  { key: 'cme', enabled: false },
  { key: 'events', enabled: false },
  { key: 'communications', enabled: false },
];

export const PLATFORM_ROLE_SUPER_ADMIN = 'super_admin';
export const DEFAULT_PLAN_CODE = 'starter';
