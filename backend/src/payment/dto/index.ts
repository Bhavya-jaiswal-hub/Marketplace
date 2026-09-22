import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentReference!: string;

  @IsString()
  @IsNotEmpty()
  razorpayPaymentId!: string;

  @IsString()
  @IsNotEmpty()
  razorpayOrderId!: string;

  @IsString()
  @IsNotEmpty()
  razorpaySignature!: string;
}

export class ReconcilePaymentDto {
  @IsString()
  @IsNotEmpty()
  notes!: string;
}
