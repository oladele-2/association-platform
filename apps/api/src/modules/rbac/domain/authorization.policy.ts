import { DomainError } from '@association/shared-kernel';

export type EffectiveGrant = {
  permissionKey: string;
  /** Null scope = organization-wide grant. */
  scopeType: 'organization' | 'institution' | 'committee' | null;
  scopeId: string | null;
};

export class AuthorizationPolicy {
  /**
   * User has permission if any grant matches the key and either:
   * - grant is org-wide (no scope), or
   * - required scope is omitted (org-level check), or
   * - grant scope matches required scopeType+scopeId
   */
  hasPermission(
    grants: EffectiveGrant[],
    requiredKey: string,
    requiredScope?: { scopeType: EffectiveGrant['scopeType']; scopeId: string } | null,
  ): boolean {
    return grants.some((g) => {
      if (g.permissionKey !== requiredKey) return false;
      if (!g.scopeType) return true; // org-wide
      if (!requiredScope?.scopeType) return true; // caller asked org-level; scoped also counts
      return g.scopeType === requiredScope.scopeType && g.scopeId === requiredScope.scopeId;
    });
  }

  assertAll(
    grants: EffectiveGrant[],
    requiredKeys: string[],
    requiredScope?: { scopeType: EffectiveGrant['scopeType']; scopeId: string } | null,
  ): void {
    const missing = requiredKeys.filter((key) => !this.hasPermission(grants, key, requiredScope));
    if (missing.length > 0) {
      throw new DomainError('FORBIDDEN', `Missing permission(s): ${missing.join(', ')}`);
    }
  }
}
