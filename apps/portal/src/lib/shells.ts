export type ShellId = 'member' | 'institution' | 'admin';

export type NavItem = { to: string; label: string; permissions?: readonly string[] };

export const MEMBER_NAV: NavItem[] = [
  { to: '/member', label: 'Dashboard' },
  { to: '/member/profile', label: 'My Profile' },
  { to: '/member/id-card', label: 'Digital ID' },
  { to: '/member/dues', label: 'Dues & Payments' },
  { to: '/member/receipts', label: 'Receipts' },
  { to: '/member/cme', label: 'CME' },
  { to: '/member/events', label: 'Events' },
  { to: '/member/documents', label: 'Documents' },
  { to: '/member/notifications', label: 'Notifications' },
  { to: '/member/security', label: 'Account Security' },
];

export const INSTITUTION_NAV: NavItem[] = [
  { to: '/institution', label: 'Dashboard' },
  { to: '/institution/members', label: 'Affiliated Members' },
  { to: '/institution/balances', label: 'Outstanding Balances' },
  { to: '/institution/remittance', label: 'Bulk Remittance' },
  { to: '/institution/payments', label: 'Payment History' },
  { to: '/institution/reports', label: 'Reports' },
  { to: '/institution/profile', label: 'Institution Profile' },
];

export const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/members', label: 'Members', permissions: ['members.read', 'members.write'] },
  {
    to: '/admin/institutions',
    label: 'Institutions',
    permissions: ['institutions.read', 'institutions.write'],
  },
  {
    to: '/admin/membership-types',
    label: 'Membership Types',
    permissions: ['members.read', 'members.write'],
  },
  {
    to: '/admin/finance',
    label: 'Finance',
    permissions: ['payments.read', 'payments.verify', 'reports.finance'],
  },
  { to: '/admin/cme', label: 'CME Review', permissions: ['cme.review'] },
  { to: '/admin/events', label: 'Events Admin', permissions: ['events.read', 'events.manage'] },
  { to: '/admin/cms', label: 'CMS', permissions: ['cms.read', 'cms.publish'] },
  { to: '/admin/comms', label: 'Communications', permissions: ['comms.campaign'] },
  { to: '/admin/roles', label: 'Roles & Users', permissions: ['roles.manage'] },
  { to: '/admin/settings', label: 'Org Settings', permissions: ['org.settings'] },
  { to: '/admin/audit', label: 'Audit Log', permissions: ['audit.read'] },
];

/** Any of these grants access to the admin shell (not role display names). */
const ADMIN_SHELL_PERMISSIONS = [
  'members.read',
  'members.write',
  'institutions.read',
  'institutions.write',
  'payments.read',
  'payments.verify',
  'cms.read',
  'cms.publish',
  'reports.finance',
  'cme.review',
  'events.read',
  'events.manage',
  'comms.campaign',
  'roles.manage',
  'org.settings',
  'audit.read',
] as const;

export function deriveShells(input: {
  permissions: string[];
  institutionCount: number;
}): ShellId[] {
  const shells: ShellId[] = ['member'];
  if (input.institutionCount > 0) shells.push('institution');

  const permSet = new Set(input.permissions);
  const isAdmin = ADMIN_SHELL_PERMISSIONS.some((p) => permSet.has(p));
  if (isAdmin) shells.push('admin');
  return shells;
}

export function defaultShell(shells: ShellId[]): ShellId {
  if (shells.includes('admin')) return 'admin';
  if (shells.includes('institution')) return 'institution';
  return 'member';
}

export function navFor(shell: ShellId, permissions: string[] = []): NavItem[] {
  if (shell === 'member') return MEMBER_NAV;
  if (shell === 'institution') return INSTITUTION_NAV;

  const permSet = new Set(permissions);
  return ADMIN_NAV.filter((item) => {
    if (!item.permissions?.length) return true;
    return item.permissions.some((p) => permSet.has(p));
  });
}
