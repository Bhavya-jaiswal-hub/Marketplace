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

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  sku!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  price!: number;

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
  specifications!: ProductSpecificationDto[];
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
