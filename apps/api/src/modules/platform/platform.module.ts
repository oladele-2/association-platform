import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RbacModule } from '../rbac/rbac.module';
import { PLATFORM_USER_REPOSITORY } from './application/ports/platform-user.repository';
import { ORGANIZATION_ADMIN_REPOSITORY } from './application/ports/organization-admin.repository';
import { PLATFORM_TOKEN_SERVICE } from './application/ports/platform-token.service';
import { PlatformLoginUseCase } from './application/platform-login.use-case';
import { BootstrapPlatformUseCase } from './application/bootstrap-platform.use-case';
import { ProvisionOrganizationUseCase } from './application/provision-organization.use-case';
import {
  ActivateOrganizationUseCase,
  GetOrganizationUseCase,
  ListOrganizationsUseCase,
  UpdateOrganizationUseCase,
} from './application/organization-lifecycle.use-case';
import {
  AddOrganizationDomainUseCase,
  ListOrganizationDomainsUseCase,
  VerifyOrganizationDomainUseCase,
} from './application/organization-domain.use-case';
import {
  GetOrganizationBrandingUseCase,
  ListOrganizationFeaturesUseCase,
  UpsertOrganizationBrandingUseCase,
  UpsertOrganizationFeatureUseCase,
} from './application/organization-features-branding.use-case';
import { PrismaPlatformUserRepository } from './infrastructure/prisma-platform-user.repository';
import { PrismaOrganizationAdminRepository } from './infrastructure/prisma-organization-admin.repository';
import { JwtPlatformTokenService } from './infrastructure/jwt-platform-token.service';
import { PlatformAuthController } from './presentation/platform-auth.controller';
import { PlatformOrganizationsController } from './presentation/platform-organizations.controller';
import { PlatformJwtGuard } from './presentation/platform-jwt.guard';

@Module({
  imports: [IdentityModule, TenancyModule, RbacModule, JwtModule.register({})],
  controllers: [PlatformAuthController, PlatformOrganizationsController],
  providers: [
    PlatformLoginUseCase,
    BootstrapPlatformUseCase,
    ProvisionOrganizationUseCase,
    ListOrganizationsUseCase,
    GetOrganizationUseCase,
    UpdateOrganizationUseCase,
    ActivateOrganizationUseCase,
    AddOrganizationDomainUseCase,
    ListOrganizationDomainsUseCase,
    VerifyOrganizationDomainUseCase,
    UpsertOrganizationFeatureUseCase,
    ListOrganizationFeaturesUseCase,
    UpsertOrganizationBrandingUseCase,
    GetOrganizationBrandingUseCase,
    PlatformJwtGuard,
    { provide: PLATFORM_USER_REPOSITORY, useClass: PrismaPlatformUserRepository },
    {
      provide: ORGANIZATION_ADMIN_REPOSITORY,
      useClass: PrismaOrganizationAdminRepository,
    },
    { provide: PLATFORM_TOKEN_SERVICE, useClass: JwtPlatformTokenService },
  ],
  exports: [PlatformJwtGuard, ORGANIZATION_ADMIN_REPOSITORY],
})
export class PlatformModule {}
