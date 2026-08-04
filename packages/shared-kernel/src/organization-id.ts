import { DomainError } from './domain-error';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Strongly typed organization identifier used across bounded contexts.
 * Keeps tenancy explicit in the domain without importing Nest or Prisma.
 */
export class OrganizationId {
  private constructor(private readonly value: string) {}

  static from(raw: string): OrganizationId {
    const trimmed = raw.trim();
    if (!UUID_RE.test(trimmed)) {
      throw new DomainError('INVALID_ORGANIZATION_ID', 'Organization id must be a UUID');
    }
    return new OrganizationId(trimmed.toLowerCase());
  }

  static tryFrom(raw: string): OrganizationId | null {
    try {
      return OrganizationId.from(raw);
    } catch {
      return null;
    }
  }

  equals(other: OrganizationId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
