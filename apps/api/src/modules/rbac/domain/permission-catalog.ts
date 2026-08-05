/** Stable permission keys (Functional Spec §16). Never rename casually. */
export type PermissionDef = {
  key: string;
  module: string;
  description: string;
};

export const PERMISSION_CATALOG: readonly PermissionDef[] = [
  { key: 'members.read', module: 'members', description: 'View members' },
  { key: 'members.write', module: 'members', description: 'Create/update/activate members' },
  {
    key: 'institutions.read',
    module: 'institutions',
    description: 'View institutions',
  },
  {
    key: 'institutions.write',
    module: 'institutions',
    description: 'Manage institutions',
  },
  {
    key: 'institution.members.manage',
    module: 'institutions',
    description: 'Manage institution-scoped members',
  },
  { key: 'payments.read', module: 'billing', description: 'View payments and invoices' },
  {
    key: 'payments.verify',
    module: 'billing',
    description: 'Verify or reject manual payments',
  },
  { key: 'reports.finance', module: 'billing', description: 'Finance reports' },
  { key: 'cme.read', module: 'cme', description: 'View CME submissions' },
  { key: 'cme.review', module: 'cme', description: 'Approve/reject CME' },
  { key: 'events.read', module: 'events', description: 'View events' },
  { key: 'events.manage', module: 'events', description: 'Manage events and registrations' },
  { key: 'cms.read', module: 'cms', description: 'View CMS content' },
  { key: 'cms.publish', module: 'cms', description: 'Publish CMS content' },
  {
    key: 'comms.campaign',
    module: 'comms',
    description: 'Send or schedule email campaigns',
  },
  { key: 'roles.manage', module: 'iam', description: 'Manage roles and role assignments' },
  { key: 'org.settings', module: 'iam', description: 'Organization settings and branding' },
  { key: 'audit.read', module: 'iam', description: 'View audit logs' },
] as const;

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.map((p) => p.key);
