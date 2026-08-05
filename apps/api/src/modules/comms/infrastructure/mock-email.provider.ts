import { Injectable, Logger } from '@nestjs/common';
import type { EmailProvider } from '../application/ports/comms.repository';

/** Stub provider — logs and succeeds. Swap for SMTP/Resend later. */
@Injectable()
export class MockEmailProvider implements EmailProvider {
  readonly driver = 'mock' as const;
  private readonly logger = new Logger(MockEmailProvider.name);

  async send(input: { to: string; subject: string; bodyMarkdown: string }) {
    this.logger.log(`mock email → ${input.to}: ${input.subject}`);
    return { providerMessageId: `mock_${Date.now()}` };
  }
}
