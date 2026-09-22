import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AddressType,
  DocumentType,
  SellerStatus,
  SellerType,
} from '@prisma/client';

export class CreateSellerProfileDto {
  @IsEnum(SellerType)
  sellerType: SellerType = SellerType.INDIVIDUAL;

  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsOptional()
  businessDescription?: string;

  @IsEmail()
  @IsNotEmpty()
  contactEmail!: string;

  @IsString()
  @IsOptional()
  contactMobile?: string;
}

export class UpdateSellerProfileDto {
  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  businessDescription?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactMobile?: string;

  @IsObject()
  @IsOptional()
  payoutDetails?: {
    accountHolderName?: string;
    bankAccountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    accountType?: string;
    upiId?: string;
  };
}

export class CreateSellerAddressDto {
  @IsEnum(AddressType)
  addressType: AddressType = AddressType.BUSINESS;

  @IsString()
  @IsNotEmpty()
  addressLine1!: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @IsString()
  @IsOptional()
  country?: string = 'IN';

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean = false;
}

export class UpdateSellerAddressDto {
  @IsEnum(AddressType)
  @IsOptional()
  addressType?: AddressType;

  @IsString()
  @IsOptional()
  addressLine1?: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class SubmitDocumentDto {
  @IsEnum(DocumentType)
  @IsNotEmpty()
  documentType!: DocumentType;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsString()
  @IsNotEmpty()
  fileBase64!: string;
}

export class ApproveSellerDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectSellerDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason!: string;
}

export class UpdateSellerStatusDto {
  @IsEnum(SellerStatus)
  @IsNotEmpty()
  status!: SellerStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class SellerQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @IsEnum(SellerStatus)
  @IsOptional()
  status?: SellerStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sort?: string = 'createdAt';

  @IsString()
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';
}
