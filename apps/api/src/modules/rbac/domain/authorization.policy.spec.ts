import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import { AuthorizationPolicy, type EffectiveGrant } from './authorization.policy';
import { ALL_PERMISSION_KEYS, PERMISSION_CATALOG } from './permission-catalog';
import { resolveTemplatePermissionKeys, SYSTEM_ROLE_TEMPLATES } from './role-templates';

describe('AuthorizationPolicy', () => {
  const policy = new AuthorizationPolicy();

  const grants: EffectiveGrant[] = [
    { permissionKey: 'members.read', scopeType: null, scopeId: null },
    {
      permissionKey: 'institution.members.manage',
      scopeType: 'institution',
      scopeId: 'inst-1',
    },
  ];

  it('allows org-wide grants on org-level checks', () => {
    expect(policy.hasPermission(grants, 'members.read')).toBe(true);
  });

  it('denies scoped grants on org-level checks (no escalation)', () => {
    expect(policy.hasPermission(grants, 'institution.members.manage')).toBe(false);
  });

  it('allows scoped permission for matching scope', () => {
    expect(
      policy.hasPermission(grants, 'institution.members.manage', {
        scopeType: 'institution',
        scopeId: 'inst-1',
      }),
    ).toBe(true);
  });

  it('denies scoped permission for other scope id', () => {
    expect(
      policy.hasPermission(grants, 'institution.members.manage', {
        scopeType: 'institution',
        scopeId: 'inst-2',
      }),
    ).toBe(false);
  });

  it('org-wide grant still satisfies a scoped check for the same key', () => {
    const withOrgWide: EffectiveGrant[] = [
      { permissionKey: 'institution.members.manage', scopeType: null, scopeId: null },
    ];
    expect(
      policy.hasPermission(withOrgWide, 'institution.members.manage', {
        scopeType: 'institution',
        scopeId: 'inst-9',
      }),
    ).toBe(true);
  });

  it('throws FORBIDDEN listing missing keys', () => {
    expect(() => policy.assertAll(grants, ['members.write', 'roles.manage'])).toThrow(DomainError);
    try {
      policy.assertAll(grants, ['members.write']);
    } catch (e) {
      expect((e as DomainError).code).toBe('FORBIDDEN');
    }
  });
});

describe('role templates', () => {
  it('gives org_admin every catalog permission', () => {
    const admin = SYSTEM_ROLE_TEMPLATES.find((t) => t.key === 'org_admin')!;
    expect(resolveTemplatePermissionKeys(admin)).toEqual(PERMISSION_CATALOG.map((p) => p.key));
  });

  it('keeps member role empty (authenticated shell only)', () => {
    const member = SYSTEM_ROLE_TEMPLATES.find((t) => t.key === 'member')!;
    expect(resolveTemplatePermissionKeys(member)).toEqual([]);
  });

  it('seeds every system role key listed in the milestone', () => {
    expect(SYSTEM_ROLE_TEMPLATES.map((t) => t.key).sort()).toEqual(
      [
        'financial_secretary',
        'institution_admin',
        'member',
        'org_admin',
        'secretariat',
        'treasurer',
      ].sort(),
    );
  });

  it('keeps every template permission inside the catalog', () => {
    const catalog = new Set(ALL_PERMISSION_KEYS);
    for (const template of SYSTEM_ROLE_TEMPLATES) {
      for (const key of resolveTemplatePermissionKeys(template)) {
        expect(catalog.has(key)).toBe(true);
      }
    }
  });

  it('gives institution_admin institutions.read/write for portal scope checks', () => {
    const ia = SYSTEM_ROLE_TEMPLATES.find((t) => t.key === 'institution_admin')!;
    const keys = resolveTemplatePermissionKeys(ia);
    expect(keys).toEqual(
      expect.arrayContaining([
        'institutions.read',
        'institutions.write',
        'institution.members.manage',
      ]),
    );
  });
});
