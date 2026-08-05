import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkRemittanceLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  memberId?: string | null;

  @ApiPropertyOptional({ description: 'Membership number or external ref for matching' })
  @IsOptional()
  @IsString()
  memberExternalRef?: string | null;

  @ApiProperty({ example: '5000000' })
  @IsString()
  amountKobo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  invoiceId?: string | null;
}

export class CreateBulkRemittanceDto {
  @ApiProperty()
  @IsUUID()
  institutionId!: string;

  @ApiPropertyOptional({ example: '2026 Annual Dues' })
  @IsOptional()
  @IsString()
  periodLabel?: string | null;

  @ApiProperty({ type: [BulkRemittanceLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkRemittanceLineDto)
  lines!: BulkRemittanceLineDto[];
}

export class InitializeBulkPaystackDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  idempotencyKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  callbackUrl?: string;
}

export class RemittanceEvidenceDto {
  @ApiPropertyOptional({ example: '5000000' })
  @IsOptional()
  @IsString()
  amountKobo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narration?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fileId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transferReference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transferredAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string | null;
}

export class ResolveRemittanceLineDto {
  @ApiProperty({ enum: ['matched', 'unmatched', 'excluded'] })
  @IsIn(['matched', 'unmatched', 'excluded'])
  matchStatus!: 'matched' | 'unmatched' | 'excluded';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  memberId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  invoiceId?: string | null;
}
