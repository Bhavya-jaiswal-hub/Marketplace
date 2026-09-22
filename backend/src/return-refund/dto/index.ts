import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReturnRequestStatus, RefundStatus } from '@prisma/client';

export class CreateReturnRequestDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  returnQuantity: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  customerComments?: string;
}

export class ApproveReturnRequestDto {
  @IsString()
  @IsOptional()
  pickupCarrier?: string;

  @IsString()
  @IsOptional()
  pickupTrackingNumber?: string;

  @IsString()
  @IsOptional()
  pickupScheduledAt?: string;

  @IsString()
  @IsOptional()
  adminRemarks?: string;
}

export class RejectReturnRequestDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;

  @IsString()
  @IsOptional()
  adminRemarks?: string;
}

export class CompleteReturnRequestDto {
  @IsBoolean()
  @IsOptional()
  restockInventory?: boolean = true;

  @IsString()
  @IsOptional()
  adminRemarks?: string;
}

export class ProcessRefundDto {
  @IsString()
  @IsNotEmpty()
  providerRefundId: string;

  @IsString()
  @IsOptional()
  payoutNotes?: string;

  @IsOptional()
  rawResponse?: any;
}

export class ReturnQueryDto {
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
  @IsEnum(ReturnRequestStatus)
  status?: ReturnRequestStatus;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;
}

export class RefundQueryDto {
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
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @IsOptional()
  @IsString()
  orderId?: string;
}
