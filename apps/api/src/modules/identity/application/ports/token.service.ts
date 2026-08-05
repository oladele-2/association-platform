export type AccessTokenClaims = {
  sub: string;
  orgId: string;
  email: string;
};

export interface TokenService {
  signAccessToken(claims: AccessTokenClaims): Promise<{ token: string; expiresInSeconds: number }>;
  verifyAccessToken(token: string): Promise<AccessTokenClaims>;
}

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');
