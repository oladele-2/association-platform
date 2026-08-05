import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ContentTypeDto {
  page = 'page',
  news = 'news',
  blog = 'blog',
  circular = 'circular',
  download = 'download',
  gallery_album = 'gallery_album',
  executive = 'executive',
  past_executive = 'past_executive',
}

export class CreateContentDto {
  @ApiProperty({ enum: ContentTypeDto })
  @IsEnum(ContentTypeDto)
  type!: ContentTypeDto;

  @ApiProperty({ example: 'about-us' })
  @IsString()
  @MinLength(1)
  slug!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyMarkdown?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  bodyJson?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  coverFileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ogImageFileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    type: Object,
    description: 'Type-specific fields (e.g. executive role_title, download url)',
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}

export class UpdateContentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyMarkdown?: string | null;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  bodyJson?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  excerpt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  coverFileId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ogImageFileId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
