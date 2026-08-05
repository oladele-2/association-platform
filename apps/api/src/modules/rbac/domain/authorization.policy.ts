import { DomainError } from '@association/shared-kernel';

export type EffectiveGrant = {
  permissionKey: string;
  /** Null scope = organization-wide grant. */
  scopeType: 'organization' | 'institution' | 'committee' | null;
  scopeId: string | null;
};

export class AuthorizationPolicy {
  /**
   * Match a permission key against effective grants.
   *
   * - Org-wide grants (`scopeType` null) satisfy any check for that key.
   * - Scoped grants only satisfy when `requiredScope` is provided and matches.
   * - Org-level checks (no `requiredScope`) ignore scoped grants — they do not escalate.
   */
  hasPermission(
    grants: EffectiveGrant[],
    requiredKey: string,
    requiredScope?: { scopeType: EffectiveGrant['scopeType']; scopeId: string } | null,
  ): boolean {
    return grants.some((g) => {
      if (g.permissionKey !== requiredKey) return false;
      if (!g.scopeType) return true; // org-wide
      if (!requiredScope?.scopeType) return false; // org-level check: scoped does not count
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
