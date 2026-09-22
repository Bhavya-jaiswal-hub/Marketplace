import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemStatus, OrderStatus, PaymentStatus } from '@prisma/client';

export class InitiateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  shippingAddressId!: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class CancelOrderDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  orderItemIds?: string[];

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class UpdateFulfillmentStatusDto {
  @IsEnum(OrderItemStatus)
  status!: OrderItemStatus;

  @IsString()
  @IsOptional()
  trackingCarrier?: string;

  @IsString()
  @IsOptional()
  trackingNumber?: string;
}

export class OrderQueryDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}
