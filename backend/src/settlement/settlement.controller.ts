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
  ProcessPayoutDto,
  RetryPayoutDto,
  SettlementQueryDto,
} from './dto';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/v1')
@UseGuards(AuthGuard, RolesGuard)
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  // ================= SELLER SETTLEMENT ROUTES =================

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

  // ================= SUPER ADMIN SETTLEMENT ROUTES =================

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

  @Post('admin/settlements')
  @Roles('SUPER_ADMIN')
  async createSettlement(
    @Req() req: any,
    @Body() dto: CreateSettlementDto,
  ) {
    return this.settlementService.createSettlement(req.user.sub, dto);
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

  @Post('admin/settlements/:settlementId/retry')
  @Roles('SUPER_ADMIN')
  async retryPayout(
    @Req() req: any,
    @Param('settlementId') settlementId: string,
    @Body() dto: RetryPayoutDto,
  ) {
    return this.settlementService.retryPayout(req.user.sub, settlementId, dto);
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
