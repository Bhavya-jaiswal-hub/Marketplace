import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  quantity: number = 1;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;
}
