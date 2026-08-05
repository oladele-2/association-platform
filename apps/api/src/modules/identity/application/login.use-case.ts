import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CredentialsPolicy } from '../domain/credentials.policy';
import { PASSWORD_HASHER, type PasswordHasher } from './ports/password-hasher';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from './ports/refresh-token.repository';
import { TOKEN_SERVICE, type TokenService } from './ports/token.service';
import { USER_REPOSITORY, type UserRepository } from './ports/user.repository';

export type LoginCommand = {
  organizationId: string;
  email: string;
  password: string;
  userAgent?: string | null;
  ip?: string | null;
  refreshTtlSeconds: number;
};

export type AuthSessionResult = {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    mustResetPassword: boolean;
    status: string;
  };
};

@Injectable()
export class LoginUseCase {
  private readonly policy = new CredentialsPolicy();

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refresh: RefreshTokenRepository,
  ) {}

  async execute(cmd: LoginCommand): Promise<AuthSessionResult> {
    const email = cmd.email.trim().toLowerCase();
    const user = await this.users.findByEmail(cmd.organizationId, email);
    const passwordValid = user ? await this.hasher.verify(user.passwordHash, cmd.password) : false;

    const authenticated = this.policy.assertCredentialsMatch(user, passwordValid);

    const now = new Date();
    await this.users.touchLastLogin(cmd.organizationId, authenticated.id, now);

    const access = await this.tokens.signAccessToken({
      sub: authenticated.id,
      orgId: authenticated.organizationId,
      email: authenticated.email,
    });

    const refresh = await this.refresh.issue({
      organizationId: authenticated.organizationId,
      userId: authenticated.id,
      familyId: randomUUID(),
      expiresAt: new Date(now.getTime() + cmd.refreshTtlSeconds * 1000),
      userAgent: cmd.userAgent,
      ip: cmd.ip,
    });

    return {
      accessToken: access.token,
      accessTokenExpiresIn: access.expiresInSeconds,
      refreshToken: refresh.rawToken,
      refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
      user: {
        id: authenticated.id,
        email: authenticated.email,
        emailVerified: authenticated.isEmailVerified,
        mustResetPassword: authenticated.mustResetPassword,
        status: authenticated.status,
      },
    };
  }
}
