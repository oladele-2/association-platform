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
import {
  PLATFORM_USER_REPOSITORY,
  type PlatformUserRepository,
} from '../application/ports/platform-user.repository';

export type PlatformAuthUser = {
  userId: string;
  email: string;
  roles: string[];
};

@Injectable()
export class PlatformJwtGuard implements CanActivate {
  constructor(
    @Inject(PLATFORM_TOKEN_SERVICE) private readonly tokens: PlatformTokenService,
    @Inject(PLATFORM_USER_REPOSITORY) private readonly users: PlatformUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { platformUser?: PlatformAuthUser }>();
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing platform access token');
    }
    try {
      const claims = await this.tokens.verify(header.slice('Bearer '.length).trim());
      const operator = await this.users.findById(claims.sub);
      if (!operator) {
        throw new UnauthorizedException('Invalid platform access token');
      }
      operator.assertCanLogin();
      req.platformUser = {
        userId: operator.id,
        email: operator.email,
        roles: [...operator.roleKeys],
      };
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid platform access token');
    }
  }
}
