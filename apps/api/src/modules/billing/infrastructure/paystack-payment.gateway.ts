import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { DomainError } from '@association/shared-kernel';
import type {
  InitializePaymentResult,
  PaymentGateway,
  VerifyTransactionResult,
} from '../application/ports/billing.repository';

/**
 * Paystack REST adapter. When PAYSTACK_SECRET_KEY is unset, runs in mock mode
 * (useful for local/dev tests without live credentials).
 */
@Injectable()
export class PaystackPaymentGateway implements PaymentGateway {
  private get secret(): string | undefined {
    const value = process.env.PAYSTACK_SECRET_KEY?.trim();
    return value || undefined;
  }

  private get mockMode(): boolean {
    return !this.secret;
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
        amount: Number(input.amountKobo),
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
      return signature === 'mock' || signature === undefined;
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
      return {
        status: 'success',
        amountKobo: 0n,
        currency: 'NGN',
        reference,
        raw: { mock: true, reference },
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
