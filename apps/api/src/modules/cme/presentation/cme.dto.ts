import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class SubmitCmeDto {
  @ApiProperty()
  @IsUUID()
  fileId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string | null;

  @ApiPropertyOptional({ example: '5.00' })
  @IsOptional()
  @IsString()
  creditHours?: string | null;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsString()
  completedOn?: string | null;
}

export class RejectCmeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  reason!: string;
}
