import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

const PERIOD_TYPES = ['annual', 'one_time', 'custom'] as const;
const OWNERSHIP = ['public', 'private'] as const;
const INVOICE_STATUSES = [
  'draft',
  'open',
  'partially_paid',
  'paid',
  'waived',
  'cancelled',
  'void',
] as const;
const PAYMENT_STATUSES = [
  'pending',
  'awaiting_verification',
  'succeeded',
  'failed',
  'rejected',
  'refunded',
] as const;

export class CreateFeeScheduleDto {
  @ApiProperty({ example: 'DUES-2026' })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: PERIOD_TYPES })
  @IsIn(PERIOD_TYPES)
  periodType!: (typeof PERIOD_TYPES)[number];

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodYear?: number | null;

  @ApiProperty({ example: 'NGN' })
  @IsString()
  @MinLength(3)
  currency!: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  startsOn?: string | null;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  endsOn?: string | null;
}

export class UpdateFeeScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodYear?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startsOn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endsOn?: string | null;
}

export class CreateFeeRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  membershipTypeId?: string | null;

  @ApiPropertyOptional({ enum: OWNERSHIP })
  @IsOptional()
  @IsIn(OWNERSHIP)
  institutionOwnership?: (typeof OWNERSHIP)[number] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minAge?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxAge?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOptionalExempt?: boolean;

  @ApiProperty({ example: '5000000', description: 'Amount in kobo as integer string' })
  @IsString()
  amountKobo!: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;
}

export class UpdateFeeRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  membershipTypeId?: string | null;

  @ApiPropertyOptional({ enum: OWNERSHIP })
  @IsOptional()
  @IsIn([...OWNERSHIP, null])
  institutionOwnership?: (typeof OWNERSHIP)[number] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minAge?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxAge?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOptionalExempt?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  amountKobo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;
}

export class WaiveInvoiceDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  reason!: string;
}

export class RejectPaymentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  reason!: string;
}

export class InitializePaystackDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  invoiceIds!: string[];

  @ApiProperty({ description: 'Client-generated idempotency key' })
  @IsString()
  @MinLength(8)
  idempotencyKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  callbackUrl?: string;
}

export class ManualPaymentDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  invoiceIds!: string[];

  @ApiProperty({ example: '5000000', description: 'Amount in kobo' })
  @IsString()
  amountKobo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narration?: string | null;

  @ApiPropertyOptional({ description: 'Requires Files milestone upload first' })
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

export { INVOICE_STATUSES, PAYMENT_STATUSES };
