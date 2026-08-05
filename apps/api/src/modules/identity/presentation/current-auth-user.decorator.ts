import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequestUser } from './access-jwt.guard';

export const CurrentAuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedRequestUser => {
    const req = ctx.switchToHttp().getRequest<{ authUser: AuthenticatedRequestUser }>();
    return req.authUser;
  },
);
