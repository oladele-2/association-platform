import { ALL_PERMISSION_KEYS } from './permission-catalog';

export type RoleTemplate = {
  key: string;
  name: string;
  /** Empty = all catalog permissions (org admin). */
  permissionKeys: readonly string[] | 'all';
};

/** System roles seeded per organization on provision (labels are generic, not org-specific). */
export const SYSTEM_ROLE_TEMPLATES: readonly RoleTemplate[] = [
  {
    key: 'org_admin',
    name: 'Organization Administrator',
    permissionKeys: 'all',
  },
  {
    key: 'treasurer',
    name: 'Treasurer',
    permissionKeys: [
      'members.read',
      'payments.read',
      'payments.verify',
      'reports.finance',
      'audit.read',
    ],
  },
  {
    key: 'financial_secretary',
    name: 'Financial Secretary',
    permissionKeys: ['members.read', 'payments.read', 'payments.verify', 'reports.finance'],
  },
  {
    key: 'secretariat',
    name: 'Secretariat Staff',
    permissionKeys: [
      'members.read',
      'members.write',
      'institutions.read',
      'institutions.write',
      'cms.read',
      'cms.publish',
      'events.read',
      'events.manage',
      'cme.read',
    ],
  },
  {
    key: 'institution_admin',
    name: 'Institution Administrator',
    permissionKeys: ['members.read', 'institution.members.manage', 'payments.read'],
  },
  {
    key: 'member',
    name: 'Member',
    permissionKeys: [],
  },
];

export function resolveTemplatePermissionKeys(template: RoleTemplate): readonly string[] {
  if (template.permissionKeys === 'all') {
    return ALL_PERMISSION_KEYS;
  }
  return template.permissionKeys;
}
