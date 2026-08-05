import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from './ports/refresh-token.repository';
import { TOKEN_SERVICE, type TokenService } from './ports/token.service';
import { USER_REPOSITORY, type UserRepository } from './ports/user.repository';
import type { AuthSessionResult } from './login.use-case';

export type RefreshCommand = {
  refreshToken: string;
  userAgent?: string | null;
  ip?: string | null;
  refreshTtlSeconds: number;
};

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refresh: RefreshTokenRepository,
  ) {}

  async execute(cmd: RefreshCommand): Promise<AuthSessionResult> {
    const stored = await this.refresh.findByRawToken(cmd.refreshToken);
    if (!stored) {
      throw new DomainError('INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    }

    const now = new Date();

    if (stored.revokedAt) {
      // Reuse of a rotated token → revoke whole family
      await this.refresh.revokeFamily(stored.organizationId, stored.familyId, now);
      throw new DomainError(
        'REFRESH_TOKEN_REUSE',
        'Refresh token reuse detected; session family revoked',
      );
    }

    if (stored.expiresAt.getTime() <= now.getTime()) {
      throw new DomainError('REFRESH_TOKEN_EXPIRED', 'Refresh token expired');
    }

    const user = await this.users.findById(stored.organizationId, stored.userId);
    if (!user) {
      throw new DomainError('INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    }
    user.assertCanLogin();

    const rotated = await this.refresh.rotate({
      current: stored,
      expiresAt: new Date(now.getTime() + cmd.refreshTtlSeconds * 1000),
      userAgent: cmd.userAgent,
      ip: cmd.ip,
    });

    const access = await this.tokens.signAccessToken({
      sub: user.id,
      orgId: user.organizationId,
      email: user.email,
    });

    return {
      accessToken: access.token,
      accessTokenExpiresIn: access.expiresInSeconds,
      refreshToken: rotated.rawToken,
      refreshTokenExpiresAt: rotated.expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.isEmailVerified,
        mustResetPassword: user.mustResetPassword,
        status: user.status,
      },
    };
  }
}
