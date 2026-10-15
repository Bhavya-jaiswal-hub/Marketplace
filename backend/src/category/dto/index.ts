import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
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

  @IsUUID()
  @IsOptional()
  sizeSetId?: string;

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

  @IsUUID()
  @IsOptional()
  sizeSetId?: string;

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

// ================= SIZE SET DTOS =================

export class CreateSizeSetValueItemDto {
  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class CreateSizeSetDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSizeSetValueItemDto)
  @IsOptional()
  values?: CreateSizeSetValueItemDto[];
}

export class UpdateSizeSetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AddSizeSetValueDto {
  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class SizeSetQueryDto {
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeInactive?: boolean;
}
