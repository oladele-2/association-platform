import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { AccessJwtGuard } from '../../identity/presentation/access-jwt.guard';
import { CurrentAuthUser } from '../../identity/presentation/current-auth-user.decorator';
import type { AuthenticatedRequestUser } from '../../identity/presentation/access-jwt.guard';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import {
  CancelEventRegistrationUseCase,
  ListMyEventsUseCase,
  RegisterForEventUseCase,
} from '../application/registration.use-cases';

@ApiTags('me-events')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard)
@UseFilters(DomainErrorFilter)
@Controller('me/events')
export class MeEventsController {
  constructor(
    private readonly listMine: ListMyEventsUseCase,
    private readonly register: RegisterForEventUseCase,
    private readonly cancel: CancelEventRegistrationUseCase,
  ) {}

  @Get()
  list(@CurrentTenant() tenant: TenantContext, @CurrentAuthUser() auth: AuthenticatedRequestUser) {
    return this.listMine.execute(tenant.organizationId, auth.userId);
  }

  @Post(':id/registrations')
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.register.execute(tenant.organizationId, auth.userId, id);
  }

  @Delete(':id/registrations')
  remove(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cancel.execute(tenant.organizationId, auth.userId, id);
  }
}
