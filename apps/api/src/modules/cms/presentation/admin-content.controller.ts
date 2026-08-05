import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { AccessJwtGuard } from '../../identity/presentation/access-jwt.guard';
import { CurrentAuthUser } from '../../identity/presentation/current-auth-user.decorator';
import type { AuthenticatedRequestUser } from '../../identity/presentation/access-jwt.guard';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { PermissionsGuard } from '../../rbac/presentation/permissions.guard';
import { RequirePermissions } from '../../rbac/presentation/require-permissions.decorator';
import {
  CreateContentUseCase,
  DeleteContentUseCase,
  GetContentUseCase,
  ListContentUseCase,
  PublishContentUseCase,
  UnpublishContentUseCase,
  UpdateContentUseCase,
} from '../application/content.use-cases';
import { ContentTypeDto, CreateContentDto, UpdateContentDto } from './content.dto';
import type { ContentStatus } from '../domain/content.rules';

class AdminContentQueryDto {
  @IsOptional()
  @IsEnum(ContentTypeDto)
  type?: ContentTypeDto;

  @IsOptional()
  @IsIn(['draft', 'scheduled', 'published', 'archived'])
  status?: ContentStatus;

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

@ApiTags('admin-cms')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard, PermissionsGuard)
@UseFilters(DomainErrorFilter)
@Controller('admin/content')
export class AdminContentController {
  constructor(
    private readonly listContent: ListContentUseCase,
    private readonly getContent: GetContentUseCase,
    private readonly createContent: CreateContentUseCase,
    private readonly updateContent: UpdateContentUseCase,
    private readonly deleteContent: DeleteContentUseCase,
    private readonly publishContent: PublishContentUseCase,
    private readonly unpublishContent: UnpublishContentUseCase,
  ) {}

  @Get()
  @RequirePermissions('cms.read')
  @ApiOperation({
    summary: 'List CMS content (pages, news, downloads, gallery, executives, …)',
  })
  list(@CurrentTenant() tenant: TenantContext, @Query() query: AdminContentQueryDto) {
    return this.listContent.execute({
      organizationId: tenant.organizationId,
      type: query.type,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
  }

  @Post()
  @RequirePermissions('cms.publish')
  @ApiOperation({ summary: 'Create content draft' })
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Body() body: CreateContentDto,
  ) {
    return this.createContent.execute({
      organizationId: tenant.organizationId,
      authorUserId: auth.userId,
      ...body,
    });
  }

  @Get(':id')
  @RequirePermissions('cms.read')
  get(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.getContent.byId(tenant.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('cms.publish')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateContentDto,
  ) {
    return this.updateContent.execute({
      organizationId: tenant.organizationId,
      id,
      ...body,
    });
  }

  @Delete(':id')
  @RequirePermissions('cms.publish')
  remove(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.deleteContent.execute(tenant.organizationId, id);
  }

  @Post(':id/publish')
  @RequirePermissions('cms.publish')
  @ApiOperation({ summary: 'Publish content to the public website' })
  publish(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.publishContent.execute(tenant.organizationId, id);
  }

  @Post(':id/unpublish')
  @RequirePermissions('cms.publish')
  unpublish(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.unpublishContent.execute(tenant.organizationId, id);
  }
}
