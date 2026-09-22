import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto';

@Controller('cart')
@UseGuards(AuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: AuthenticatedRequest) {
    return this.cartService.getCart(req.user.sub);
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.addItem(req.user.sub, dto);
  }

  @Patch('items/:itemId')
  async updateItemQuantity(
    @Req() req: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(req.user.sub, itemId, dto);
  }

  @Delete('items/:itemId')
  async removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem(req.user.sub, itemId);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateCart(@Req() req: AuthenticatedRequest) {
    return this.cartService.validateCart(req.user.sub);
  }

  @Delete()
  async clearCart(@Req() req: AuthenticatedRequest) {
    return this.cartService.clearCart(req.user.sub);
  }
}
