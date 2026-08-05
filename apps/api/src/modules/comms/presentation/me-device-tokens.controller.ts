import { Body, Controller, Post, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { AccessJwtGuard } from '../../identity/presentation/access-jwt.guard';
import { CurrentAuthUser } from '../../identity/presentation/current-auth-user.decorator';
import type { AuthenticatedRequestUser } from '../../identity/presentation/access-jwt.guard';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import {
  RegisterDeviceTokenUseCase,
  RevokeDeviceTokenUseCase,
} from '../application/comms.use-cases';

class DeviceTokenDto {
  @IsString()
  @MinLength(32)
  @MaxLength(4096)
  token!: string;

  @IsIn(['android', 'ios', 'web'])
  platform!: 'android' | 'ios' | 'web';
}

class RevokeDeviceTokenDto {
  @IsString()
  @MinLength(32)
  @MaxLength(4096)
  token!: string;
}

@ApiTags('me-device-tokens')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard)
@UseFilters(DomainErrorFilter)
@Controller('me/device-tokens')
export class MeDeviceTokensController {
  constructor(
    private readonly register: RegisterDeviceTokenUseCase,
    private readonly revoke: RevokeDeviceTokenUseCase,
  ) {}

  @Post()
  upsert(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Body() body: DeviceTokenDto,
  ) {
    return this.register.execute({
      organizationId: tenant.organizationId,
      userId: auth.userId,
      token: body.token,
      platform: body.platform,
    });
  }

  @Post('revoke')
  remove(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Body() body: RevokeDeviceTokenDto,
  ) {
    return this.revoke.execute({
      organizationId: tenant.organizationId,
      userId: auth.userId,
      token: body.token,
    });
  }
}
