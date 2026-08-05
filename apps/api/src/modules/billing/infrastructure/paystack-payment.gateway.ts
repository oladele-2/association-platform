import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { DomainError } from '@association/shared-kernel';
import type { AppEnv } from '../../../config/env.validation';
import type {
  InitializePaymentResult,
  PaymentGateway,
  VerifyTransactionResult,
} from '../application/ports/billing.repository';

/**
 * Paystack REST adapter. When PAYMENTS_DRIVER is `mock` (no PAYSTACK_SECRET_KEY),
 * runs in-process mock mode for local/dev. Production requires a secret or
 * explicit ALLOW_MOCK_PAYSTACK=true (enforced in env.validation).
 */
@Injectable()
export class PaystackPaymentGateway implements PaymentGateway {
  /** In-memory amounts for mock verify (reference → settlement data). */
  private readonly mockTx = new Map<string, { amountKobo: bigint; currency: string }>();

  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  private get secret(): string | undefined {
    return this.config.get('PAYSTACK_SECRET_KEY', { infer: true });
  }

  private get mockMode(): boolean {
    return this.config.get('PAYMENTS_DRIVER', { infer: true }) === 'mock';
  }

  async initialize(input: {
    amountKobo: bigint;
    currency: string;
    email: string;
    reference: string;
    callbackUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<InitializePaymentResult> {
    if (this.mockMode) {
      this.mockTx.set(input.reference, {
        amountKobo: input.amountKobo,
        currency: input.currency.toUpperCase(),
      });
      return {
        authorizationUrl: `https://checkout.paystack.com/mock/${input.reference}`,
        accessCode: `mock_${input.reference.slice(0, 12)}`,
        reference: input.reference,
        raw: { mock: true, amountKobo: input.amountKobo.toString() },
      };
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        amount: toPaystackAmount(input.amountKobo),
        currency: input.currency,
        reference: input.reference,
        callback_url: input.callbackUrl || undefined,
        metadata: input.metadata,
      }),
    });

    const raw = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: {
        authorization_url?: string;
        access_code?: string;
        reference?: string;
      };
    };

    if (!response.ok || !raw.status || !raw.data?.authorization_url || !raw.data.reference) {
      throw new DomainError('PAYSTACK_INIT_FAILED', raw.message ?? 'Paystack initialize failed');
    }

    return {
      authorizationUrl: raw.data.authorization_url,
      accessCode: raw.data.access_code ?? '',
      reference: raw.data.reference,
      raw,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    if (this.mockMode) {
      // Fail closed even in mock: callers must send `x-paystack-signature: mock`.
      return signature === 'mock';
    }
    if (!signature || !this.secret) return false;
    const hash = createHmac('sha512', this.secret).update(rawBody).digest('hex');
    try {
      const a = Buffer.from(hash, 'utf8');
      const b = Buffer.from(signature, 'utf8');
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    if (this.mockMode) {
      const stored = this.mockTx.get(reference);
      if (!stored) {
        return {
          status: 'pending',
          amountKobo: 0n,
          currency: 'NGN',
          reference,
          raw: { mock: true, reference, known: false },
        };
      }
      return {
        status: 'success',
        amountKobo: stored.amountKobo,
        currency: stored.currency,
        reference,
        raw: { mock: true, reference, amountKobo: stored.amountKobo.toString() },
      };
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${this.secret}` },
      },
    );
    const raw = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: {
        status?: string;
        amount?: number;
        currency?: string;
        reference?: string;
      };
    };

    if (!response.ok || !raw.status || !raw.data) {
      throw new DomainError('PAYSTACK_VERIFY_FAILED', raw.message ?? 'Paystack verify failed');
    }

    const status =
      raw.data.status === 'success'
        ? 'success'
        : raw.data.status === 'failed'
          ? 'failed'
          : 'pending';

    return {
      status,
      amountKobo: BigInt(raw.data.amount ?? 0),
      currency: (raw.data.currency ?? 'NGN').toUpperCase(),
      reference: raw.data.reference ?? reference,
      raw,
    };
  }
}

/** Paystack JSON amount is an integer in minor units; stay within Number.MAX_SAFE_INTEGER. */
function toPaystackAmount(amountKobo: bigint): number {
  if (amountKobo < 0n || amountKobo > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new DomainError('AMOUNT_OUT_OF_RANGE', 'Amount cannot be serialized safely for Paystack');
  }
  return Number(amountKobo);
}
