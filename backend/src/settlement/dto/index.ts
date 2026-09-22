import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SettlementStatus, SettlementPayoutMethod } from '@prisma/client';

export class PreviewSettlementDto {
  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @IsString()
  @IsNotEmpty()
  periodFrom: string;

  @IsString()
  @IsNotEmpty()
  periodTo: string;
}

export class CreateSettlementDto {
  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @IsString()
  @IsNotEmpty()
  periodFrom: string;

  @IsString()
  @IsNotEmpty()
  periodTo: string;
}

export class ProcessPayoutDto {
  @IsEnum(SettlementPayoutMethod)
  payoutMethod: SettlementPayoutMethod;

  @IsString()
  @IsNotEmpty()
  payoutReference: string;

  @IsString()
  @IsOptional()
  payoutNotes?: string;
}

export class RetryPayoutDto {
  @IsEnum(SettlementPayoutMethod)
  payoutMethod: SettlementPayoutMethod;

  @IsString()
  @IsNotEmpty()
  payoutReference: string;

  @IsString()
  @IsOptional()
  payoutNotes?: string;
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
  @IsEnum(SettlementStatus)
  status?: SettlementStatus;

  @IsOptional()
  @IsString()
  sellerId?: string;
}
