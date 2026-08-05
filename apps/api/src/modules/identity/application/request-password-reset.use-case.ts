import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_SENDER, type EmailSender } from './ports/email.sender';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  type PasswordResetTokenRepository,
} from './ports/password-reset-token.repository';
import { USER_REPOSITORY, type UserRepository } from './ports/user.repository';

export type RequestPasswordResetCommand = {
  organizationId: string;
  email: string;
  appPublicUrl: string;
  organizationSlug: string;
  ttlSeconds?: number;
};

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resets: PasswordResetTokenRepository,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
  ) {}

  async execute(cmd: RequestPasswordResetCommand): Promise<{ ok: true }> {
    const email = cmd.email.trim().toLowerCase();
    const user = await this.users.findByEmail(cmd.organizationId, email);

    // Always succeed to avoid account enumeration
    if (!user || user.status === 'disabled') {
      return { ok: true };
    }

    const ttl = cmd.ttlSeconds ?? 60 * 60;
    const issued = await this.resets.issue({
      organizationId: cmd.organizationId,
      userId: user.id,
      expiresAt: new Date(Date.now() + ttl * 1000),
    });

    const link = `${cmd.appPublicUrl}/reset-password?token=${encodeURIComponent(issued.rawToken)}&org=${encodeURIComponent(cmd.organizationSlug)}`;
    await this.email.send({
      to: user.email,
      subject: 'Reset your password',
      text: `Use this link to reset your password (expires in ${Math.floor(ttl / 60)} minutes):\n\n${link}\n\nIf you did not request this, ignore this email.`,
    });

    return { ok: true };
  }
}
