import { Module } from '@nestjs/common';
import { ORGANIZATION_LOOKUP } from './application/ports/organization-lookup';
import { ResolveTenantUseCase } from './application/resolve-tenant.use-case';
import { ResolvePublicTenantUseCase } from './application/resolve-public-tenant.use-case';
import { CachedPrismaOrganizationLookup } from './infrastructure/cached-prisma-organization.lookup';
import { TenantGuard } from './presentation/tenant.guard';
import { TenancyController } from './presentation/tenancy.controller';

@Module({
  controllers: [TenancyController],
  providers: [
    ResolveTenantUseCase,
    ResolvePublicTenantUseCase,
    TenantGuard,
    CachedPrismaOrganizationLookup,
    {
      provide: ORGANIZATION_LOOKUP,
      useExisting: CachedPrismaOrganizationLookup,
    },
  ],
  exports: [ResolveTenantUseCase, TenantGuard, ORGANIZATION_LOOKUP, CachedPrismaOrganizationLookup],
})
export class TenancyModule {}
