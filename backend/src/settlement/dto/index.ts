import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SettlementBatchStatus, SettlementPayoutMethod } from '@prisma/client';

export class PreviewSettlementDto {
  @IsString()
  @IsOptional()
  sellerId?: string;

  @IsString()
  @IsOptional()
  periodFrom?: string;

  @IsString()
  @IsOptional()
  periodTo?: string;
}

export class CreateSettlementDto {
  @IsString()
  @IsOptional()
  sellerId?: string;

  @IsString()
  @IsOptional()
  periodFrom?: string;

  @IsString()
  @IsOptional()
  periodTo?: string;
}

export class RunSettlementDto {
  @IsString()
  @IsOptional()
  sellerId?: string;

  @IsString()
  @IsOptional()
  periodFrom?: string;

  @IsString()
  @IsOptional()
  periodTo?: string;
}

export class ProcessPayoutDto {
  @IsEnum(SettlementPayoutMethod)
  @IsOptional()
  payoutMethod?: SettlementPayoutMethod = SettlementPayoutMethod.BANK_TRANSFER;

  @IsString()
  @IsOptional()
  payoutReference?: string;

  @IsString()
  @IsOptional()
  bankTransactionReference?: string;

  @IsString()
  @IsOptional()
  payoutNotes?: string;
}

export class ConfirmPayoutDto {
  @IsString()
  @IsOptional()
  bankTransactionReference?: string;

  @IsString()
  @IsOptional()
  payoutReference?: string;

  @IsEnum(SettlementPayoutMethod)
  @IsOptional()
  payoutMethod?: SettlementPayoutMethod = SettlementPayoutMethod.BANK_TRANSFER;

  @IsString()
  @IsOptional()
  payoutNotes?: string;
}

export class RetryPayoutDto {
  @IsEnum(SettlementPayoutMethod)
  @IsOptional()
  payoutMethod?: SettlementPayoutMethod = SettlementPayoutMethod.BANK_TRANSFER;

  @IsString()
  @IsOptional()
  payoutReference?: string;

  @IsString()
  @IsOptional()
  bankTransactionReference?: string;

  @IsString()
  @IsOptional()
  payoutNotes?: string;
}

export class WriteOffAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class SettlementQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(SettlementBatchStatus)
  status?: SettlementBatchStatus;

  @IsOptional()
  @IsString()
  sellerId?: string;
}
