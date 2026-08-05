import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { Request } from 'express';
import { TOKEN_SERVICE, type TokenService } from '../application/ports/token.service';
import type { TenantContext } from '../../tenancy/domain/tenant-context';

export type AuthenticatedRequestUser = {
  userId: string;
  organizationId: string;
  email: string;
};

/**
 * Verifies access JWT and, when TenantGuard already resolved a tenant,
 * fails closed if JWT org_id ≠ tenant organization (cross-tenant write guard).
 */
@Injectable()
export class AccessJwtGuard implements CanActivate {
  constructor(@Inject(TOKEN_SERVICE) private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { authUser?: AuthenticatedRequestUser; tenant?: TenantContext }>();
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing access token');
    }
    const token = header.slice('Bearer '.length).trim();
    try {
      const claims = await this.tokens.verifyAccessToken(token);
      if (req.tenant && req.tenant.organizationId !== claims.orgId) {
        throw new ForbiddenException('Access token organization does not match tenant');
      }
      req.authUser = {
        userId: claims.sub,
        organizationId: claims.orgId,
        email: claims.email,
      };
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
