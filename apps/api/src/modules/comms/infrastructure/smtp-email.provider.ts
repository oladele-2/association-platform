import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { DomainError } from '@association/shared-kernel';
import type { AppEnv } from '../../../config/env.validation';
import type { EmailProvider } from '../application/ports/comms.repository';

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  readonly driver = 'smtp' as const;
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(config: ConfigService<AppEnv, true>) {
    const host = config.get('SMTP_HOST', { infer: true });
    if (!host) {
      throw new Error('SmtpEmailProvider requires SMTP_HOST');
    }
    const port = config.get('SMTP_PORT', { infer: true });
    const user = config.get('SMTP_USER', { infer: true });
    const pass = config.get('SMTP_PASS', { infer: true });
    this.from = config.get('SMTP_FROM', { infer: true }) ?? user ?? `noreply@${host}`;
    this.transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async send(input: { to: string; subject: string; bodyMarkdown: string }) {
    try {
      const info = await this.transport.sendMail({
        from: this.from,
        to: input.to,
        subject: input.subject,
        text: input.bodyMarkdown,
      });
      return { providerMessageId: String(info.messageId ?? `smtp_${Date.now()}`) };
    } catch (err) {
      throw new DomainError(
        'SMTP_SEND_FAILED',
        err instanceof Error ? err.message : 'SMTP send failed',
      );
    }
  }
}
