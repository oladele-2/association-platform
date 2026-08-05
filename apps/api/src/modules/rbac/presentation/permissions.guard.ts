import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthorizationService } from '../application/rbac.use-cases';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator';
import type { AuthenticatedRequestUser } from '../../identity/presentation/access-jwt.guard';
import { DomainError } from '@association/shared-kernel';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authz: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const req = context
      .switchToHttp()
      .getRequest<Request & { authUser?: AuthenticatedRequestUser }>();
    const user = req.authUser;
    if (!user) {
      throw new ForbiddenException('Authentication required before permission check');
    }

    try {
      await this.authz.assertPermissions({
        organizationId: user.organizationId,
        userId: user.userId,
        permissionKeys: required,
      });
      return true;
    } catch (err) {
      if (err instanceof DomainError && err.code === 'FORBIDDEN') {
        throw new ForbiddenException(err.message);
      }
      throw err;
    }
  }
}
