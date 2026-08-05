import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { AccessJwtGuard } from '../../identity/presentation/access-jwt.guard';
import { CurrentAuthUser } from '../../identity/presentation/current-auth-user.decorator';
import type { AuthenticatedRequestUser } from '../../identity/presentation/access-jwt.guard';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import {
  ConfirmUploadUseCase,
  CreateUploadUrlUseCase,
  DeleteFileUseCase,
  GetDownloadUrlUseCase,
} from '../application/file.use-cases';
import { ConfirmUploadDto, CreateUploadUrlDto } from './file.dto';

@ApiTags('files')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard)
@UseFilters(DomainErrorFilter)
@Controller('files')
export class FilesController {
  constructor(
    private readonly createUploadUrl: CreateUploadUrlUseCase,
    private readonly confirmUpload: ConfirmUploadUseCase,
    private readonly getDownloadUrl: GetDownloadUrlUseCase,
    private readonly deleteFile: DeleteFileUseCase,
  ) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Create pending file + signed PUT URL' })
  uploadUrl(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Body() body: CreateUploadUrlDto,
  ) {
    return this.createUploadUrl.execute({
      organizationId: tenant.organizationId,
      userId: auth.userId,
      ...body,
    });
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm upload after client PUT to storage' })
  confirm(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ConfirmUploadDto,
  ) {
    return this.confirmUpload.execute({
      organizationId: tenant.organizationId,
      userId: auth.userId,
      fileId: id,
      checksumSha256: body.checksumSha256,
    });
  }

  @Get(':id/download-url')
  @ApiOperation({ summary: 'Signed GET (private) or CDN URL (public)' })
  download(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.getDownloadUrl.execute({
      organizationId: tenant.organizationId,
      fileId: id,
    });
  }

  @Delete(':id')
  softDelete(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.deleteFile.execute(tenant.organizationId, id);
  }
}
