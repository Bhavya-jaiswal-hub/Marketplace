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
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReturnRequestStatus, RefundStatus } from '@prisma/client';

export class CreateReturnRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  returnQuantity?: number = 1;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  reasonCategory?: string;

  @IsString()
  @IsOptional()
  faultClassification?: 'SELLER_FAULT' | 'CUSTOMER_FAULT';

  @IsString()
  @IsOptional()
  customerComments?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  photoUrls?: string[];
}

export class CustomerShipReturnDto {
  @IsString()
  @IsNotEmpty()
  courierName: string;

  @IsString()
  @IsNotEmpty()
  trackingNumber: string;
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

export class SellerRejectInspectionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  photoUrls?: string[];
}

export class AdminResolveDisputeDto {
  @IsString()
  @IsNotEmpty()
  resolution: 'OVERRULE_SELLER_APPROVE_REFUND' | 'UPHOLD_SELLER_REJECTION' | string;

  @IsString()
  @IsOptional()
  faultClassification?: 'SELLER_FAULT' | 'CUSTOMER_FAULT';

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  returnShippingDeduction?: number;

  @IsString()
  @IsOptional()
  adminNotes?: string;
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
  @IsOptional()
  providerRefundId?: string;

  @IsString()
  @IsOptional()
  faultClassification?: 'SELLER_FAULT' | 'CUSTOMER_FAULT';

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  returnShippingFee?: number;

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
