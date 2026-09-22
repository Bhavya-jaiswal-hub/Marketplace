import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { CustomerAddressType } from '@prisma/client';

export class UpdateCustomerProfileDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone number must be a valid 10-digit Indian mobile number',
  })
  phoneNumber?: string;
}

export class CreateCustomerAddressDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone number must be a valid 10-digit Indian mobile number',
  })
  phoneNumber!: string;

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
  @Matches(/^[1-9][0-9]{5}$/, {
    message: 'Postal code must be a valid 6-digit Indian PIN code',
  })
  postalCode!: string;

  @IsString()
  @IsOptional()
  country?: string = 'India';

  @IsEnum(CustomerAddressType)
  @IsOptional()
  addressType?: CustomerAddressType = CustomerAddressType.HOME;

  @IsBoolean()
  @IsOptional()
  isDefaultShipping?: boolean = false;

  @IsBoolean()
  @IsOptional()
  isDefaultBilling?: boolean = false;
}

export class UpdateCustomerAddressDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone number must be a valid 10-digit Indian mobile number',
  })
  phoneNumber?: string;

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
  @Matches(/^[1-9][0-9]{5}$/, {
    message: 'Postal code must be a valid 6-digit Indian PIN code',
  })
  postalCode?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsEnum(CustomerAddressType)
  @IsOptional()
  addressType?: CustomerAddressType;

  @IsBoolean()
  @IsOptional()
  isDefaultShipping?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefaultBilling?: boolean;
}
