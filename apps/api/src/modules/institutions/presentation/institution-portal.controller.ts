import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Body,
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
import { PermissionsGuard } from '../../rbac/presentation/permissions.guard';
import { RequirePermissions } from '../../rbac/presentation/require-permissions.decorator';
import {
  AssertInstitutionAdminAccessUseCase,
  GetInstitutionUseCase,
  ListInstitutionMembersUseCase,
  ListMyInstitutionsUseCase,
  UpdateInstitutionUseCase,
} from '../application/institution.use-cases';
import { UpdateInstitutionDto } from './institution.dto';

/**
 * Institution-portal scoped routes. Caller must be listed on institution_admins
 * for the target institution (in addition to JWT + tenant).
 */
@ApiTags('institution-portal')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard, PermissionsGuard)
@UseFilters(DomainErrorFilter)
@Controller('institutions')
export class InstitutionPortalController {
  constructor(
    private readonly listMine: ListMyInstitutionsUseCase,
    private readonly assertAdmin: AssertInstitutionAdminAccessUseCase,
    private readonly getInstitution: GetInstitutionUseCase,
    private readonly updateInstitution: UpdateInstitutionUseCase,
    private readonly listMembers: ListInstitutionMembersUseCase,
  ) {}

  @Get('mine')
  @ApiOperation({ summary: 'Institutions where the current user is an institution admin' })
  mine(@CurrentTenant() tenant: TenantContext, @CurrentAuthUser() auth: AuthenticatedRequestUser) {
    return this.listMine.execute(tenant.organizationId, auth.userId);
  }

  @Get(':id')
  @RequirePermissions('institutions.read')
  async get(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.assertAdmin.execute(tenant.organizationId, id, auth.userId);
    return this.getInstitution.byId(tenant.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('institutions.write')
  async update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInstitutionDto,
  ) {
    await this.assertAdmin.execute(tenant.organizationId, id, auth.userId);
    return this.updateInstitution.execute({
      organizationId: tenant.organizationId,
      id,
      ...body,
    });
  }

  @Get(':id/members')
  @RequirePermissions('institution.members.manage')
  async members(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.assertAdmin.execute(tenant.organizationId, id, auth.userId);
    return this.listMembers.execute(tenant.organizationId, id);
  }
}
