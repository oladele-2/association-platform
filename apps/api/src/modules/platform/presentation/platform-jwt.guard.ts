import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  PLATFORM_TOKEN_SERVICE,
  type PlatformTokenService,
} from '../application/ports/platform-token.service';

export type PlatformAuthUser = {
  userId: string;
  email: string;
  roles: string[];
};

@Injectable()
export class PlatformJwtGuard implements CanActivate {
  constructor(@Inject(PLATFORM_TOKEN_SERVICE) private readonly tokens: PlatformTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { platformUser?: PlatformAuthUser }>();
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing platform access token');
    }
    try {
      const claims = await this.tokens.verify(header.slice('Bearer '.length).trim());
      req.platformUser = {
        userId: claims.sub,
        email: claims.email,
        roles: claims.roles,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid platform access token');
    }
  }
}
