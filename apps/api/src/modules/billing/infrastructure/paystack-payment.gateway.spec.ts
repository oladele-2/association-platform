import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../../../config/env.validation';
import { PaystackPaymentGateway } from './paystack-payment.gateway';

function configStub(env: Partial<AppEnv>): ConfigService<AppEnv, true> {
  return {
    get: (key: keyof AppEnv) => env[key],
  } as unknown as ConfigService<AppEnv, true>;
}

describe('PaystackPaymentGateway mock mode', () => {
  it('rejects missing mock webhook signature', () => {
    const gateway = new PaystackPaymentGateway(
      configStub({ PAYMENTS_DRIVER: 'mock', PAYSTACK_SECRET_KEY: undefined }),
    );
    expect(gateway.verifyWebhookSignature('{}', undefined)).toBe(false);
    expect(gateway.verifyWebhookSignature('{}', 'mock')).toBe(true);
  });

  it('verify returns initialized amount', async () => {
    const gateway = new PaystackPaymentGateway(
      configStub({ PAYMENTS_DRIVER: 'mock', PAYSTACK_SECRET_KEY: undefined }),
    );
    await gateway.initialize({
      amountKobo: 12_500n,
      currency: 'NGN',
      email: 'a@b.c',
      reference: 'ref_mock_1',
      callbackUrl: 'http://localhost/cb',
    });
    const verified = await gateway.verifyTransaction('ref_mock_1');
    expect(verified.status).toBe('success');
    expect(verified.amountKobo).toBe(12_500n);
    expect(verified.currency).toBe('NGN');
  });
});
