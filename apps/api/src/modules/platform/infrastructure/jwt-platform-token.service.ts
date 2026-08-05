import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AppEnv } from '../../../config/env.validation';
import type {
  PlatformAccessClaims,
  PlatformTokenService,
} from '../application/ports/platform-token.service';

type PlatformJwtPayload = {
  sub: string;
  email: string;
  roles: string[];
  typ: 'platform_access';
};

@Injectable()
export class JwtPlatformTokenService implements PlatformTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async sign(claims: PlatformAccessClaims): Promise<{ token: string; expiresInSeconds: number }> {
    const expiresInSeconds = this.config.get('JWT_ACCESS_TTL_SECONDS', {
      infer: true,
    });
    const token = await this.jwt.signAsync(
      {
        sub: claims.sub,
        email: claims.email,
        roles: claims.roles,
        typ: 'platform_access',
      } satisfies PlatformJwtPayload,
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: expiresInSeconds,
      },
    );
    return { token, expiresInSeconds };
  }

  async verify(token: string): Promise<PlatformAccessClaims> {
    const payload = await this.jwt.verifyAsync<PlatformJwtPayload>(token, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
    if (payload.typ !== 'platform_access') {
      throw new Error('Invalid platform token type');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles ?? [],
    };
  }
}
