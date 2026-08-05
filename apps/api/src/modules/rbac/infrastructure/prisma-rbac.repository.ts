import { Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { Prisma } from '@association/database';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { EffectiveGrant } from '../domain/authorization.policy';
import type {
  RbacRepository,
  RoleView,
  UserRoleAssignmentView,
} from '../application/ports/rbac.repository';

@Injectable()
export class PrismaRbacRepository implements RbacRepository {
  constructor(private readonly prisma: PrismaService) {}

  async ensurePermissionCatalog(
    catalog: Array<{ key: string; module: string; description: string }>,
  ): Promise<number> {
    return this.prisma.asPlatform(async (tx) => {
      let upserted = 0;
      for (const item of catalog) {
        await tx.permission.upsert({
          where: { key: item.key },
          create: {
            key: item.key,
            module: item.module,
            description: item.description,
          },
          update: {
            module: item.module,
            description: item.description,
          },
        });
        upserted += 1;
      }
      return upserted;
    });
  }

  async seedSystemRoles(
    organizationId: string,
    templates: Array<{ key: string; name: string; permissionKeys: readonly string[] }>,
  ): Promise<RoleView[]> {
    return this.prisma.asPlatform(async (tx) => {
      const permissions = await tx.permission.findMany({
        where: {
          key: { in: [...new Set(templates.flatMap((t) => [...t.permissionKeys]))] },
        },
      });
      const byKey = new Map(permissions.map((p) => [p.key, p.id]));

      const results: RoleView[] = [];
      for (const template of templates) {
        const role = await tx.role.upsert({
          where: {
            organizationId_key: { organizationId, key: template.key },
          },
          create: {
            organizationId,
            key: template.key,
            name: template.name,
            isSystem: true,
          },
          update: {
            name: template.name,
            isSystem: true,
          },
        });

        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        const permissionIds = template.permissionKeys
          .map((k) => byKey.get(k))
          .filter((id): id is string => Boolean(id));
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
              roleId: role.id,
              permissionId,
            })),
            skipDuplicates: true,
          });
        }

        results.push({
          id: role.id,
          key: role.key,
          name: role.name,
          isSystem: role.isSystem,
          permissionKeys: [...template.permissionKeys],
        });
      }
      return results;
    });
  }

  async listPermissions() {
    return this.prisma.asPlatform(async (tx) => {
      const rows = await tx.permission.findMany({ orderBy: [{ module: 'asc' }, { key: 'asc' }] });
      return rows.map((r) => ({
        key: r.key,
        module: r.module,
        description: r.description,
      }));
    });
  }

  async listRoles(organizationId: string): Promise<RoleView[]> {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.role.findMany({
        where: { organizationId },
        include: { permissions: { include: { permission: true } } },
        orderBy: { key: 'asc' },
      });
      return rows.map(mapRole);
    });
  }

  async findRole(organizationId: string, roleId: string): Promise<RoleView | null> {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.role.findFirst({
        where: { id: roleId, organizationId },
        include: { permissions: { include: { permission: true } } },
      });
      return row ? mapRole(row) : null;
    });
  }

  async createRole(input: {
    organizationId: string;
    key: string;
    name: string;
    permissionKeys: string[];
  }): Promise<RoleView> {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const permissionIds = await resolvePermissionIds(tx, input.permissionKeys);
      try {
        const role = await tx.role.create({
          data: {
            organizationId: input.organizationId,
            key: input.key,
            name: input.name,
            isSystem: false,
            permissions: {
              create: permissionIds.map((permissionId) => ({ permissionId })),
            },
          },
          include: { permissions: { include: { permission: true } } },
        });
        return mapRole(role);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DomainError('ROLE_KEY_TAKEN', 'Role key already exists');
        }
        throw err;
      }
    });
  }

  async setRolePermissions(input: {
    organizationId: string;
    roleId: string;
    permissionKeys: string[];
  }): Promise<RoleView> {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const role = await tx.role.findFirst({
        where: { id: input.roleId, organizationId: input.organizationId },
      });
      if (!role) throw new DomainError('ROLE_NOT_FOUND', 'Role not found');

      const permissionIds = await resolvePermissionIds(tx, input.permissionKeys);
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }

      const updated = await tx.role.findFirstOrThrow({
        where: { id: role.id },
        include: { permissions: { include: { permission: true } } },
      });
      return mapRole(updated);
    });
  }

  async renameRole(input: {
    organizationId: string;
    roleId: string;
    name: string;
  }): Promise<RoleView> {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.role.updateMany({
        where: { id: input.roleId, organizationId: input.organizationId },
        data: { name: input.name },
      });
      const row = await tx.role.findFirst({
        where: { id: input.roleId, organizationId: input.organizationId },
        include: { permissions: { include: { permission: true } } },
      });
      if (!row) throw new DomainError('ROLE_NOT_FOUND', 'Role not found');
      return mapRole(row);
    });
  }

  async deleteRole(organizationId: string, roleId: string): Promise<void> {
    await this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.role.deleteMany({
        where: { id: roleId, organizationId, isSystem: false },
      });
      if (result.count === 0) {
        throw new DomainError('ROLE_NOT_FOUND', 'Role not found');
      }
    });
  }

  async listUserRoles(organizationId: string, userId: string): Promise<UserRoleAssignmentView[]> {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.userRole.findMany({
        where: { organizationId, userId },
        include: { role: true },
        orderBy: { createdAt: 'asc' },
      });
      return rows.map(mapAssignment);
    });
  }

  async assignUserRole(input: {
    organizationId: string;
    userId: string;
    roleId: string;
    scopeType?: 'organization' | 'institution' | 'committee' | null;
    scopeId?: string | null;
  }): Promise<UserRoleAssignmentView> {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: input.userId, organizationId: input.organizationId, deletedAt: null },
      });
      if (!user) throw new DomainError('USER_NOT_FOUND', 'User not found');

      const role = await tx.role.findFirst({
        where: { id: input.roleId, organizationId: input.organizationId },
      });
      if (!role) throw new DomainError('ROLE_NOT_FOUND', 'Role not found');

      try {
        const row = await tx.userRole.create({
          data: {
            organizationId: input.organizationId,
            userId: input.userId,
            roleId: input.roleId,
            scopeType: input.scopeType ?? null,
            scopeId: input.scopeId ?? null,
          },
          include: { role: true },
        });
        return mapAssignment(row);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DomainError('ROLE_ALREADY_ASSIGNED', 'User already has this role/scope');
        }
        throw err;
      }
    });
  }

  async revokeUserRole(organizationId: string, assignmentId: string): Promise<void> {
    await this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.userRole.deleteMany({
        where: { id: assignmentId, organizationId },
      });
      if (result.count === 0) {
        throw new DomainError('ASSIGNMENT_NOT_FOUND', 'Role assignment not found');
      }
    });
  }

  async loadEffectiveGrants(organizationId: string, userId: string): Promise<EffectiveGrant[]> {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.userRole.findMany({
        where: { organizationId, userId },
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      });

      const grants: EffectiveGrant[] = [];
      for (const assignment of rows) {
        for (const rp of assignment.role.permissions) {
          grants.push({
            permissionKey: rp.permission.key,
            scopeType: assignment.scopeType,
            scopeId: assignment.scopeId,
          });
        }
      }
      return grants;
    });
  }
}

async function resolvePermissionIds(
  tx: Prisma.TransactionClient,
  keys: string[],
): Promise<string[]> {
  if (keys.length === 0) return [];
  const unique = [...new Set(keys)];
  const rows = await tx.permission.findMany({ where: { key: { in: unique } } });
  if (rows.length !== unique.length) {
    const found = new Set(rows.map((r) => r.key));
    const missing = unique.filter((k) => !found.has(k));
    throw new DomainError('UNKNOWN_PERMISSION', `Unknown permission key(s): ${missing.join(', ')}`);
  }
  return rows.map((r) => r.id);
}

function mapRole(row: {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  permissions: Array<{ permission: { key: string } }>;
}): RoleView {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    isSystem: row.isSystem,
    permissionKeys: row.permissions.map((p) => p.permission.key).sort(),
  };
}

function mapAssignment(row: {
  id: string;
  userId: string;
  roleId: string;
  scopeType: 'organization' | 'institution' | 'committee' | null;
  scopeId: string | null;
  role: { key: string; name: string };
}): UserRoleAssignmentView {
  return {
    id: row.id,
    userId: row.userId,
    roleId: row.roleId,
    roleKey: row.role.key,
    roleName: row.role.name,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
  };
}
