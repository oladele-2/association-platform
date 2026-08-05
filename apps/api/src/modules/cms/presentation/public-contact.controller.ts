import { Body, Controller, Post, UseFilters, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { SubmitPublicContactUseCase } from '../application/content.use-cases';

class PublicContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}

@ApiTags('public-cms')
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard)
@UseFilters(DomainErrorFilter)
@Controller('public/contact')
export class PublicContactController {
  constructor(private readonly submitContact: SubmitPublicContactUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Submit a public website contact message' })
  execute(@CurrentTenant() tenant: TenantContext, @Body() body: PublicContactDto) {
    return this.submitContact.execute({
      organizationId: tenant.organizationId,
      name: body.name,
      email: body.email,
      subject: body.subject,
      body: body.body,
    });
  }
}
