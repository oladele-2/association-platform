import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const PURPOSES = [
  'member_photo',
  'payment_evidence',
  'receipt',
  'cms',
  'cme',
  'event',
  'branding',
  'other',
] as const;

const VISIBILITY = ['private', 'public'] as const;

export class CreateUploadUrlDto {
  @ApiProperty({ example: 'photo.jpg' })
  @IsString()
  @MinLength(1)
  originalFilename!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MinLength(3)
  mimeType!: string;

  @ApiProperty({ example: '204800', description: 'Declared size in bytes (integer string)' })
  @IsString()
  sizeBytes!: string;

  @ApiPropertyOptional({ enum: VISIBILITY, default: 'private' })
  @IsOptional()
  @IsIn(VISIBILITY)
  visibility?: (typeof VISIBILITY)[number];

  @ApiPropertyOptional({ enum: PURPOSES, default: 'other' })
  @IsOptional()
  @IsIn(PURPOSES)
  purpose?: (typeof PURPOSES)[number];
}

export class ConfirmUploadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checksumSha256?: string | null;
}

export class ConfirmPhotographDto {
  @ApiProperty()
  @IsUUID()
  fileId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checksumSha256?: string | null;
}
