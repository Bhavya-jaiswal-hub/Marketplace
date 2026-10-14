import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReturnRefundService } from './return-refund.service';
import {
  CreateReturnRequestDto,
  CustomerShipReturnDto,
  ApproveReturnRequestDto,
  RejectReturnRequestDto,
  SellerRejectInspectionDto,
  AdminResolveDisputeDto,
  CompleteReturnRequestDto,
  ProcessRefundDto,
  ReturnQueryDto,
  RefundQueryDto,
} from './dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class ReturnRefundController {
  constructor(private readonly returnRefundService: ReturnRefundService) {}

  // ================= CUSTOMER RETURN & REFUND ROUTES =================

  @Post('orders/:orderId/items/:orderItemId/returns')
  @Roles('CUSTOMER')
  async createReturnRequest(
    @Req() req: any,
    @Param('orderId') orderId: string,
    @Param('orderItemId') orderItemId: string,
    @Body() dto: CreateReturnRequestDto,
  ) {
    return this.returnRefundService.createReturnRequest(
      req.user.sub,
      orderId,
      orderItemId,
      dto,
    );
  }

  @Post('orders/items/:orderItemId/returns')
  @Roles('CUSTOMER')
  async createReturnRequestDirect(
    @Req() req: any,
    @Param('orderItemId') orderItemId: string,
    @Body() dto: CreateReturnRequestDto,
  ) {
    // If orderId is omitted in URL, service will look up orderItem and orderId
    return this.returnRefundService.createReturnRequest(
      req.user.sub,
      '',
      orderItemId,
      dto,
    );
  }

  @Post('returns/:returnRequestId/ship')
  @Roles('CUSTOMER')
  async customerShipReturn(
    @Req() req: any,
    @Param('returnRequestId') returnRequestId: string,
    @Body() dto: CustomerShipReturnDto,
  ) {
    return this.returnRefundService.customerShipReturn(
      req.user.sub,
      returnRequestId,
      dto,
    );
  }

  @Get('returns')
  @Roles('CUSTOMER')
  async getCustomerReturns(@Req() req: any, @Query() query: ReturnQueryDto) {
    return this.returnRefundService.getCustomerReturns(req.user.sub, query);
  }

  @Get('returns/:returnRequestId')
  @Roles('CUSTOMER', 'SUPER_ADMIN')
  async getReturnRequest(
    @Req() req: any,
    @Param('returnRequestId') returnRequestId: string,
  ) {
    if (req.user.roleName === 'SUPER_ADMIN') {
      return this.returnRefundService.getAdminReturnById(returnRequestId);
    }
    return this.returnRefundService.getCustomerReturnById(
      req.user.sub,
      returnRequestId,
    );
  }

  @Get('refunds')
  @Roles('CUSTOMER')
  async getCustomerRefunds(@Req() req: any, @Query() query: RefundQueryDto) {
    return this.returnRefundService.getCustomerRefunds(req.user.sub, query);
  }

  @Get('refunds/:refundId')
  @Roles('CUSTOMER', 'SUPER_ADMIN')
  async getRefundById(
    @Req() req: any,
    @Param('refundId') refundId: string,
  ) {
    return this.returnRefundService.getRefundById(
      req.user.sub,
      refundId,
      req.user.roleName,
    );
  }

  // ================= SELLER RETURN ROUTES =================

  @Get('sellers/me/returns')
  @Roles('SELLER')
  async getSellerReturns(@Req() req: any, @Query() query: ReturnQueryDto) {
    return this.returnRefundService.getSellerReturns(req.user.sub, query);
  }

  @Get('sellers/me/returns/:returnRequestId')
  @Roles('SELLER')
  async getSellerReturnById(
    @Req() req: any,
    @Param('returnRequestId') returnRequestId: string,
  ) {
    return this.returnRefundService.getSellerReturnById(
      req.user.sub,
      returnRequestId,
    );
  }

  @Post('sellers/me/returns/:returnRequestId/received')
  @Roles('SELLER')
  async sellerConfirmReceipt(
    @Req() req: any,
    @Param('returnRequestId') returnRequestId: string,
  ) {
    return this.returnRefundService.sellerConfirmReceipt(
      req.user.sub,
      returnRequestId,
    );
  }

  @Post('sellers/me/returns/:returnRequestId/verify')
  @Roles('SELLER')
  async sellerVerifyReturn(
    @Req() req: any,
    @Param('returnRequestId') returnRequestId: string,
    @Body() body: { comments?: string },
  ) {
    return this.returnRefundService.sellerVerifyReturn(
      req.user.sub,
      returnRequestId,
      body?.comments,
    );
  }

  @Post('sellers/me/returns/:returnRequestId/reject-inspection')
  @Roles('SELLER')
  async sellerRejectInspection(
    @Req() req: any,
    @Param('returnRequestId') returnRequestId: string,
    @Body() dto: SellerRejectInspectionDto,
  ) {
    return this.returnRefundService.sellerRejectInspection(
      req.user.sub,
      returnRequestId,
      dto,
    );
  }

  // ================= SUPER ADMIN RETURN & DISPUTE ROUTES =================

  @Get('admin/returns')
  @Roles('SUPER_ADMIN')
  async getAdminReturns(@Query() query: ReturnQueryDto) {
    return this.returnRefundService.getAdminReturns(query);
  }

  @Get('admin/returns/:returnRequestId')
  @Roles('SUPER_ADMIN')
  async getAdminReturnById(@Param('returnRequestId') returnRequestId: string) {
    return this.returnRefundService.getAdminReturnById(returnRequestId);
  }

  @Post('admin/returns/:returnRequestId/approve-eligibility')
  @Roles('SUPER_ADMIN')
  async approveReturnEligibility(
    @Req() req: any,
    @Param('returnRequestId') returnRequestId: string,
    @Body() dto: ApproveReturnRequestDto,
  ) {
    return this.returnRefundService.approveReturnRequest(
      req.user.sub,
      returnRequestId,
      dto,
    );
  }

  @Post('admin/returns/:returnRequestId/approve')
  @Roles('SUPER_ADMIN')
  async approveReturnRequest(
    @Req() req: any,
    @Param('returnRequestId') returnRequestId: string,
    @Body() dto: ApproveReturnRequestDto,
  ) {
    return this.returnRefundService.approveReturnRequest(
      req.user.sub,
      returnRequestId,
      dto,
    );
  }

  @Post('admin/returns/:returnRequestId/reject-eligibility')
  @Roles('SUPER_ADMIN')
  async rejectReturnEligibility(
    @Req() req: any,
    @Param('returnRequestId') returnRequestId: string,
    @Body() dto: RejectReturnRequestDto,
  ) {
    return this.returnRefundService.rejectReturnRequest(
      req.user.sub,
      returnRequestId,
      dto,
    );
  }

  @Post('admin/returns/:returnRequestId/reject')
  @Roles('SUPER_ADMIN')
  async rejectReturnRequest(
    @Req() req: any,
    @Param('returnRequestId') returnRequestId: string,
    @Body() dto: RejectReturnRequestDto,
  ) {
    return this.returnRefundService.rejectReturnRequest(
      req.user.sub,
      returnRequestId,
      dto,
    );
  }

  @Post('admin/returns/:returnRequestId/resolve-dispute')
  @Roles('SUPER_ADMIN')
  async resolveReturnDispute(
    @Req() req: any,
    @Param('returnRequestId') returnRequestId: string,
    @Body() dto: AdminResolveDisputeDto,
  ) {
    return this.returnRefundService.resolveReturnDispute(
      req.user.sub,
      returnRequestId,
      dto,
    );
  }

  @Post('admin/returns/:returnRequestId/process-refund')
  @Roles('SUPER_ADMIN')
  async processReturnRefund(
    @Req() req: any,
    @Param('returnRequestId') returnRequestId: string,
    @Body() dto: ProcessRefundDto,
  ) {
    return this.returnRefundService.processReturnRefund(
      req.user.sub,
      returnRequestId,
      dto,
    );
  }

  @Post('admin/returns/:returnRequestId/complete')
  @Roles('SUPER_ADMIN')
  async completeReturnRequest(
    @Req() req: any,
    @Param('returnRequestId') returnRequestId: string,
    @Body() dto: CompleteReturnRequestDto,
  ) {
    return this.returnRefundService.completeReturnRequest(
      req.user.sub,
      returnRequestId,
      dto,
    );
  }

  @Get('admin/refunds')
  @Roles('SUPER_ADMIN')
  async getAdminRefunds(@Query() query: RefundQueryDto) {
    return this.returnRefundService.getAdminRefunds(query);
  }

  @Post('admin/refunds/:refundId/process')
  @Roles('SUPER_ADMIN')
  async processRefund(
    @Req() req: any,
    @Param('refundId') refundId: string,
    @Body() dto: ProcessRefundDto,
  ) {
    return this.returnRefundService.processRefund(req.user.sub, refundId, dto);
  }
}
