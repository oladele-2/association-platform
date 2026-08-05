import { Module, OnModuleInit } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RBAC_REPOSITORY } from './application/ports/rbac.repository';
import {
  SeedOrganizationRolesUseCase,
  SeedPermissionCatalogUseCase,
} from './application/seed-rbac.use-case';
import {
  AssignUserRoleUseCase,
  AuthorizationService,
  CreateRoleUseCase,
  DeleteRoleUseCase,
  ListPermissionsUseCase,
  ListRolesUseCase,
  ListUserRolesUseCase,
  RenameRoleUseCase,
  RevokeUserRoleUseCase,
  UpdateRolePermissionsUseCase,
} from './application/rbac.use-cases';
import { PrismaRbacRepository } from './infrastructure/prisma-rbac.repository';
import { RbacAdminController } from './presentation/rbac-admin.controller';
import { PermissionsGuard } from './presentation/permissions.guard';

@Module({
  imports: [IdentityModule, TenancyModule],
  controllers: [RbacAdminController],
  providers: [
    { provide: RBAC_REPOSITORY, useClass: PrismaRbacRepository },
    SeedPermissionCatalogUseCase,
    SeedOrganizationRolesUseCase,
    AuthorizationService,
    ListPermissionsUseCase,
    ListRolesUseCase,
    CreateRoleUseCase,
    UpdateRolePermissionsUseCase,
    RenameRoleUseCase,
    DeleteRoleUseCase,
    ListUserRolesUseCase,
    AssignUserRoleUseCase,
    RevokeUserRoleUseCase,
    PermissionsGuard,
  ],
  exports: [
    AuthorizationService,
    PermissionsGuard,
    SeedOrganizationRolesUseCase,
    SeedPermissionCatalogUseCase,
    RBAC_REPOSITORY,
  ],
})
export class RbacModule implements OnModuleInit {
  constructor(private readonly seedCatalog: SeedPermissionCatalogUseCase) {}

  async onModuleInit(): Promise<void> {
    await this.seedCatalog.execute();
  }
}
