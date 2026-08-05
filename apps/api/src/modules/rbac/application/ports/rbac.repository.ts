import type { EffectiveGrant } from '../../domain/authorization.policy';

export type RoleView = {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  permissionKeys: string[];
};

export type UserRoleAssignmentView = {
  id: string;
  userId: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  scopeType: 'organization' | 'institution' | 'committee' | null;
  scopeId: string | null;
};

export interface RbacRepository {
  ensurePermissionCatalog(
    catalog: Array<{ key: string; module: string; description: string }>,
  ): Promise<number>;

  seedSystemRoles(
    organizationId: string,
    templates: Array<{ key: string; name: string; permissionKeys: readonly string[] }>,
  ): Promise<RoleView[]>;

  listPermissions(): Promise<Array<{ key: string; module: string; description: string | null }>>;

  listRoles(organizationId: string): Promise<RoleView[]>;

  findRole(organizationId: string, roleId: string): Promise<RoleView | null>;

  createRole(input: {
    organizationId: string;
    key: string;
    name: string;
    permissionKeys: string[];
  }): Promise<RoleView>;

  setRolePermissions(input: {
    organizationId: string;
    roleId: string;
    permissionKeys: string[];
  }): Promise<RoleView>;

  renameRole(input: { organizationId: string; roleId: string; name: string }): Promise<RoleView>;

  deleteRole(organizationId: string, roleId: string): Promise<void>;

  listUserRoles(organizationId: string, userId: string): Promise<UserRoleAssignmentView[]>;

  assignUserRole(input: {
    organizationId: string;
    userId: string;
    roleId: string;
    scopeType?: 'organization' | 'institution' | 'committee' | null;
    scopeId?: string | null;
  }): Promise<UserRoleAssignmentView>;

  revokeUserRole(organizationId: string, userId: string, assignmentId: string): Promise<void>;

  loadEffectiveGrants(organizationId: string, userId: string): Promise<EffectiveGrant[]>;
}

export const RBAC_REPOSITORY = Symbol('RBAC_REPOSITORY');
