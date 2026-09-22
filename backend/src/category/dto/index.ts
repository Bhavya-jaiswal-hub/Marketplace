import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SellerCategoryStatus } from '@prisma/client';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsUUID()
  @IsOptional()
  parentCategoryId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  initialCommissionRate?: number;
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ConfigureCommissionDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  commissionRate!: number;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;
}

export class CategoryRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  categoryIds!: string[];
}

export class RejectCategoryRequestDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason!: string;
}

export class RevokeCategoryDto {
  @IsString()
  @IsNotEmpty()
  revocationReason!: string;
}

export class AssignCategoryDto {
  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;
}

export class CategoryRequestQueryDto {
  @IsEnum(SellerCategoryStatus)
  @IsOptional()
  status?: SellerCategoryStatus;
}
