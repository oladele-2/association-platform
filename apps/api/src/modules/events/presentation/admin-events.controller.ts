import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { AccessJwtGuard } from '../../identity/presentation/access-jwt.guard';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { PermissionsGuard } from '../../rbac/presentation/permissions.guard';
import { RequirePermissions } from '../../rbac/presentation/require-permissions.decorator';
import {
  CancelEventUseCase,
  CreateEventUseCase,
  DeleteEventUseCase,
  GetEventUseCase,
  ListEventsUseCase,
  PublishEventUseCase,
  ReplaceEventSpeakersUseCase,
  UpdateEventUseCase,
} from '../application/event.use-cases';
import { CreateEventDto, ReplaceSpeakersDto, UpdateEventDto } from './event.dto';

class AdminEventsQueryDto {
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

@ApiTags('admin-events')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard, PermissionsGuard)
@UseFilters(DomainErrorFilter)
@Controller('admin/events')
export class AdminEventsController {
  constructor(
    private readonly listEvents: ListEventsUseCase,
    private readonly getEvent: GetEventUseCase,
    private readonly createEvent: CreateEventUseCase,
    private readonly updateEvent: UpdateEventUseCase,
    private readonly deleteEvent: DeleteEventUseCase,
    private readonly publishEvent: PublishEventUseCase,
    private readonly cancelEvent: CancelEventUseCase,
    private readonly replaceSpeakers: ReplaceEventSpeakersUseCase,
  ) {}

  @Get()
  @RequirePermissions('events.read')
  list(@CurrentTenant() tenant: TenantContext, @Query() query: AdminEventsQueryDto) {
    return this.listEvents.execute({
      organizationId: tenant.organizationId,
      page: query.page,
      limit: query.limit,
    });
  }

  @Post()
  @RequirePermissions('events.manage')
  create(@CurrentTenant() tenant: TenantContext, @Body() body: CreateEventDto) {
    return this.createEvent.execute({
      organizationId: tenant.organizationId,
      ...body,
    });
  }

  @Get(':id')
  @RequirePermissions('events.read')
  get(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.getEvent.byId(tenant.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('events.manage')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateEventDto,
  ) {
    return this.updateEvent.execute({
      organizationId: tenant.organizationId,
      id,
      ...body,
    });
  }

  @Delete(':id')
  @RequirePermissions('events.manage')
  remove(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.deleteEvent.execute(tenant.organizationId, id);
  }

  @Post(':id/publish')
  @RequirePermissions('events.manage')
  @ApiOperation({ summary: 'Publish event to public website' })
  publish(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.publishEvent.execute(tenant.organizationId, id);
  }

  @Post(':id/cancel')
  @RequirePermissions('events.manage')
  cancel(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.cancelEvent.execute(tenant.organizationId, id);
  }

  @Put(':id/speakers')
  @RequirePermissions('events.manage')
  @ApiOperation({ summary: 'Replace event speakers list' })
  speakers(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReplaceSpeakersDto,
  ) {
    return this.replaceSpeakers.execute(tenant.organizationId, id, body.speakers);
  }
}
