export type ShellId = 'member' | 'institution' | 'admin';

export type NavItem = { to: string; label: string };

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
  { to: '/admin/members', label: 'Members' },
  { to: '/admin/institutions', label: 'Institutions' },
  { to: '/admin/membership-types', label: 'Membership Types' },
  { to: '/admin/finance', label: 'Finance' },
  { to: '/admin/cme', label: 'CME Review' },
  { to: '/admin/events', label: 'Events Admin' },
  { to: '/admin/cms', label: 'CMS' },
  { to: '/admin/comms', label: 'Communications' },
  { to: '/admin/roles', label: 'Roles & Users' },
  { to: '/admin/settings', label: 'Org Settings' },
  { to: '/admin/audit', label: 'Audit Log' },
];

const ADMIN_PERMISSION_HINTS = [
  'members.read',
  'members.write',
  'institutions.read',
  'institutions.write',
  'payments.verify',
  'cms.publish',
  'reports.finance',
  'cme.review',
  'events.manage',
  'roles.manage',
  'org.settings',
  'audit.read',
] as const;

export function deriveShells(input: {
  permissions: string[];
  roles: Array<{ key?: string; name?: string }>;
  institutionCount: number;
}): ShellId[] {
  const shells: ShellId[] = ['member'];
  if (input.institutionCount > 0) shells.push('institution');

  const permSet = new Set(input.permissions);
  const roleKeys = input.roles.map((r) => (r.key ?? r.name ?? '').toLowerCase());
  const isAdmin =
    ADMIN_PERMISSION_HINTS.some((p) => permSet.has(p)) ||
    roleKeys.some((k) => k.includes('admin') || k.includes('secretary'));

  if (isAdmin) shells.push('admin');
  return shells;
}

export function defaultShell(shells: ShellId[]): ShellId {
  if (shells.includes('admin')) return 'admin';
  if (shells.includes('institution')) return 'institution';
  return 'member';
}

export function navFor(shell: ShellId): NavItem[] {
  if (shell === 'admin') return ADMIN_NAV;
  if (shell === 'institution') return INSTITUTION_NAV;
  return MEMBER_NAV;
}
