import { describe, expect, it } from 'vitest';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns ok status for milestone 0', () => {
    const service = new HealthService();
    expect(service.getStatus()).toMatchObject({
      status: 'ok',
      milestone: 0,
    });
  });
});
