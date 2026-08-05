import { Body, Controller, Get, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsEmail,
  IsISO8601,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import {
  GetPublicRegistrationCatalogUseCase,
  SubmitPublicRegistrationUseCase,
} from '../application/public-registration.use-cases';
import type { Sex } from '../domain/member.rules';

class PublicRegistrationDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  middleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other', 'unspecified'])
  sex?: Sex;

  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;

  @IsOptional()
  @IsUUID()
  membershipTypeId?: string;

  @IsOptional()
  @IsUUID()
  primaryInstitutionId?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  /** Honeypot — must stay empty. */
  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  companyUrl?: string;

  @ValidateIf(() => false)
  fax?: string;
}

@ApiTags('public-registration')
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard)
@UseFilters(DomainErrorFilter)
@Controller('public/registration')
export class PublicRegistrationController {
  constructor(
    private readonly catalog: GetPublicRegistrationCatalogUseCase,
    private readonly submit: SubmitPublicRegistrationUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Registration form catalog (types, institutions, public fields)' })
  getCatalog(@CurrentTenant() tenant: TenantContext) {
    return this.catalog.execute(tenant.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Self-register as a member (creates login + active membership)' })
  register(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: PublicRegistrationDto,
    @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const clientKey =
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
      req.ip ||
      'unknown';
    return this.submit.execute({
      organizationId: tenant.organizationId,
      clientKey,
      honeypot: {
        website: body.website,
        companyUrl: body.companyUrl,
        fax: body.fax,
      },
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName,
      title: body.title,
      phone: body.phone,
      sex: body.sex,
      dateOfBirth: body.dateOfBirth,
      membershipTypeId: body.membershipTypeId,
      primaryInstitutionId: body.primaryInstitutionId,
      customFields: body.customFields,
    });
  }
}
