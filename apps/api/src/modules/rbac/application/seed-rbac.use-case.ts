import { Inject, Injectable } from '@nestjs/common';
import { PERMISSION_CATALOG } from '../domain/permission-catalog';
import { resolveTemplatePermissionKeys, SYSTEM_ROLE_TEMPLATES } from '../domain/role-templates';
import { RBAC_REPOSITORY, type RbacRepository } from './ports/rbac.repository';

@Injectable()
export class SeedPermissionCatalogUseCase {
  constructor(@Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository) {}

  execute() {
    return this.rbac.ensurePermissionCatalog([...PERMISSION_CATALOG]);
  }
}

@Injectable()
export class SeedOrganizationRolesUseCase {
  constructor(@Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository) {}

  async execute(organizationId: string) {
    await this.rbac.ensurePermissionCatalog([...PERMISSION_CATALOG]);
    return this.rbac.seedSystemRoles(
      organizationId,
      SYSTEM_ROLE_TEMPLATES.map((t) => ({
        key: t.key,
        name: t.name,
        permissionKeys: resolveTemplatePermissionKeys(t),
      })),
    );
  }
}
