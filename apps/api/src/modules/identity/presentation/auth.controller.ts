import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AppEnv } from '../../../config/env.validation';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import { TenantGuard } from '../../tenancy/presentation/tenant.guard';
import { TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { LoginUseCase } from '../application/login.use-case';
import { RefreshSessionUseCase } from '../application/refresh-session.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { RequestPasswordResetUseCase } from '../application/request-password-reset.use-case';
import { ConfirmPasswordResetUseCase } from '../application/confirm-password-reset.use-case';
import { RequestEmailVerificationUseCase } from '../application/request-email-verification.use-case';
import { ConfirmEmailVerificationUseCase } from '../application/confirm-email-verification.use-case';
import { USER_REPOSITORY, type UserRepository } from '../application/ports/user.repository';
import { Inject } from '@nestjs/common';
import { DomainErrorFilter } from './domain-error.filter';
import { AccessJwtGuard } from './access-jwt.guard';
import { CurrentAuthUser } from './current-auth-user.decorator';
import type { AuthenticatedRequestUser } from './access-jwt.guard';
import {
  AuthSessionResponseDto,
  ConfirmEmailVerificationDto,
  ConfirmPasswordResetDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RequestPasswordResetDto,
} from './auth.dto';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('auth')
@ApiHeader({
  name: TENANT_HEADER,
  description: 'Organization slug (required on localhost; Host domain used in production)',
  required: false,
})
@Controller('auth')
@UseFilters(DomainErrorFilter)
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly logout: LogoutUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly confirmPasswordReset: ConfirmPasswordResetUseCase,
    private readonly requestEmailVerification: RequestEmailVerificationUseCase,
    private readonly confirmEmailVerification: ConfirmEmailVerificationUseCase,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  @Post('login')
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'Login with email/password; issues access JWT + refresh token' })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  async loginHandler(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.login.execute({
      organizationId: tenant.organizationId,
      email: body.email,
      password: body.password,
      userAgent: req.header('user-agent'),
      ip: req.ip,
      refreshTtlSeconds: this.config.get('JWT_REFRESH_TTL_SECONDS', { infer: true }),
    });
    this.setRefreshCookie(res, session.refreshToken);
    return session;
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  async refreshHandler(
    @Body() body: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = body.refreshToken ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);
    const session = await this.refreshSession.execute({
      refreshToken: raw ?? '',
      userAgent: req.header('user-agent'),
      ip: req.ip,
      refreshTtlSeconds: this.config.get('JWT_REFRESH_TTL_SECONDS', { infer: true }),
    });
    this.setRefreshCookie(res, session.refreshToken);
    return session;
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke refresh token and clear cookie' })
  async logoutHandler(
    @Body() body: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = body.refreshToken ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);
    await this.logout.execute(raw);
    res.clearCookie(REFRESH_COOKIE, { path: '/v1/auth' });
    return { ok: true };
  }

  @Post('password-reset/request')
  @HttpCode(200)
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'Request password reset email (always returns ok)' })
  async requestReset(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: RequestPasswordResetDto,
  ) {
    return this.requestPasswordReset.execute({
      organizationId: tenant.organizationId,
      email: body.email,
      organizationSlug: tenant.slug,
      appPublicUrl: this.config.get('APP_PUBLIC_URL', { infer: true }),
    });
  }

  @Post('password-reset/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm password reset with opaque token' })
  async confirmReset(@Body() body: ConfirmPasswordResetDto) {
    return this.confirmPasswordReset.execute({
      token: body.token,
      newPassword: body.newPassword,
    });
  }

  @Post('email-verification/request')
  @HttpCode(200)
  @UseGuards(TenantGuard, AccessJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email verification link for the current user' })
  async requestVerify(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
  ) {
    return this.requestEmailVerification.execute({
      organizationId: tenant.organizationId,
      userId: auth.userId,
      organizationSlug: tenant.slug,
      appPublicUrl: this.config.get('APP_PUBLIC_URL', { infer: true }),
    });
  }

  @Post('email-verification/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm email verification with opaque token' })
  async confirmVerify(@Body() body: ConfirmEmailVerificationDto) {
    return this.confirmEmailVerification.execute(body.token);
  }

  @Get('me')
  @UseGuards(AccessJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current authenticated user profile' })
  async me(@CurrentAuthUser() auth: AuthenticatedRequestUser) {
    const user = await this.users.findById(auth.organizationId, auth.userId);
    if (!user) {
      return { id: auth.userId, email: auth.email, organizationId: auth.organizationId };
    }
    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      emailVerified: user.isEmailVerified,
      mustResetPassword: user.mustResetPassword,
      status: user.status,
    };
  }

  private setRefreshCookie(res: Response, token: string): void {
    const maxAge = this.config.get('JWT_REFRESH_TTL_SECONDS', { infer: true }) * 1000;
    const secure = this.config.get('NODE_ENV', { infer: true }) === 'production';
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/v1/auth',
      maxAge,
    });
  }
}
