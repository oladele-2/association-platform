export type IssuedOpaqueToken = {
  id: string;
  rawToken: string;
  expiresAt: Date;
};

export interface EmailVerificationTokenRepository {
  issue(input: {
    organizationId: string;
    userId: string;
    expiresAt: Date;
  }): Promise<IssuedOpaqueToken>;

  consume(
    rawToken: string,
    at: Date,
  ): Promise<{
    organizationId: string;
    userId: string;
  } | null>;
}

export const EMAIL_VERIFICATION_TOKEN_REPOSITORY = Symbol('EMAIL_VERIFICATION_TOKEN_REPOSITORY');
