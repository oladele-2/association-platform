import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TenancyModule } from '../tenancy/tenancy.module';
import { EMAIL_SENDER } from './application/ports/email.sender';
import { EMAIL_VERIFICATION_TOKEN_REPOSITORY } from './application/ports/email-verification-token.repository';
import { PASSWORD_HASHER } from './application/ports/password-hasher';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from './application/ports/password-reset-token.repository';
import { REFRESH_TOKEN_REPOSITORY } from './application/ports/refresh-token.repository';
import { TOKEN_SERVICE } from './application/ports/token.service';
import { USER_REPOSITORY } from './application/ports/user.repository';
import { LoginUseCase } from './application/login.use-case';
import { RefreshSessionUseCase } from './application/refresh-session.use-case';
import { LogoutUseCase } from './application/logout.use-case';
import { RequestPasswordResetUseCase } from './application/request-password-reset.use-case';
import { ConfirmPasswordResetUseCase } from './application/confirm-password-reset.use-case';
import { RequestEmailVerificationUseCase } from './application/request-email-verification.use-case';
import { ConfirmEmailVerificationUseCase } from './application/confirm-email-verification.use-case';
import { Argon2PasswordHasher } from './infrastructure/argon2-password.hasher';
import { ConsoleEmailSender } from './infrastructure/console-email.sender';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/prisma-refresh-token.repository';
import { PrismaPasswordResetTokenRepository } from './infrastructure/prisma-password-reset-token.repository';
import { PrismaEmailVerificationTokenRepository } from './infrastructure/prisma-email-verification-token.repository';
import { AuthController } from './presentation/auth.controller';
import { AccessJwtGuard } from './presentation/access-jwt.guard';

@Module({
  imports: [TenancyModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    RequestPasswordResetUseCase,
    ConfirmPasswordResetUseCase,
    RequestEmailVerificationUseCase,
    ConfirmEmailVerificationUseCase,
    AccessJwtGuard,
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: EMAIL_SENDER, useClass: ConsoleEmailSender },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY,
      useClass: PrismaPasswordResetTokenRepository,
    },
    {
      provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY,
      useClass: PrismaEmailVerificationTokenRepository,
    },
  ],
  exports: [TOKEN_SERVICE, AccessJwtGuard, USER_REPOSITORY, PASSWORD_HASHER],
})
export class IdentityModule {}
