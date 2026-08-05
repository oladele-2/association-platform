export type IssuedRefreshToken = {
  id: string;
  familyId: string;
  rawToken: string;
  expiresAt: Date;
};

export type StoredRefreshToken = {
  id: string;
  organizationId: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
};

export interface RefreshTokenRepository {
  issue(input: {
    organizationId: string;
    userId: string;
    familyId: string;
    expiresAt: Date;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<IssuedRefreshToken>;

  findByRawToken(rawToken: string): Promise<StoredRefreshToken | null>;

  rotate(input: {
    current: StoredRefreshToken;
    expiresAt: Date;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<IssuedRefreshToken>;

  /** Revoke all tokens in a family (refresh-token reuse detection). */
  revokeFamily(organizationId: string, familyId: string, at: Date): Promise<void>;

  revokeByRawToken(rawToken: string, at: Date): Promise<boolean>;

  revokeAllForUser(organizationId: string, userId: string, at: Date): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
