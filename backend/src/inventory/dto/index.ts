import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum StockAdjustmentMode {
  SET = 'SET',
  ADD = 'ADD',
  REMOVE = 'REMOVE',
}

export class AdjustStockDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  quantity!: number;

  @IsEnum(StockAdjustmentMode)
  @IsOptional()
  mode?: StockAdjustmentMode = StockAdjustmentMode.SET;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsOptional()
  referenceId?: string;
}

export class StockItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity!: number;
}

export class ValidateStockDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockItemDto)
  items!: StockItemDto[];
}

export class ReserveStockDto {
  @IsString()
  @IsNotEmpty()
  reservationId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockItemDto)
  items!: StockItemDto[];
}

export class ConfirmReservationDto {
  @IsString()
  @IsNotEmpty()
  reservationId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockItemDto)
  items!: StockItemDto[];
}

export class ReleaseReservationDto {
  @IsString()
  @IsNotEmpty()
  reservationId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockItemDto)
  items!: StockItemDto[];
}
