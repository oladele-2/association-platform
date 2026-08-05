import {
  Body,
  Controller,
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
import { ListMyCmeUseCase, SubmitCmeUseCase } from '../application/cme.use-cases';
import { SubmitCmeDto } from './cme.dto';

@ApiTags('me-cme')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard)
@UseFilters(DomainErrorFilter)
@Controller('me/cme')
export class MeCmeController {
  constructor(
    private readonly listMine: ListMyCmeUseCase,
    private readonly submit: SubmitCmeUseCase,
  ) {}

  @Get()
  list(@CurrentTenant() tenant: TenantContext, @CurrentAuthUser() auth: AuthenticatedRequestUser) {
    return this.listMine.execute(tenant.organizationId, auth.userId);
  }

  @Post()
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Body() body: SubmitCmeDto,
  ) {
    return this.submit.execute({
      organizationId: tenant.organizationId,
      userId: auth.userId,
      ...body,
    });
  }

  @Get(':id')
  get(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listMine.byId(tenant.organizationId, auth.userId, id);
  }
}
