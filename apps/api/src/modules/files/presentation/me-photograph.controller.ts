import { Body, Controller, Post, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { AccessJwtGuard } from '../../identity/presentation/access-jwt.guard';
import { CurrentAuthUser } from '../../identity/presentation/current-auth-user.decorator';
import type { AuthenticatedRequestUser } from '../../identity/presentation/access-jwt.guard';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { ConfirmUploadUseCase, CreateUploadUrlUseCase } from '../application/file.use-cases';
import { ConfirmPhotographDto, CreateUploadUrlDto } from './file.dto';

@ApiTags('me-files')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard)
@UseFilters(DomainErrorFilter)
@Controller('me/photograph')
export class MePhotographController {
  constructor(
    private readonly createUploadUrl: CreateUploadUrlUseCase,
    private readonly confirmUpload: ConfirmUploadUseCase,
  ) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Signed upload URL for member photograph' })
  uploadUrl(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Body() body: CreateUploadUrlDto,
  ) {
    return this.createUploadUrl.execute({
      organizationId: tenant.organizationId,
      userId: auth.userId,
      originalFilename: body.originalFilename,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      visibility: 'private',
      purpose: 'member_photo',
    });
  }

  @Post('confirm')
  @ApiOperation({
    summary: 'Confirm photograph upload — then PATCH /me/profile with photographFileId',
  })
  confirm(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Body() body: ConfirmPhotographDto,
  ) {
    return this.confirmUpload.execute({
      organizationId: tenant.organizationId,
      userId: auth.userId,
      fileId: body.fileId,
      checksumSha256: body.checksumSha256,
    });
  }
}
