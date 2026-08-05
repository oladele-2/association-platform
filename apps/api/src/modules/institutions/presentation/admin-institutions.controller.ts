import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { AccessJwtGuard } from '../../identity/presentation/access-jwt.guard';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { PermissionsGuard } from '../../rbac/presentation/permissions.guard';
import { RequirePermissions } from '../../rbac/presentation/require-permissions.decorator';
import {
  AssignInstitutionAdminUseCase,
  CreateInstitutionUseCase,
  DeleteInstitutionUseCase,
  GetInstitutionUseCase,
  LinkInstitutionMemberUseCase,
  ListInstitutionAdminsUseCase,
  ListInstitutionMembersUseCase,
  ListInstitutionsUseCase,
  RevokeInstitutionAdminUseCase,
  UnlinkInstitutionMemberUseCase,
  UpdateInstitutionMemberLinkUseCase,
  UpdateInstitutionUseCase,
} from '../application/institution.use-cases';
import {
  AssignInstitutionAdminDto,
  CreateInstitutionDto,
  LinkInstitutionMemberDto,
  UpdateInstitutionDto,
  UpdateInstitutionMemberLinkDto,
} from './institution.dto';

@ApiTags('admin-institutions')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard, PermissionsGuard)
@UseFilters(DomainErrorFilter)
@Controller('admin/institutions')
export class AdminInstitutionsController {
  constructor(
    private readonly listInstitutions: ListInstitutionsUseCase,
    private readonly getInstitution: GetInstitutionUseCase,
    private readonly createInstitution: CreateInstitutionUseCase,
    private readonly updateInstitution: UpdateInstitutionUseCase,
    private readonly deleteInstitution: DeleteInstitutionUseCase,
    private readonly listAdmins: ListInstitutionAdminsUseCase,
    private readonly assignAdmin: AssignInstitutionAdminUseCase,
    private readonly revokeAdmin: RevokeInstitutionAdminUseCase,
    private readonly listMembers: ListInstitutionMembersUseCase,
    private readonly linkMember: LinkInstitutionMemberUseCase,
    private readonly updateLink: UpdateInstitutionMemberLinkUseCase,
    private readonly unlinkMember: UnlinkInstitutionMemberUseCase,
  ) {}

  @Get()
  @RequirePermissions('institutions.read')
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  list(
    @CurrentTenant() tenant: TenantContext,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listInstitutions.execute({
      organizationId: tenant.organizationId,
      q,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post()
  @RequirePermissions('institutions.write')
  create(@CurrentTenant() tenant: TenantContext, @Body() body: CreateInstitutionDto) {
    return this.createInstitution.execute({
      organizationId: tenant.organizationId,
      ...body,
    });
  }

  @Get(':id')
  @RequirePermissions('institutions.read')
  get(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.getInstitution.byId(tenant.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('institutions.write')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInstitutionDto,
  ) {
    return this.updateInstitution.execute({
      organizationId: tenant.organizationId,
      id,
      ...body,
    });
  }

  @Delete(':id')
  @RequirePermissions('institutions.write')
  remove(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.deleteInstitution.execute(tenant.organizationId, id);
  }

  @Get(':id/admins')
  @RequirePermissions('institutions.write')
  admins(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.listAdmins.execute(tenant.organizationId, id);
  }

  @Post(':id/admins')
  @RequirePermissions('institutions.write')
  @ApiOperation({ summary: 'Assign a user as institution admin' })
  addAdmin(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignInstitutionAdminDto,
  ) {
    return this.assignAdmin.execute({
      organizationId: tenant.organizationId,
      institutionId: id,
      userId: body.userId,
    });
  }

  @Delete(':id/admins/:adminId')
  @RequirePermissions('institutions.write')
  removeAdmin(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('adminId', ParseUUIDPipe) adminId: string,
  ) {
    return this.revokeAdmin.execute(tenant.organizationId, id, adminId);
  }

  @Get(':id/members')
  @RequirePermissions('institutions.read')
  members(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.listMembers.execute(tenant.organizationId, id);
  }

  @Post(':id/members')
  @RequirePermissions('institution.members.manage')
  link(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: LinkInstitutionMemberDto,
  ) {
    return this.linkMember.execute({
      organizationId: tenant.organizationId,
      institutionId: id,
      ...body,
    });
  }

  @Patch(':id/members/:linkId')
  @RequirePermissions('institution.members.manage')
  updateMemberLink(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body() body: UpdateInstitutionMemberLinkDto,
  ) {
    return this.updateLink.execute({
      organizationId: tenant.organizationId,
      institutionId: id,
      linkId,
      ...body,
    });
  }

  @Delete(':id/members/:linkId')
  @RequirePermissions('institution.members.manage')
  unlink(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ) {
    return this.unlinkMember.execute(tenant.organizationId, id, linkId);
  }
}
