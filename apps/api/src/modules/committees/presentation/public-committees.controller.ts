import { Controller, Get, Param, UseFilters, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { GetCommitteeUseCase, ListCommitteesUseCase } from '../application/committee.use-cases';

@ApiTags('public-committees')
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard)
@UseFilters(DomainErrorFilter)
@Controller('public/committees')
export class PublicCommitteesController {
  constructor(
    private readonly listCommittees: ListCommitteesUseCase,
    private readonly getCommittee: GetCommitteeUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List committees (public website)' })
  list(@CurrentTenant() tenant: TenantContext) {
    return this.listCommittees.execute(tenant.organizationId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Committee detail including members' })
  bySlug(@CurrentTenant() tenant: TenantContext, @Param('slug') slug: string) {
    return this.getCommittee.bySlug(tenant.organizationId, slug.toLowerCase());
  }
}
