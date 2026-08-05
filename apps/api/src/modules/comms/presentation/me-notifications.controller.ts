import { Controller, Get, Param, ParseUUIDPipe, Post, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { AccessJwtGuard } from '../../identity/presentation/access-jwt.guard';
import { CurrentAuthUser } from '../../identity/presentation/current-auth-user.decorator';
import type { AuthenticatedRequestUser } from '../../identity/presentation/access-jwt.guard';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import {
  ListMyNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
} from '../application/comms.use-cases';

@ApiTags('me-notifications')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard)
@UseFilters(DomainErrorFilter)
@Controller('me/notifications')
export class MeNotificationsController {
  constructor(
    private readonly list: ListMyNotificationsUseCase,
    private readonly markRead: MarkNotificationReadUseCase,
    private readonly markAll: MarkAllNotificationsReadUseCase,
  ) {}

  @Get()
  getAll(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
  ) {
    return this.list.execute(tenant.organizationId, auth.userId);
  }

  @Post('read-all')
  readAll(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
  ) {
    return this.markAll.execute(tenant.organizationId, auth.userId);
  }

  @Post(':id/read')
  readOne(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.markRead.execute(tenant.organizationId, auth.userId, id);
  }
}
