import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';

/** Require all listed permission keys (AND). Use with PermissionsGuard + AccessJwtGuard. */
export const RequirePermissions = (...keys: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, keys);
