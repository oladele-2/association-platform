import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_SENDER, type EmailSender } from './ports/email.sender';
import {
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
  type EmailVerificationTokenRepository,
} from './ports/email-verification-token.repository';
import { USER_REPOSITORY, type UserRepository } from './ports/user.repository';

export type RequestEmailVerificationCommand = {
  organizationId: string;
  userId: string;
  appPublicUrl: string;
  organizationSlug: string;
  ttlSeconds?: number;
};

@Injectable()
export class RequestEmailVerificationUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly verifications: EmailVerificationTokenRepository,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
  ) {}

  async execute(cmd: RequestEmailVerificationCommand): Promise<{ ok: true }> {
    const user = await this.users.findById(cmd.organizationId, cmd.userId);
    if (!user || user.isEmailVerified || user.status === 'disabled') {
      return { ok: true };
    }

    const ttl = cmd.ttlSeconds ?? 60 * 60 * 24;
    const issued = await this.verifications.issue({
      organizationId: cmd.organizationId,
      userId: user.id,
      expiresAt: new Date(Date.now() + ttl * 1000),
    });

    const link = `${cmd.appPublicUrl}/verify-email?token=${encodeURIComponent(issued.rawToken)}&org=${encodeURIComponent(cmd.organizationSlug)}`;
    await this.email.send({
      to: user.email,
      subject: 'Verify your email',
      text: `Verify your email address:\n\n${link}\n\nThis link expires in ${Math.floor(ttl / 3600)} hours.`,
    });

    return { ok: true };
  }
}
