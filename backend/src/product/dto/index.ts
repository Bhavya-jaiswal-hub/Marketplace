import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ProductStatus } from '@prisma/client';

export class ProductImageDto {
  @IsString()
  @IsNotEmpty()
  imageUrl!: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean = false;

  @IsUUID()
  @IsOptional()
  variantId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number = 0;
}

export class ProductSpecificationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number = 0;
}

export class CreateProductVariantDto {
  @IsString()
  @IsNotEmpty()
  size!: string;

  @IsString()
  @IsNotEmpty()
  color!: string;

  @IsString()
  @IsNotEmpty()
  sku!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  stockQuantity?: number = 0;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number = 5;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  priceOverride?: number;
}

export class UpdateProductVariantDto {
  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  priceOverride?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  price!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  compareAtPrice?: number;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  initialStock?: number = 0;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number = 5;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  @IsOptional()
  variants?: CreateProductVariantDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  @IsOptional()
  images?: ProductImageDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecificationDto)
  @IsOptional()
  specifications?: ProductSpecificationDto[];
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  price?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  compareAtPrice?: number;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;
}

export class DuplicateProductDto {
  @IsString()
  @IsNotEmpty()
  newSku!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  initialStock?: number = 0;
}

export class SetSpecificationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecificationDto)
  @IsNotEmpty()
  specifications!: ProductSpecificationDto[];
}

export class AdminTakedownDto {
  @IsString()
  @IsNotEmpty()
  takedownReason!: string;
}

export class ProductQueryDto {
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

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsUUID()
  @IsOptional()
  sellerId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  inStockOnly?: boolean;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
