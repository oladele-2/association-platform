import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Query,
  Req,
  UseFilters,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { ResolvePublicTenantUseCase } from '../application/resolve-public-tenant.use-case';
import { TENANT_HEADER } from './tenant.guard';

@ApiTags('tenancy')
@ApiHeader({
  name: TENANT_HEADER,
  required: false,
  description: 'Organization slug (preferred on localhost)',
})
@Controller('tenancy')
@UseFilters(DomainErrorFilter)
export class TenancyController {
  constructor(private readonly resolvePublic: ResolvePublicTenantUseCase) {}

  @Get('resolve')
  @ApiOperation({
    summary: 'Resolve tenant from X-Organization-Slug or Host; returns branding + feature flags',
  })
  async resolve(
    @Req() req: Request,
    @Headers(TENANT_HEADER) slugHeader?: string,
    @Query('slug') slugQuery?: string,
  ) {
    const slug = slugHeader ?? slugQuery;
    if (slug) {
      return this.resolvePublic.bySlug(slug);
    }

    const host = req.hostname || req.header('host');
    if (!host || host === 'localhost' || host === '127.0.0.1') {
      throw new BadRequestException(`Provide ${TENANT_HEADER} or ?slug= for local resolution`);
    }
    return this.resolvePublic.byHostname(host);
  }
}
