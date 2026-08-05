import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import {
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
  type EmailVerificationTokenRepository,
} from './ports/email-verification-token.repository';
import { USER_REPOSITORY, type UserRepository } from './ports/user.repository';

@Injectable()
export class ConfirmEmailVerificationUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly verifications: EmailVerificationTokenRepository,
  ) {}

  async execute(token: string): Promise<{ ok: true }> {
    const consumed = await this.verifications.consume(token, new Date());
    if (!consumed) {
      throw new DomainError('INVALID_VERIFY_TOKEN', 'Invalid or expired verification token');
    }

    const user = await this.users.findById(consumed.organizationId, consumed.userId);
    if (!user || user.status === 'disabled') {
      throw new DomainError('INVALID_VERIFY_TOKEN', 'Invalid or expired verification token');
    }

    if (!user.isEmailVerified) {
      await this.users.save(user.withEmailVerified(new Date()));
    }

    return { ok: true };
  }
}
