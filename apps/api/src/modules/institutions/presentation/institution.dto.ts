import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const OWNERSHIP = ['public', 'private'] as const;
const EMPLOYMENT = ['active', 'transferred', 'ended'] as const;

export class CreateInstitutionDto {
  @ApiPropertyOptional({ example: 'SHF-01' })
  @IsOptional()
  @IsString()
  code?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'hospital' })
  @IsString()
  @MinLength(2)
  institutionType!: string;

  @ApiPropertyOptional({ enum: OWNERSHIP })
  @IsOptional()
  @IsIn(OWNERSHIP)
  ownership?: (typeof OWNERSHIP)[number] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lga?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({
    description:
      'Whether the institution is affiliated with a partner/network body (tenant-agnostic)',
  })
  @IsOptional()
  @IsBoolean()
  isNetworkAffiliate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateInstitutionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  institutionType?: string;

  @ApiPropertyOptional({ enum: OWNERSHIP })
  @IsOptional()
  @IsIn([...OWNERSHIP, null])
  ownership?: (typeof OWNERSHIP)[number] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lga?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({
    description:
      'Whether the institution is affiliated with a partner/network body (tenant-agnostic)',
  })
  @IsOptional()
  @IsBoolean()
  isNetworkAffiliate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateInstitutionPortalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lga?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string | null;
}

export class AssignInstitutionAdminDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;
}

export class LinkInstitutionMemberDto {
  @ApiProperty()
  @IsUUID()
  memberId!: string;

  @ApiPropertyOptional({ enum: EMPLOYMENT })
  @IsOptional()
  @IsIn(EMPLOYMENT)
  employmentStatus?: (typeof EMPLOYMENT)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: '2020-01-01' })
  @IsOptional()
  @IsString()
  startedOn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endedOn?: string | null;
}

export class UpdateInstitutionMemberLinkDto {
  @ApiPropertyOptional({ enum: EMPLOYMENT })
  @IsOptional()
  @IsIn(EMPLOYMENT)
  employmentStatus?: (typeof EMPLOYMENT)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startedOn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endedOn?: string | null;
}
