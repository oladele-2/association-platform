import { Injectable } from '@nestjs/common';
import { APP_NAME } from '@association/shared';

@Injectable()
export class HealthService {
  getStatus() {
    return {
      status: 'ok' as const,
      service: APP_NAME,
      milestone: 0,
    };
  }
}
