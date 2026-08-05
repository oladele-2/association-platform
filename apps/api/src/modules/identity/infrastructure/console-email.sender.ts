import { Injectable, Logger } from '@nestjs/common';
import type { EmailMessage, EmailSender } from '../application/ports/email.sender';

/** Development adapter — logs messages. Replace with SES/R2-worker later. */
@Injectable()
export class ConsoleEmailSender implements EmailSender {
  private readonly logger = new Logger(ConsoleEmailSender.name);

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(`Email → ${message.to} | ${message.subject}\n${message.text}`);
  }
}
