export type IssuedOpaqueToken = {
  id: string;
  rawToken: string;
  expiresAt: Date;
};

export interface PasswordResetTokenRepository {
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

export const PASSWORD_RESET_TOKEN_REPOSITORY = Symbol('PASSWORD_RESET_TOKEN_REPOSITORY');
