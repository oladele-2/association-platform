import { Body, Controller, Get, Patch, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { AccessJwtGuard } from '../../identity/presentation/access-jwt.guard';
import { CurrentAuthUser } from '../../identity/presentation/current-auth-user.decorator';
import type { AuthenticatedRequestUser } from '../../identity/presentation/access-jwt.guard';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { GetMyProfileUseCase, UpdateMyProfileUseCase } from '../application/member.use-cases';
import { UpdateMyProfileDto } from './member.dto';

@ApiTags('me-profile')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard)
@UseFilters(DomainErrorFilter)
@Controller('me')
export class MeProfileController {
  constructor(
    private readonly getProfile: GetMyProfileUseCase,
    private readonly updateProfile: UpdateMyProfileUseCase,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Member profile linked to the current user' })
  get(@CurrentTenant() tenant: TenantContext, @CurrentAuthUser() auth: AuthenticatedRequestUser) {
    return this.getProfile.execute(tenant.organizationId, auth.userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update limited self-service profile fields' })
  patch(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Body() body: UpdateMyProfileDto,
  ) {
    return this.updateProfile.execute({
      organizationId: tenant.organizationId,
      userId: auth.userId,
      ...body,
    });
  }
}
