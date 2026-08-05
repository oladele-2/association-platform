import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { CredentialsPolicy } from '../domain/credentials.policy';
import { PASSWORD_HASHER, type PasswordHasher } from './ports/password-hasher';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  type PasswordResetTokenRepository,
} from './ports/password-reset-token.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from './ports/refresh-token.repository';
import { USER_REPOSITORY, type UserRepository } from './ports/user.repository';

export type ConfirmPasswordResetCommand = {
  token: string;
  newPassword: string;
};

@Injectable()
export class ConfirmPasswordResetUseCase {
  private readonly policy = new CredentialsPolicy();

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resets: PasswordResetTokenRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refresh: RefreshTokenRepository,
  ) {}

  async execute(cmd: ConfirmPasswordResetCommand): Promise<{ ok: true }> {
    this.policy.assertPasswordStrength(cmd.newPassword);

    const consumed = await this.resets.consume(cmd.token, new Date());
    if (!consumed) {
      throw new DomainError('INVALID_RESET_TOKEN', 'Invalid or expired reset token');
    }

    const user = await this.users.findById(consumed.organizationId, consumed.userId);
    if (!user || user.status === 'disabled') {
      throw new DomainError('INVALID_RESET_TOKEN', 'Invalid or expired reset token');
    }

    const passwordHash = await this.hasher.hash(cmd.newPassword);
    await this.users.save(user.withPasswordHash(passwordHash));
    await this.refresh.revokeAllForUser(consumed.organizationId, consumed.userId, new Date());

    return { ok: true };
  }
}
