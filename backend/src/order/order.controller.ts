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
  ArbitrateDisputeDto,
  CancelOrderDto,
  DisputeQueryDto,
  InitiateCheckoutDto,
  OrderQueryDto,
  ReportNotReceivedDto,
  SubmitDisputeProofDto,
  UpdateFulfillmentStatusDto,
} from './dto';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ================= CUSTOMER CHECKOUT & ORDERS =================

  @Post('checkout')
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.CREATED)
  async initiateCheckout(
    @Req() req: AuthenticatedRequest,
    @Body() dto: InitiateCheckoutDto,
  ) {
    return this.orderService.initiateCheckout(req.user.sub, dto);
  }

  @Get('orders')
  @Roles('CUSTOMER')
  async listCustomerOrders(
    @Req() req: AuthenticatedRequest,
    @Query() query: OrderQueryDto,
  ) {
    return this.orderService.listCustomerOrders(req.user.sub, query);
  }

  @Get('orders/:orderId')
  @Roles('CUSTOMER')
  async getCustomerOrder(
    @Req() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
  ) {
    return this.orderService.getCustomerOrder(req.user.sub, orderId);
  }

  @Post('orders/:orderId/cancel')
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Req() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orderService.cancelOrder(req.user.sub, orderId, dto);
  }

  @Post('orders/:orderId/items/:orderItemId/not-received')
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.OK)
  async reportNotReceived(
    @Req() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Param('orderItemId') orderItemId: string,
    @Body() dto: ReportNotReceivedDto,
  ) {
    return this.orderService.reportNotReceived(
      req.user.sub,
      orderId,
      orderItemId,
      dto,
    );
  }

  // ================= SELLER ORDER FULFILLMENT =================

  @Get('sellers/me/orders')
  @Roles('SELLER')
  async listSellerOrders(
    @Req() req: AuthenticatedRequest,
    @Query() query: OrderQueryDto,
  ) {
    return this.orderService.listSellerOrders(req.user.sub, query);
  }

  @Patch('sellers/me/orders/:orderId/items/:orderItemId/status')
  @Roles('SELLER')
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

  @Post('sellers/me/orders/:orderId/items/:orderItemId/dispute-proof')
  @Roles('SELLER')
  @HttpCode(HttpStatus.OK)
  async submitDisputeProof(
    @Req() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Param('orderItemId') orderItemId: string,
    @Body() dto: SubmitDisputeProofDto,
  ) {
    return this.orderService.submitDisputeProof(
      req.user.sub,
      orderId,
      orderItemId,
      dto,
    );
  }

  // ================= ADMIN ORDER & DISPUTE MANAGEMENT =================

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

  @Get('admin/disputes')
  @Roles('SUPER_ADMIN')
  async listAdminDisputes(@Query() query: DisputeQueryDto) {
    return this.orderService.listAdminDisputes(query);
  }

  @Post('admin/disputes/:orderItemId/arbitrate')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async arbitrateDispute(
    @Req() req: AuthenticatedRequest,
    @Param('orderItemId') orderItemId: string,
    @Body() dto: ArbitrateDisputeDto,
  ) {
    return this.orderService.arbitrateDispute(
      req.user.sub,
      orderItemId,
      dto,
    );
  }
}
