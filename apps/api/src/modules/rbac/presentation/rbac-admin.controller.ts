import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { AccessJwtGuard } from '../../identity/presentation/access-jwt.guard';
import { CurrentAuthUser } from '../../identity/presentation/current-auth-user.decorator';
import type { AuthenticatedRequestUser } from '../../identity/presentation/access-jwt.guard';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import {
  AssignUserRoleUseCase,
  AuthorizationService,
  CreateRoleUseCase,
  DeleteRoleUseCase,
  ListPermissionsUseCase,
  ListRolesUseCase,
  ListUserRolesUseCase,
  RenameRoleUseCase,
  RevokeUserRoleUseCase,
  UpdateRolePermissionsUseCase,
} from '../application/rbac.use-cases';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './require-permissions.decorator';
import {
  AssignUserRoleDto,
  CreateRoleDto,
  RenameRoleDto,
  UpdateRolePermissionsDto,
} from './rbac.dto';

@ApiTags('rbac')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard, PermissionsGuard)
@UseFilters(DomainErrorFilter)
@Controller()
export class RbacAdminController {
  constructor(
    private readonly listPermissions: ListPermissionsUseCase,
    private readonly listRoles: ListRolesUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly updateRolePermissions: UpdateRolePermissionsUseCase,
    private readonly renameRole: RenameRoleUseCase,
    private readonly deleteRole: DeleteRoleUseCase,
    private readonly listUserRoles: ListUserRolesUseCase,
    private readonly assignUserRole: AssignUserRoleUseCase,
    private readonly revokeUserRole: RevokeUserRoleUseCase,
    private readonly authz: AuthorizationService,
  ) {}

  @Get('me/permissions')
  @ApiOperation({ summary: 'Effective permissions for the current user (union of roles)' })
  async myPermissions(@CurrentAuthUser() auth: AuthenticatedRequestUser) {
    const [permissions, roles] = await Promise.all([
      this.authz.getPermissionKeys(auth.organizationId, auth.userId),
      this.listUserRoles.execute(auth.organizationId, auth.userId),
    ]);
    return { permissions, roles };
  }

  @Get('admin/permissions')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Global permission catalog' })
  permissionsCatalog() {
    return this.listPermissions.execute();
  }

  @Get('admin/roles')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'List roles for the current tenant' })
  roles(@CurrentTenant() tenant: TenantContext) {
    return this.listRoles.execute(tenant.organizationId);
  }

  @Post('admin/roles')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Create a custom (non-system) role' })
  create(@CurrentTenant() tenant: TenantContext, @Body() body: CreateRoleDto) {
    return this.createRole.execute({
      organizationId: tenant.organizationId,
      key: body.key,
      name: body.name,
      permissionKeys: body.permissionKeys,
    });
  }

  @Put('admin/roles/:roleId/permissions')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Replace permissions on a custom role' })
  setPermissions(
    @CurrentTenant() tenant: TenantContext,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() body: UpdateRolePermissionsDto,
  ) {
    return this.updateRolePermissions.execute({
      organizationId: tenant.organizationId,
      roleId,
      permissionKeys: body.permissionKeys,
    });
  }

  @Patch('admin/roles/:roleId')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Rename a custom role' })
  rename(
    @CurrentTenant() tenant: TenantContext,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() body: RenameRoleDto,
  ) {
    return this.renameRole.execute({
      organizationId: tenant.organizationId,
      roleId,
      name: body.name,
    });
  }

  @Delete('admin/roles/:roleId')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Delete a custom role' })
  remove(@CurrentTenant() tenant: TenantContext, @Param('roleId', ParseUUIDPipe) roleId: string) {
    return this.deleteRole.execute(tenant.organizationId, roleId);
  }

  @Get('admin/users/:userId/roles')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'List role assignments for a user' })
  userRoles(
    @CurrentTenant() tenant: TenantContext,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.listUserRoles.execute(tenant.organizationId, userId);
  }

  @Post('admin/users/:userId/roles')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Assign a role to a user (optional scope)' })
  assign(
    @CurrentTenant() tenant: TenantContext,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: AssignUserRoleDto,
  ) {
    return this.assignUserRole.execute({
      organizationId: tenant.organizationId,
      userId,
      roleId: body.roleId,
      scopeType: body.scopeType,
      scopeId: body.scopeId,
    });
  }

  @Delete('admin/users/:userId/roles/:assignmentId')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Revoke a role assignment' })
  revoke(
    @CurrentTenant() tenant: TenantContext,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.revokeUserRole.execute(tenant.organizationId, userId, assignmentId);
  }
}
