import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReportingService } from './reporting.service';
import {
  ReportFilterDto,
  AuditLogQueryDto,
  ActivityLogQueryDto,
} from './dto';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/v1')
@UseGuards(AuthGuard, RolesGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  // ================= SUPER ADMIN REPORTS =================

  @Get('admin/reports/sales')
  @Roles('SUPER_ADMIN')
  async getSalesReport(@Query() query: ReportFilterDto) {
    return this.reportingService.getSalesReport(query);
  }

  @Get('admin/reports/revenue')
  @Roles('SUPER_ADMIN')
  async getRevenueReport(@Query() query: ReportFilterDto) {
    return this.reportingService.getRevenueReport(query);
  }

  @Get('admin/reports/commission')
  @Roles('SUPER_ADMIN')
  async getCommissionReport(@Query() query: ReportFilterDto) {
    return this.reportingService.getCommissionReport(query);
  }

  @Get('admin/reports/settlements')
  @Roles('SUPER_ADMIN')
  async getSettlementsReport(@Query() query: ReportFilterDto) {
    return this.reportingService.getSettlementsReport(query);
  }

  @Get('admin/reports/sellers')
  @Roles('SUPER_ADMIN')
  async getSellersReport(@Query() query: ReportFilterDto) {
    return this.reportingService.getSellersReport(query);
  }

  @Get('admin/reports/products')
  @Roles('SUPER_ADMIN')
  async getProductsReport(@Query() query: ReportFilterDto) {
    return this.reportingService.getProductsReport(query);
  }

  @Get('admin/reports/inventory')
  @Roles('SUPER_ADMIN')
  async getInventoryReport(@Query() query: ReportFilterDto) {
    return this.reportingService.getInventoryReport(query);
  }

  @Get('admin/reports/verifications')
  @Roles('SUPER_ADMIN')
  async getVerificationsReport(@Query() query: ReportFilterDto) {
    return this.reportingService.getVerificationsReport(query);
  }

  @Get('admin/audit-logs')
  @Roles('SUPER_ADMIN')
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.reportingService.getAuditLogs(query);
  }

  @Get('admin/activity-logs')
  @Roles('SUPER_ADMIN')
  async getActivityLogs(@Query() query: ActivityLogQueryDto) {
    return this.reportingService.getActivityLogs(query);
  }

  // ================= SELLER ANALYTICS =================

  @Get('sellers/me/analytics')
  @Roles('SELLER')
  async getSellerAnalytics(@Req() req: any, @Query() query: ReportFilterDto) {
    return this.reportingService.getSellerAnalytics(req.user.sub, query);
  }
}
