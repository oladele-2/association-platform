import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { ResolveTenantUseCase } from '../application/resolve-tenant.use-case';
import type { TenantContext } from '../domain/tenant-context';

export const TENANT_HEADER = 'x-organization-slug';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly resolveTenant: ResolveTenantUseCase) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { tenant?: TenantContext }>();
    const slugHeader = req.header(TENANT_HEADER);
    if (slugHeader) {
      req.tenant = await this.resolveTenant.bySlug(slugHeader);
      return true;
    }

    const host = req.hostname || req.header('host');
    if (!host) {
      throw new BadRequestException(
        `Tenant required: set Host for a verified domain or ${TENANT_HEADER}`,
      );
    }

    if (host === 'localhost' || host === '127.0.0.1') {
      throw new BadRequestException(
        `Local requests must include ${TENANT_HEADER} header with organization slug`,
      );
    }

    req.tenant = await this.resolveTenant.byHostname(host);
    return true;
  }
}
