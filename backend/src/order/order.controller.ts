import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrderService } from './order.service';
import {
  CancelOrderDto,
  InitiateCheckoutDto,
  OrderQueryDto,
  UpdateFulfillmentStatusDto,
} from './dto';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ================= CUSTOMER CHECKOUT & ORDERS =================

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async initiateCheckout(
    @Req() req: AuthenticatedRequest,
    @Body() dto: InitiateCheckoutDto,
  ) {
    return this.orderService.initiateCheckout(req.user.sub, dto);
  }

  @Get('orders')
  async listCustomerOrders(
    @Req() req: AuthenticatedRequest,
    @Query() query: OrderQueryDto,
  ) {
    return this.orderService.listCustomerOrders(req.user.sub, query);
  }

  @Get('orders/:orderId')
  async getCustomerOrder(
    @Req() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
  ) {
    return this.orderService.getCustomerOrder(req.user.sub, orderId);
  }

  @Post('orders/:orderId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Req() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orderService.cancelOrder(req.user.sub, orderId, dto);
  }

  // ================= SELLER ORDER FULFILLMENT =================

  @Get('sellers/me/orders')
  async listSellerOrders(
    @Req() req: AuthenticatedRequest,
    @Query() query: OrderQueryDto,
  ) {
    return this.orderService.listSellerOrders(req.user.sub, query);
  }

  @Patch('sellers/me/orders/:orderId/items/:orderItemId/status')
  async updateSellerOrderItemStatus(
    @Req() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Param('orderItemId') orderItemId: string,
    @Body() dto: UpdateFulfillmentStatusDto,
  ) {
    return this.orderService.updateSellerOrderItemStatus(
      req.user.sub,
      orderId,
      orderItemId,
      dto,
    );
  }

  // ================= ADMIN ORDER MANAGEMENT =================

  @Get('admin/orders')
  @Roles('SUPER_ADMIN')
  async listAdminOrders(@Query() query: OrderQueryDto) {
    return this.orderService.listAdminOrders(query);
  }

  @Get('admin/orders/:orderId')
  @Roles('SUPER_ADMIN')
  async getAdminOrder(@Param('orderId') orderId: string) {
    return this.orderService.getAdminOrder(orderId);
  }
}
