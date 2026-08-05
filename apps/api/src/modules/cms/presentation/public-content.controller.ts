import { Controller, Get, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { DomainError } from '@association/shared-kernel';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { GetContentUseCase, ListContentUseCase } from '../application/content.use-cases';
import { ContentTypeDto } from './content.dto';

class PublicContentQueryDto {
  @IsOptional()
  @IsEnum(ContentTypeDto)
  type?: ContentTypeDto;

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

class PublicContentBySlugQueryDto {
  @IsEnum(ContentTypeDto)
  type!: ContentTypeDto;

  @IsString()
  @MinLength(1)
  slug!: string;
}

@ApiTags('public-cms')
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard)
@UseFilters(DomainErrorFilter)
@Controller('public/content')
export class PublicContentController {
  constructor(
    private readonly listContent: ListContentUseCase,
    private readonly getContent: GetContentUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List published CMS content for the public website' })
  list(@CurrentTenant() tenant: TenantContext, @Query() query: PublicContentQueryDto) {
    return this.listContent.execute({
      organizationId: tenant.organizationId,
      type: query.type,
      page: query.page,
      limit: query.limit,
      publishedOnly: true,
    });
  }

  @Get('by-slug')
  @ApiOperation({ summary: 'Get a published content item by type + slug' })
  async bySlug(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: PublicContentBySlugQueryDto,
  ) {
    const item = await this.getContent.bySlug(
      tenant.organizationId,
      query.type,
      query.slug.toLowerCase(),
    );
    if (item.status !== 'published') {
      throw new DomainError('CONTENT_NOT_FOUND', 'Content not found');
    }
    return item;
  }
}
