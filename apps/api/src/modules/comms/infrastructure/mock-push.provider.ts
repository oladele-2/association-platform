import { Injectable, Logger } from '@nestjs/common';
import type { PushProvider, PushSendResult } from '../application/ports/comms.repository';

/** Dev/CI stub — never reaches a real device. Requires ALLOW_MOCK_PUSH in production. */
@Injectable()
export class MockPushProvider implements PushProvider {
  readonly driver = 'mock' as const;
  private readonly logger = new Logger(MockPushProvider.name);

  async send(input: {
    tokens: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<PushSendResult> {
    this.logger.log(`mock push → ${input.tokens.length} token(s): ${input.title.slice(0, 80)}`);
    return {
      successCount: input.tokens.length,
      failureCount: 0,
      invalidTokens: [],
    };
  }
}
