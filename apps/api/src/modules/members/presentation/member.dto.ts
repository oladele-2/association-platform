import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

const MEMBER_STATUSES = ['draft', 'pending_approval', 'active', 'suspended', 'archived'] as const;

const SEX_VALUES = ['male', 'female', 'other', 'unspecified'] as const;

const FIELD_DATA_TYPES = ['text', 'number', 'date', 'boolean', 'select', 'url'] as const;

const FIELD_VISIBILITY = ['admin_only', 'admin_and_member', 'public'] as const;

export class CreateMembershipTypeDto {
  @ApiProperty({ example: 'STANDARD' })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateMembershipTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateMemberDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  membershipTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  membershipNo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  middleName?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiPropertyOptional({ enum: SEX_VALUES })
  @IsOptional()
  @IsIn(SEX_VALUES)
  sex?: (typeof SEX_VALUES)[number] | null;

  @ApiPropertyOptional({ example: '1980-01-15' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  alternateEmail?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  photographFileId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  primaryInstitutionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsString()
  joinedOn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateMemberDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  membershipTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  membershipNo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  middleName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ApiPropertyOptional({ enum: SEX_VALUES })
  @IsOptional()
  @IsIn([...SEX_VALUES, null])
  sex?: (typeof SEX_VALUES)[number] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateOfBirth?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  alternateEmail?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  photographFileId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  primaryInstitutionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  joinedOn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SetExemptionDto {
  @ApiProperty()
  @IsBoolean()
  duesExempt!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string | null;
}

export class UpdateMyProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  alternateEmail?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  photographFileId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateFieldDefinitionDto {
  @ApiProperty({ example: 'mdcn_number' })
  @IsString()
  @MinLength(1)
  key!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiProperty({ enum: FIELD_DATA_TYPES })
  @IsIn(FIELD_DATA_TYPES)
  dataType!: (typeof FIELD_DATA_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  options?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isUnique?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: FIELD_VISIBILITY })
  @IsOptional()
  @IsIn(FIELD_VISIBILITY)
  visibility?: (typeof FIELD_VISIBILITY)[number];
}

export class UpdateFieldDefinitionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  options?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isUnique?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: FIELD_VISIBILITY })
  @IsOptional()
  @IsIn(FIELD_VISIBILITY)
  visibility?: (typeof FIELD_VISIBILITY)[number];
}

export { MEMBER_STATUSES };
