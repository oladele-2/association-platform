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
import {
  AssertInstitutionPortalPermissionUseCase,
  GetInstitutionUseCase,
  ListInstitutionMembersUseCase,
  ListMyInstitutionsUseCase,
  UpdateInstitutionUseCase,
} from '../application/institution.use-cases';
import { UpdateInstitutionPortalDto } from './institution.dto';

/**
 * Institution-portal routes. Access = institution_admins row + scoped/org permission
 * (AuthorizationService with institution scope — not org-level PermissionsGuard alone).
 */
@ApiTags('institution-portal')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard)
@UseFilters(DomainErrorFilter)
@Controller('institutions')
export class InstitutionPortalController {
  constructor(
    private readonly listMine: ListMyInstitutionsUseCase,
    private readonly assertPortal: AssertInstitutionPortalPermissionUseCase,
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
  @ApiOperation({ summary: 'Get institution (institution admin + institutions.read scope)' })
  async get(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.assertPortal.execute({
      organizationId: tenant.organizationId,
      institutionId: id,
      userId: auth.userId,
      permissionKey: 'institutions.read',
    });
    return this.getInstitution.byId(tenant.organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update institution profile fields (institution admin + institutions.write scope)',
  })
  async update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInstitutionPortalDto,
  ) {
    await this.assertPortal.execute({
      organizationId: tenant.organizationId,
      institutionId: id,
      userId: auth.userId,
      permissionKey: 'institutions.write',
    });
    return this.updateInstitution.execute({
      organizationId: tenant.organizationId,
      id,
      ...body,
    });
  }

  @Get(':id/members')
  @ApiOperation({
    summary: 'List institution members (institution admin + institution.members.manage scope)',
  })
  async members(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.assertPortal.execute({
      organizationId: tenant.organizationId,
      institutionId: id,
      userId: auth.userId,
      permissionKey: 'institution.members.manage',
    });
    return this.listMembers.execute(tenant.organizationId, id);
  }
}
