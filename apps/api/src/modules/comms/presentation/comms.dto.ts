import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertEmailTemplateDto {
  @ApiProperty({ example: 'welcome' })
  @IsString()
  @MinLength(2)
  key!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  subject!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  bodyMarkdown!: string;
}

export class CreateEmailCampaignDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  subject!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  bodyMarkdown!: string;

  @ApiPropertyOptional({
    example: { allActiveMembers: true },
    description: 'Optional filters: membershipStatus, institutionId, membershipTypeId',
  })
  @IsOptional()
  @IsObject()
  audienceFilter?: Record<string, unknown>;
}
