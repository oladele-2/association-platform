import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import { AuthorizationPolicy, type EffectiveGrant } from './authorization.policy';
import { PERMISSION_CATALOG } from './permission-catalog';
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

  it('allows org-wide grants', () => {
    expect(policy.hasPermission(grants, 'members.read')).toBe(true);
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
});
