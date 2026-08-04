import { DomainError } from './domain-error';

/**
 * Exact monetary amount in minor units (e.g. kobo for NGN).
 * Never use floating point for money.
 */
export class Money {
  private constructor(
    private readonly amountMinor: bigint,
    private readonly currencyCode: string,
  ) {}

  static of(amountMinor: bigint | number, currency: string): Money {
    const code = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) {
      throw new DomainError('INVALID_CURRENCY', 'Currency must be a 3-letter code');
    }
    const minor = typeof amountMinor === 'number' ? BigInt(amountMinor) : amountMinor;
    if (minor < 0n) {
      throw new DomainError('INVALID_MONEY', 'Amount cannot be negative');
    }
    return new Money(minor, code);
  }

  static zero(currency: string): Money {
    return Money.of(0n, currency);
  }

  get currency(): string {
    return this.currencyCode;
  }

  get amountKobo(): bigint {
    return this.amountMinor;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor + other.amountMinor, this.currencyCode);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (other.amountMinor > this.amountMinor) {
      throw new DomainError('INVALID_MONEY', 'Insufficient amount for subtraction');
    }
    return new Money(this.amountMinor - other.amountMinor, this.currencyCode);
  }

  equals(other: Money): boolean {
    return this.amountMinor === other.amountMinor && this.currencyCode === other.currencyCode;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currencyCode !== other.currencyCode) {
      throw new DomainError('CURRENCY_MISMATCH', 'Cannot operate on different currencies');
    }
  }
}
