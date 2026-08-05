import { Injectable, Logger } from '@nestjs/common';
import type { EmailProvider } from '../application/ports/comms.repository';

/** Stub provider — logs redacted recipient and succeeds. Swap for SMTP/Resend later. */
@Injectable()
export class MockEmailProvider implements EmailProvider {
  readonly driver = 'mock' as const;
  private readonly logger = new Logger(MockEmailProvider.name);

  async send(input: { to: string; subject: string; bodyMarkdown: string }) {
    this.logger.log(`mock email → ${redactEmail(input.to)}: ${input.subject}`);
    return { providerMessageId: `mock_${Date.now()}` };
  }
}

function redactEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || !local) return '***';
  const hint = local.length <= 1 ? '*' : `${local[0]}***`;
  return `${hint}@${domain}`;
}
