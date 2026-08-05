/** Domain verification helpers (API uses verifiedAt ISO, never isVerified). */

export type DomainView = {
  id: string;
  hostname: string;
  purpose?: string;
  isPrimary?: boolean;
  verifiedAt?: string | null;
  verificationToken?: string | null;
  /** Legacy / mistaken client field — treated as unverified unless verifiedAt set. */
  isVerified?: boolean;
};

export function isDomainVerified(domain: DomainView): boolean {
  return Boolean(domain.verifiedAt);
}

export function mapDomainFromApi(raw: Record<string, unknown>): DomainView {
  return {
    id: String(raw.id ?? ''),
    hostname: String(raw.hostname ?? ''),
    purpose: typeof raw.purpose === 'string' ? raw.purpose : undefined,
    isPrimary: Boolean(raw.isPrimary),
    verifiedAt: typeof raw.verifiedAt === 'string' ? raw.verifiedAt : null,
    verificationToken: typeof raw.verificationToken === 'string' ? raw.verificationToken : null,
  };
}
