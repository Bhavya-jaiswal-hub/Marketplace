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
import { SettlementService } from './settlement.service';
import {
  PreviewSettlementDto,
  CreateSettlementDto,
  RunSettlementDto,
  ProcessPayoutDto,
  ConfirmPayoutDto,
  RetryPayoutDto,
  WriteOffAdjustmentDto,
  SettlementQueryDto,
} from './dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  // ================= SELLER SETTLEMENT & ADJUSTMENT ROUTES =================

  @Get('sellers/me/settlements')
  @Roles('SELLER')
  async getSellerSettlements(@Req() req: any, @Query() query: SettlementQueryDto) {
    return this.settlementService.getSellerSettlements(req.user.sub, query);
  }

  @Get('sellers/me/settlements/:settlementId')
  @Roles('SELLER')
  async getSellerSettlementById(
    @Req() req: any,
    @Param('settlementId') settlementId: string,
  ) {
    return this.settlementService.getSellerSettlementById(
      req.user.sub,
      settlementId,
    );
  }

  @Get('sellers/me/settlements/:settlementId/report')
  @Roles('SELLER')
  async getSellerSettlementReport(
    @Req() req: any,
    @Param('settlementId') settlementId: string,
  ) {
    return this.settlementService.generateSettlementReport(
      req.user.sub,
      settlementId,
      req.user.roleName,
    );
  }

  @Get('sellers/me/adjustments')
  @Roles('SELLER')
  async getSellerAdjustments(@Req() req: any) {
    return this.settlementService.getMyAdjustments(req.user.sub);
  }

  // ================= SUPER ADMIN SETTLEMENT & ADJUSTMENT ROUTES =================

  @Get('admin/settlements')
  @Roles('SUPER_ADMIN')
  async getAdminSettlements(@Query() query: SettlementQueryDto) {
    return this.settlementService.getAdminSettlements(query);
  }

  @Get('admin/settlements/:settlementId')
  @Roles('SUPER_ADMIN')
  async getAdminSettlementById(@Param('settlementId') settlementId: string) {
    return this.settlementService.getAdminSettlementById(settlementId);
  }

  @Post('admin/settlements/preview')
  @Roles('SUPER_ADMIN')
  async previewSettlement(
    @Req() req: any,
    @Body() dto: PreviewSettlementDto,
  ) {
    return this.settlementService.previewSettlement(req.user.sub, dto);
  }

  @Post('admin/settlements/run')
  @Roles('SUPER_ADMIN')
  async runSettlementBatch(
    @Req() req: any,
    @Body() dto: RunSettlementDto,
  ) {
    return this.settlementService.createSettlement(req.user.sub, dto);
  }

  @Post('admin/settlements')
  @Roles('SUPER_ADMIN')
  async createSettlement(
    @Req() req: any,
    @Body() dto: CreateSettlementDto,
  ) {
    return this.settlementService.createSettlement(req.user.sub, dto);
  }

  @Post('admin/settlements/:settlementId/confirm-payout')
  @Roles('SUPER_ADMIN')
  async confirmPayout(
    @Req() req: any,
    @Param('settlementId') settlementId: string,
    @Body() dto: ConfirmPayoutDto,
  ) {
    return this.settlementService.confirmPayout(req.user.sub, settlementId, dto);
  }

  @Post('admin/settlements/:settlementId/process')
  @Roles('SUPER_ADMIN')
  async processPayout(
    @Req() req: any,
    @Param('settlementId') settlementId: string,
    @Body() dto: ProcessPayoutDto,
  ) {
    return this.settlementService.processPayout(req.user.sub, settlementId, dto);
  }

  @Post('admin/settlements/:settlementId/cancel')
  @Roles('SUPER_ADMIN')
  async cancelSettlement(
    @Req() req: any,
    @Param('settlementId') settlementId: string,
  ) {
    return this.settlementService.cancelSettlement(req.user.sub, settlementId);
  }

  @Post('admin/settlements/:settlementId/retry')
  @Roles('SUPER_ADMIN')
  async retryPayout(
    @Req() req: any,
    @Param('settlementId') settlementId: string,
    @Body() dto: RetryPayoutDto,
  ) {
    return this.settlementService.retryPayout(req.user.sub, settlementId, dto);
  }

  @Get('admin/sellers/:sellerId/adjustments')
  @Roles('SUPER_ADMIN')
  async getAdminSellerAdjustments(@Param('sellerId') sellerId: string) {
    return this.settlementService.getSellerAdjustments(sellerId);
  }

  @Post('admin/adjustments/:adjustmentId/write-off')
  @Roles('SUPER_ADMIN')
  async writeOffAdjustment(
    @Req() req: any,
    @Param('adjustmentId') adjustmentId: string,
    @Body() dto: WriteOffAdjustmentDto,
  ) {
    return this.settlementService.writeOffAdjustment(req.user.sub, adjustmentId, dto);
  }

  @Get('admin/settlements/:settlementId/report')
  @Roles('SUPER_ADMIN')
  async getAdminSettlementReport(
    @Req() req: any,
    @Param('settlementId') settlementId: string,
  ) {
    return this.settlementService.generateSettlementReport(
      req.user.sub,
      settlementId,
      req.user.roleName,
    );
  }
}
