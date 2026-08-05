import { Controller, Get, Param, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { DomainError } from '@association/shared-kernel';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { GetEventUseCase, ListEventsUseCase } from '../application/event.use-cases';

class PublicEventsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

@ApiTags('public-events')
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard)
@UseFilters(DomainErrorFilter)
@Controller('public/events')
export class PublicEventsController {
  constructor(
    private readonly listEvents: ListEventsUseCase,
    private readonly getEvent: GetEventUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List published events' })
  list(@CurrentTenant() tenant: TenantContext, @Query() query: PublicEventsQueryDto) {
    return this.listEvents.execute({
      organizationId: tenant.organizationId,
      publishedOnly: true,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get published event by slug' })
  async bySlug(@CurrentTenant() tenant: TenantContext, @Param('slug') slug: string) {
    const event = await this.getEvent.bySlug(tenant.organizationId, slug.toLowerCase());
    if (event.status !== 'published') {
      throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    }
    return event;
  }
}
