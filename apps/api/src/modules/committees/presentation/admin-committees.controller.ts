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
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { PermissionsGuard } from '../../rbac/presentation/permissions.guard';
import { RequirePermissions } from '../../rbac/presentation/require-permissions.decorator';
import {
  CreateCommitteeUseCase,
  DeleteCommitteeUseCase,
  GetCommitteeUseCase,
  ListCommitteesUseCase,
  ReplaceCommitteeMembersUseCase,
  UpdateCommitteeUseCase,
} from '../application/committee.use-cases';
import {
  CreateCommitteeDto,
  ReplaceCommitteeMembersDto,
  UpdateCommitteeDto,
} from './committee.dto';

@ApiTags('admin-committees')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard, PermissionsGuard)
@UseFilters(DomainErrorFilter)
@Controller('admin/committees')
export class AdminCommitteesController {
  constructor(
    private readonly listCommittees: ListCommitteesUseCase,
    private readonly getCommittee: GetCommitteeUseCase,
    private readonly createCommittee: CreateCommitteeUseCase,
    private readonly updateCommittee: UpdateCommitteeUseCase,
    private readonly deleteCommittee: DeleteCommitteeUseCase,
    private readonly replaceMembers: ReplaceCommitteeMembersUseCase,
  ) {}

  @Get()
  @RequirePermissions('cms.read')
  list(@CurrentTenant() tenant: TenantContext) {
    return this.listCommittees.execute(tenant.organizationId);
  }

  @Post()
  @RequirePermissions('cms.publish')
  create(@CurrentTenant() tenant: TenantContext, @Body() body: CreateCommitteeDto) {
    return this.createCommittee.execute({
      organizationId: tenant.organizationId,
      ...body,
    });
  }

  @Get(':id')
  @RequirePermissions('cms.read')
  get(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.getCommittee.byId(tenant.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('cms.publish')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCommitteeDto,
  ) {
    return this.updateCommittee.execute({
      organizationId: tenant.organizationId,
      id,
      ...body,
    });
  }

  @Delete(':id')
  @RequirePermissions('cms.publish')
  remove(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.deleteCommittee.execute(tenant.organizationId, id);
  }

  @Put(':id/members')
  @RequirePermissions('cms.publish')
  @ApiOperation({ summary: 'Replace committee members roster' })
  members(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReplaceCommitteeMembersDto,
  ) {
    return this.replaceMembers.execute(tenant.organizationId, id, body.members);
  }
}
