import { Body, Controller, Get, Post, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../../../config/env.validation';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { BootstrapPlatformUseCase } from '../application/bootstrap-platform.use-case';
import { PlatformLoginUseCase } from '../application/platform-login.use-case';
import { BootstrapPlatformDto, PlatformLoginDto } from './platform.dto';
import { PlatformJwtGuard } from './platform-jwt.guard';
import { CurrentPlatformUser } from './current-platform-user.decorator';
import type { PlatformAuthUser } from './platform-jwt.guard';

@ApiTags('platform-auth')
@Controller('platform/auth')
@UseFilters(DomainErrorFilter)
export class PlatformAuthController {
  constructor(
    private readonly login: PlatformLoginUseCase,
    private readonly bootstrap: BootstrapPlatformUseCase,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  @Post('bootstrap')
  @ApiOperation({
    summary: 'One-time bootstrap: first platform operator + starter plan (requires secret)',
  })
  bootstrapHandler(@Body() body: BootstrapPlatformDto) {
    return this.bootstrap.execute({
      bootstrapSecret: this.config.get('PLATFORM_BOOTSTRAP_SECRET', { infer: true }),
      providedSecret: body.bootstrapSecret,
      email: body.email,
      name: body.name,
      password: body.password,
    });
  }

  @Post('login')
  @ApiOperation({ summary: 'Platform operator login (separate from tenant identity)' })
  loginHandler(@Body() body: PlatformLoginDto) {
    return this.login.execute({ email: body.email, password: body.password });
  }

  @Get('me')
  @UseGuards(PlatformJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current platform operator' })
  me(@CurrentPlatformUser() user: PlatformAuthUser) {
    return user;
  }
}
