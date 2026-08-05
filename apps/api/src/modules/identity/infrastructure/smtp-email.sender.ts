import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { AppEnv } from '../../../config/env.validation';
import type { EmailMessage, EmailSender } from '../application/ports/email.sender';

@Injectable()
export class SmtpEmailSender implements EmailSender {
  private readonly logger = new Logger(SmtpEmailSender.name);
  private readonly transport;
  private readonly from: string;

  constructor(config: ConfigService<AppEnv, true>) {
    const host = config.get('SMTP_HOST', { infer: true });
    if (!host) throw new Error('SmtpEmailSender requires SMTP_HOST');
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

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    this.logger.debug(`SMTP email sent to ${message.to}`);
  }
}
