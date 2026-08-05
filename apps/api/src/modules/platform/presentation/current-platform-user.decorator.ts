import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PlatformAuthUser } from './platform-jwt.guard';

export const CurrentPlatformUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PlatformAuthUser => {
    const req = ctx.switchToHttp().getRequest<{ platformUser: PlatformAuthUser }>();
    return req.platformUser;
  },
);
