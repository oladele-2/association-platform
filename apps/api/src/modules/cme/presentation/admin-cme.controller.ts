import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { AccessJwtGuard } from '../../identity/presentation/access-jwt.guard';
import { CurrentAuthUser } from '../../identity/presentation/current-auth-user.decorator';
import type { AuthenticatedRequestUser } from '../../identity/presentation/access-jwt.guard';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { PermissionsGuard } from '../../rbac/presentation/permissions.guard';
import { RequirePermissions } from '../../rbac/presentation/require-permissions.decorator';
import type { CmeStatus } from '../domain/cme.rules';
import {
  ApproveCmeUseCase,
  GetCmeSubmissionUseCase,
  ListCmeSubmissionsUseCase,
  RejectCmeUseCase,
} from '../application/cme.use-cases';
import { RejectCmeDto } from './cme.dto';

@ApiTags('admin-cme')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard, PermissionsGuard)
@UseFilters(DomainErrorFilter)
@Controller('admin/cme')
export class AdminCmeController {
  constructor(
    private readonly listCme: ListCmeSubmissionsUseCase,
    private readonly getCme: GetCmeSubmissionUseCase,
    private readonly approveCme: ApproveCmeUseCase,
    private readonly rejectCme: RejectCmeUseCase,
  ) {}

  @Get()
  @RequirePermissions('cme.read')
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  list(
    @CurrentTenant() tenant: TenantContext,
    @Query('status') status?: CmeStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listCme.execute({
      organizationId: tenant.organizationId,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('cme.read')
  get(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.getCme.execute(tenant.organizationId, id);
  }

  @Post(':id/approve')
  @RequirePermissions('cme.review')
  approve(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.approveCme.execute(tenant.organizationId, id, auth.userId);
  }

  @Post(':id/reject')
  @RequirePermissions('cme.review')
  reject(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RejectCmeDto,
  ) {
    return this.rejectCme.execute(tenant.organizationId, id, auth.userId, body.reason);
  }
}
