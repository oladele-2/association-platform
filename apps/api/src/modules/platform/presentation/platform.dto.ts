import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlatformLoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;
}

export class BootstrapPlatformDto {
  @ApiProperty({ description: 'Must match PLATFORM_BOOTSTRAP_SECRET' })
  @IsString()
  @MinLength(1)
  bootstrapSecret!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  password!: string;
}

export enum OrgTypeDto {
  professional_association = 'professional_association',
  alumni = 'alumni',
  ngo = 'ngo',
  society = 'society',
  other = 'other',
}

export class ProvisionOrganizationDto {
  @ApiProperty({ example: 'demo-association' })
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  legalName!: string;

  @ApiProperty()
  @IsString()
  displayName!: string;

  @ApiProperty({ enum: OrgTypeDto })
  @IsEnum(OrgTypeDto)
  orgType!: OrgTypeDto;

  @ApiPropertyOptional({ default: 'NG' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ default: 'Africa/Lagos' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ default: 'NGN' })
  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @ApiPropertyOptional({ default: 'starter' })
  @IsOptional()
  @IsString()
  planCode?: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  trialDays?: number;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @ApiPropertyOptional({ enum: ['provisioning', 'active', 'suspended'] })
  @IsOptional()
  @IsString()
  status?: 'provisioning' | 'active' | 'suspended';
}

export enum DomainPurposeDto {
  web = 'web',
  portal = 'portal',
  api = 'api',
}

export class AddDomainDto {
  @ApiProperty({ example: 'www.example.org' })
  @IsString()
  hostname!: string;

  @ApiProperty({ enum: DomainPurposeDto })
  @IsEnum(DomainPurposeDto)
  purpose!: DomainPurposeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class VerifyDomainDto {
  @ApiPropertyOptional({ description: 'Omit when force=true (platform operator)' })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({ description: 'Platform operator force-verify' })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class UpsertFeatureDto {
  @ApiProperty({ example: 'cme' })
  @IsString()
  featureKey!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpsertBrandingDto {
  @ApiPropertyOptional({ example: '#0B3D91' })
  @IsOptional()
  @IsString()
  primaryColor?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondaryColor?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailFromName?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsEmail()
  emailFromAddress?: string | null;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, unknown>;
}
