import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { AuthorizationPolicy } from '../domain/authorization.policy';
import { RBAC_REPOSITORY, type RbacRepository } from './ports/rbac.repository';

@Injectable()
export class AuthorizationService {
  private readonly policy = new AuthorizationPolicy();

  constructor(@Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository) {}

  async getGrants(organizationId: string, userId: string) {
    return this.rbac.loadEffectiveGrants(organizationId, userId);
  }

  async getPermissionKeys(organizationId: string, userId: string): Promise<string[]> {
    const grants = await this.getGrants(organizationId, userId);
    return [...new Set(grants.map((g) => g.permissionKey))].sort();
  }

  async assertPermissions(input: {
    organizationId: string;
    userId: string;
    permissionKeys: string[];
    scope?: { scopeType: 'organization' | 'institution' | 'committee'; scopeId: string } | null;
  }): Promise<void> {
    if (input.permissionKeys.length === 0) return;
    const grants = await this.getGrants(input.organizationId, input.userId);
    this.policy.assertAll(grants, input.permissionKeys, input.scope ?? null);
  }

  async hasPermission(input: {
    organizationId: string;
    userId: string;
    permissionKey: string;
    scope?: { scopeType: 'organization' | 'institution' | 'committee'; scopeId: string } | null;
  }): Promise<boolean> {
    const grants = await this.getGrants(input.organizationId, input.userId);
    return this.policy.hasPermission(grants, input.permissionKey, input.scope ?? null);
  }
}

@Injectable()
export class ListPermissionsUseCase {
  constructor(@Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository) {}

  execute() {
    return this.rbac.listPermissions();
  }
}

@Injectable()
export class ListRolesUseCase {
  constructor(@Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository) {}

  execute(organizationId: string) {
    return this.rbac.listRoles(organizationId);
  }
}

@Injectable()
export class CreateRoleUseCase {
  constructor(@Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository) {}

  async execute(input: {
    organizationId: string;
    key: string;
    name: string;
    permissionKeys: string[];
  }) {
    const key = input.key.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      throw new DomainError('INVALID_ROLE_KEY', 'Role key must be snake_case');
    }
    if (!input.name.trim()) {
      throw new DomainError('INVALID_ROLE_NAME', 'Role name is required');
    }
    return this.rbac.createRole({
      organizationId: input.organizationId,
      key,
      name: input.name.trim(),
      permissionKeys: input.permissionKeys,
    });
  }
}

@Injectable()
export class UpdateRolePermissionsUseCase {
  constructor(@Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository) {}

  async execute(input: { organizationId: string; roleId: string; permissionKeys: string[] }) {
    const role = await this.rbac.findRole(input.organizationId, input.roleId);
    if (!role) throw new DomainError('ROLE_NOT_FOUND', 'Role not found');
    if (role.isSystem) {
      throw new DomainError('SYSTEM_ROLE_LOCKED', 'System role permissions cannot be changed');
    }
    return this.rbac.setRolePermissions(input);
  }
}

@Injectable()
export class RenameRoleUseCase {
  constructor(@Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository) {}

  async execute(input: { organizationId: string; roleId: string; name: string }) {
    const role = await this.rbac.findRole(input.organizationId, input.roleId);
    if (!role) throw new DomainError('ROLE_NOT_FOUND', 'Role not found');
    if (role.isSystem) {
      throw new DomainError('SYSTEM_ROLE_LOCKED', 'System role name cannot be changed');
    }
    if (!input.name.trim()) {
      throw new DomainError('INVALID_ROLE_NAME', 'Role name is required');
    }
    return this.rbac.renameRole({
      organizationId: input.organizationId,
      roleId: input.roleId,
      name: input.name.trim(),
    });
  }
}

@Injectable()
export class DeleteRoleUseCase {
  constructor(@Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository) {}

  async execute(organizationId: string, roleId: string) {
    const role = await this.rbac.findRole(organizationId, roleId);
    if (!role) throw new DomainError('ROLE_NOT_FOUND', 'Role not found');
    if (role.isSystem) {
      throw new DomainError('SYSTEM_ROLE_LOCKED', 'System roles cannot be deleted');
    }
    await this.rbac.deleteRole(organizationId, roleId);
    return { ok: true as const };
  }
}

@Injectable()
export class ListUserRolesUseCase {
  constructor(@Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository) {}

  execute(organizationId: string, userId: string) {
    return this.rbac.listUserRoles(organizationId, userId);
  }
}

@Injectable()
export class AssignUserRoleUseCase {
  constructor(@Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository) {}

  async execute(input: {
    organizationId: string;
    userId: string;
    roleId: string;
    scopeType?: 'organization' | 'institution' | 'committee' | null;
    scopeId?: string | null;
  }) {
    const role = await this.rbac.findRole(input.organizationId, input.roleId);
    if (!role) throw new DomainError('ROLE_NOT_FOUND', 'Role not found');

    if (input.scopeType && input.scopeType !== 'organization' && !input.scopeId) {
      throw new DomainError('INVALID_SCOPE', 'scopeId is required for scoped assignments');
    }

    return this.rbac.assignUserRole({
      organizationId: input.organizationId,
      userId: input.userId,
      roleId: input.roleId,
      scopeType: input.scopeType === 'organization' ? null : (input.scopeType ?? null),
      scopeId: input.scopeType === 'organization' ? null : (input.scopeId ?? null),
    });
  }
}

@Injectable()
export class RevokeUserRoleUseCase {
  constructor(@Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository) {}

  async execute(organizationId: string, assignmentId: string) {
    await this.rbac.revokeUserRole(organizationId, assignmentId);
    return { ok: true as const };
  }
}
