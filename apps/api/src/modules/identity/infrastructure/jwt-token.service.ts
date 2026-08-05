import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AppEnv } from '../../../config/env.validation';
import type { AccessTokenClaims, TokenService } from '../application/ports/token.service';

type JwtPayload = {
  sub: string;
  org_id: string;
  email: string;
  typ: 'access';
};

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async signAccessToken(
    claims: AccessTokenClaims,
  ): Promise<{ token: string; expiresInSeconds: number }> {
    const expiresInSeconds = this.config.get('JWT_ACCESS_TTL_SECONDS', {
      infer: true,
    });
    const token = await this.jwt.signAsync(
      {
        sub: claims.sub,
        org_id: claims.orgId,
        email: claims.email,
        typ: 'access',
      } satisfies JwtPayload,
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: expiresInSeconds,
      },
    );
    return { token, expiresInSeconds };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
    if (payload.typ !== 'access') {
      throw new Error('Invalid token type');
    }
    return {
      sub: payload.sub,
      orgId: payload.org_id,
      email: payload.email,
    };
  }
}
