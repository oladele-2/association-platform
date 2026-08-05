import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommitteeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'education-committee' })
  @IsString()
  @MinLength(1)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contentItemId?: string;
}

export class UpdateCommitteeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contentItemId?: string | null;
}

export class CommitteeMemberDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsString()
  startedOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endedOn?: string;
}

export class ReplaceCommitteeMembersDto {
  @ApiProperty({ type: [CommitteeMemberDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitteeMemberDto)
  members!: CommitteeMemberDto[];
}
