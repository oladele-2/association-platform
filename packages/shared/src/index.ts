/** Cross-app shared constants (grows in later milestones). */
export const APP_NAME = 'Association Platform' as const;

export const PERMISSIONS = {
  MEMBERS_READ: 'members.read',
  MEMBERS_WRITE: 'members.write',
  PAYMENTS_VERIFY: 'payments.verify',
  CMS_PUBLISH: 'cms.publish',
  REPORTS_FINANCE: 'reports.finance',
  CME_REVIEW: 'cme.review',
  EVENTS_MANAGE: 'events.manage',
  ROLES_MANAGE: 'roles.manage',
  ORG_SETTINGS: 'org.settings',
  AUDIT_READ: 'audit.read',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
