import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantContext } from '../domain/tenant-context';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const req = ctx.switchToHttp().getRequest<{ tenant: TenantContext }>();
    return req.tenant;
  },
);
