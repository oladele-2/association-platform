export type PlatformAccessClaims = {
  sub: string;
  email: string;
  roles: string[];
};

export interface PlatformTokenService {
  sign(claims: PlatformAccessClaims): Promise<{ token: string; expiresInSeconds: number }>;
  verify(token: string): Promise<PlatformAccessClaims>;
}

export const PLATFORM_TOKEN_SERVICE = Symbol('PLATFORM_TOKEN_SERVICE');
