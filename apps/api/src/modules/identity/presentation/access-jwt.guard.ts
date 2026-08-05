import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { TOKEN_SERVICE, type TokenService } from '../application/ports/token.service';
import { Inject } from '@nestjs/common';

export type AuthenticatedRequestUser = {
  userId: string;
  organizationId: string;
  email: string;
};

@Injectable()
export class AccessJwtGuard implements CanActivate {
  constructor(@Inject(TOKEN_SERVICE) private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { authUser?: AuthenticatedRequestUser }>();
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing access token');
    }
    const token = header.slice('Bearer '.length).trim();
    try {
      const claims = await this.tokens.verifyAccessToken(token);
      req.authUser = {
        userId: claims.sub,
        organizationId: claims.orgId,
        email: claims.email,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
