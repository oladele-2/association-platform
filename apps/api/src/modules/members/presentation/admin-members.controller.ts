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
import { CurrentAuthUser } from '../../identity/presentation/current-auth-user.decorator';
import type { AuthenticatedRequestUser } from '../../identity/presentation/access-jwt.guard';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { PermissionsGuard } from '../../rbac/presentation/permissions.guard';
import { RequirePermissions } from '../../rbac/presentation/require-permissions.decorator';
import type { MemberStatus } from '../domain/member.rules';
import {
  ActivateMemberUseCase,
  CreateFieldDefinitionUseCase,
  CreateMemberUseCase,
  CreateMembershipTypeUseCase,
  DeleteFieldDefinitionUseCase,
  DeleteMemberUseCase,
  GetMemberUseCase,
  ListFieldDefinitionsUseCase,
  ListMembersUseCase,
  ListMembershipTypesUseCase,
  SetMemberExemptionUseCase,
  SuspendMemberUseCase,
  UpdateFieldDefinitionUseCase,
  UpdateMemberUseCase,
  UpdateMembershipTypeUseCase,
} from '../application/member.use-cases';
import {
  CreateFieldDefinitionDto,
  CreateMemberDto,
  CreateMembershipTypeDto,
  MEMBER_STATUSES,
  SetExemptionDto,
  UpdateFieldDefinitionDto,
  UpdateMemberDto,
  UpdateMembershipTypeDto,
} from './member.dto';

@ApiTags('admin-members')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard, PermissionsGuard)
@UseFilters(DomainErrorFilter)
@Controller('admin')
export class AdminMembersController {
  constructor(
    private readonly listMembershipTypes: ListMembershipTypesUseCase,
    private readonly createMembershipType: CreateMembershipTypeUseCase,
    private readonly updateMembershipType: UpdateMembershipTypeUseCase,
    private readonly listMembers: ListMembersUseCase,
    private readonly getMember: GetMemberUseCase,
    private readonly createMember: CreateMemberUseCase,
    private readonly updateMember: UpdateMemberUseCase,
    private readonly activateMember: ActivateMemberUseCase,
    private readonly suspendMember: SuspendMemberUseCase,
    private readonly setExemption: SetMemberExemptionUseCase,
    private readonly deleteMember: DeleteMemberUseCase,
    private readonly listFieldDefinitions: ListFieldDefinitionsUseCase,
    private readonly createFieldDefinition: CreateFieldDefinitionUseCase,
    private readonly updateFieldDefinition: UpdateFieldDefinitionUseCase,
    private readonly deleteFieldDefinition: DeleteFieldDefinitionUseCase,
  ) {}

  @Get('membership-types')
  @RequirePermissions('members.read')
  membershipTypes(@CurrentTenant() tenant: TenantContext) {
    return this.listMembershipTypes.execute(tenant.organizationId);
  }

  @Post('membership-types')
  @RequirePermissions('members.write')
  createType(@CurrentTenant() tenant: TenantContext, @Body() body: CreateMembershipTypeDto) {
    return this.createMembershipType.execute({
      organizationId: tenant.organizationId,
      ...body,
    });
  }

  @Patch('membership-types/:id')
  @RequirePermissions('members.write')
  updateType(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateMembershipTypeDto,
  ) {
    return this.updateMembershipType.execute({
      organizationId: tenant.organizationId,
      id,
      ...body,
    });
  }

  @Get('members')
  @RequirePermissions('members.read')
  @ApiQuery({ name: 'status', required: false, enum: MEMBER_STATUSES })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  members(
    @CurrentTenant() tenant: TenantContext,
    @Query('status') status?: MemberStatus,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listMembers.execute({
      organizationId: tenant.organizationId,
      status,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('members')
  @RequirePermissions('members.write')
  create(@CurrentTenant() tenant: TenantContext, @Body() body: CreateMemberDto) {
    return this.createMember.execute({
      organizationId: tenant.organizationId,
      ...body,
    });
  }

  @Get('members/:id')
  @RequirePermissions('members.read')
  get(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.getMember.byId(tenant.organizationId, id);
  }

  @Patch('members/:id')
  @RequirePermissions('members.write')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateMemberDto,
  ) {
    return this.updateMember.execute({
      organizationId: tenant.organizationId,
      id,
      ...body,
    });
  }

  @Post('members/:id/activate')
  @RequirePermissions('members.write')
  @ApiOperation({ summary: 'Activate member (draft/pending/suspended → active)' })
  activate(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.activateMember.execute(tenant.organizationId, id);
  }

  @Post('members/:id/suspend')
  @RequirePermissions('members.write')
  suspend(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.suspendMember.execute(tenant.organizationId, id);
  }

  @Post('members/:id/exemption')
  @RequirePermissions('members.write')
  @ApiOperation({ summary: 'Grant or revoke dues exemption' })
  exemption(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetExemptionDto,
  ) {
    return this.setExemption.execute({
      organizationId: tenant.organizationId,
      id,
      actorUserId: auth.userId,
      duesExempt: body.duesExempt,
      reason: body.reason,
    });
  }

  @Delete('members/:id')
  @RequirePermissions('members.write')
  remove(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.deleteMember.execute(tenant.organizationId, id);
  }

  @Get('field-definitions')
  @RequirePermissions('members.read')
  fields(@CurrentTenant() tenant: TenantContext) {
    return this.listFieldDefinitions.execute(tenant.organizationId);
  }

  @Post('field-definitions')
  @RequirePermissions('members.write')
  createField(@CurrentTenant() tenant: TenantContext, @Body() body: CreateFieldDefinitionDto) {
    return this.createFieldDefinition.execute({
      organizationId: tenant.organizationId,
      ...body,
    });
  }

  @Patch('field-definitions/:id')
  @RequirePermissions('members.write')
  updateField(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateFieldDefinitionDto,
  ) {
    return this.updateFieldDefinition.execute({
      organizationId: tenant.organizationId,
      id,
      ...body,
    });
  }

  @Delete('field-definitions/:id')
  @RequirePermissions('members.write')
  deleteField(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.deleteFieldDefinition.execute(tenant.organizationId, id);
  }
}
