import { DomainError } from '@association/shared-kernel';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HONEYPOT_KEYS = new Set(['website', 'companyUrl', 'fax']);

export function assertRegistrationEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized) || normalized.length > 254) {
    throw new DomainError('INVALID_EMAIL', 'A valid email is required');
  }
  return normalized;
}

export function assertRegistrationPassword(password: string): void {
  if (password.length < 10) {
    throw new DomainError('INVALID_PASSWORD', 'Password must be at least 10 characters');
  }
  if (password.length > 128) {
    throw new DomainError('INVALID_PASSWORD', 'Password is too long');
  }
}

export function assertHoneypotEmpty(payload: Record<string, unknown>): void {
  for (const key of HONEYPOT_KEYS) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      throw new DomainError('BOT_REJECTED', 'Registration rejected');
    }
  }
}

/** Simple sliding window: max N posts per key per windowMs. */
export class RegistrationRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxHits: number,
    private readonly windowMs: number,
  ) {}

  assertAllowed(key: string): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const prior = (this.hits.get(key) ?? []).filter((t) => t >= windowStart);
    if (prior.length >= this.maxHits) {
      throw new DomainError('RATE_LIMITED', 'Too many registration attempts. Try again later.');
    }
    prior.push(now);
    this.hits.set(key, prior);
  }
}
