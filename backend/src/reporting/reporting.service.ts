import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ReportFilterDto,
  AuditLogQueryDto,
  ActivityLogQueryDto,
  RequestReportExportDto,
} from './dto';
import {
  OrderStatus,
  PaymentStatus,
  SellerStatus,
  ProductStatus,
} from '@prisma/client';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ================= 1. OPERATIONAL & FINANCIAL REPORTS =================

  async getSalesReport(dto: ReportFilterDto): Promise<any> {
    const whereClause: any = {};
    if (dto.periodFrom || dto.periodTo) {
      whereClause.createdAt = {};
      if (dto.periodFrom) whereClause.createdAt.gte = new Date(dto.periodFrom);
      if (dto.periodTo) whereClause.createdAt.lte = new Date(dto.periodTo);
    }
    if (dto.status) whereClause.orderStatus = dto.status;

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        orderItems: {
          include: {
            seller: { select: { id: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalOrders = orders.length;
    let totalUnitsSold = 0;
    let totalGrossSales = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalNetSales = 0;

    const rows = orders.map((o) => {
      const gross = Number(o.subtotal);
      const discount = Number(o.discountAmount);
      const tax = Number(o.taxAmount);
      const total = Number(o.totalAmount);
      const units = o.orderItems.reduce((acc, item) => acc + item.quantity, 0);

      totalUnitsSold += units;
      totalGrossSales += gross;
      totalDiscount += discount;
      totalTax += tax;
      totalNetSales += total;

      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        status: o.orderStatus,
        paymentStatus: o.paymentStatus,
        unitsCount: units,
        subtotal: gross,
        discountAmount: discount,
        taxAmount: tax,
        totalAmount: total,
        currency: o.currency,
        createdAt: o.createdAt,
      };
    });

    const summary = {
      totalOrders,
      totalUnitsSold,
      totalGrossSales: Number(totalGrossSales.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalNetSales: Number(totalNetSales.toFixed(2)),
      currency: 'INR',
    };

    return {
      success: true,
      data: {
        summary,
        orders: rows,
      },
      message: 'Sales report generated successfully',
    };
  }

  async getAdminSalesReport(dto: ReportFilterDto): Promise<any> {
    const whereClause: any = {
      order: {
        paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] },
      },
    };
    if (dto.periodFrom || dto.periodTo) {
      whereClause.createdAt = {};
      if (dto.periodFrom) whereClause.createdAt.gte = new Date(dto.periodFrom);
      if (dto.periodTo) whereClause.createdAt.lte = new Date(dto.periodTo);
    }
    if (dto.status) whereClause.status = dto.status;

    const items = await this.prisma.orderItem.findMany({
      where: whereClause,
      include: {
        order: true,
        seller: { include: { user: { include: { role: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const adminItems = items.filter(
      (item: any) => item.seller?.user?.role?.name === 'SUPER_ADMIN',
    );

    let totalGrossSales = 0;
    let totalUnitsSold = 0;
    const distinctOrderIds = new Set<string>();

    const rows = adminItems.map((item: any) => {
      const gross = Number(item.totalAmount);
      const units = item.quantity;
      distinctOrderIds.add(item.orderId);

      totalGrossSales += gross;
      totalUnitsSold += units;

      return {
        orderItemId: item.id,
        orderId: item.orderId,
        orderNumber: item.order?.orderNumber,
        productName: item.productName,
        sku: item.sku,
        quantity: units,
        unitPrice: Number(item.unitPrice),
        totalAmount: gross,
        status: item.status,
        createdAt: item.createdAt,
      };
    });

    const totalOrders = distinctOrderIds.size;
    const averageOrderValue =
      totalOrders > 0 ? Number((totalGrossSales / totalOrders).toFixed(2)) : 0;

    return {
      success: true,
      data: {
        summary: {
          totalOrders,
          totalUnitsSold,
          totalAdminRevenue: Number(totalGrossSales.toFixed(2)),
          averageOrderValue,
          commissionRate: 0.0,
          currency: 'INR',
        },
        items: rows,
      },
      message: 'Admin direct retail sales report generated successfully (segregated)',
    };
  }

  async getRevenueReport(dto: ReportFilterDto): Promise<any> {
    const whereClause: any = {
      paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] },
    };
    if (dto.periodFrom || dto.periodTo) {
      whereClause.createdAt = {};
      if (dto.periodFrom) whereClause.createdAt.gte = new Date(dto.periodFrom);
      if (dto.periodTo) whereClause.createdAt.lte = new Date(dto.periodTo);
    }

    const [orders, refunds] = await Promise.all([
      this.prisma.order.findMany({
        where: whereClause,
        include: { orderItems: true },
      }),
      this.prisma.refund.findMany({
        where: {
          status: 'SUCCEEDED',
          ...(dto.periodFrom || dto.periodTo
            ? {
                createdAt: {
                  ...(dto.periodFrom ? { gte: new Date(dto.periodFrom) } : {}),
                  ...(dto.periodTo ? { lte: new Date(dto.periodTo) } : {}),
                },
              }
            : {}),
        },
      }),
    ]);

    let grossMerchandiseValue = 0;
    let totalCommissionEarned = 0;
    let totalSellerEarnings = 0;

    for (const ord of orders) {
      grossMerchandiseValue += Number(ord.totalAmount);
      for (const item of ord.orderItems) {
        totalCommissionEarned += Number(item.commissionAmount);
        totalSellerEarnings += Number(item.sellerEarnings);
      }
    }

    const totalRefundsDeducted = refunds.reduce(
      (acc, r) => acc + Number(r.refundAmount),
      0,
    );

    const netMarketplaceRevenue = totalCommissionEarned;

    return {
      success: true,
      data: {
        summary: {
          grossMerchandiseValue: Number(grossMerchandiseValue.toFixed(2)),
          totalMarketplaceCommission: Number(totalCommissionEarned.toFixed(2)),
          totalSellerPayoutLiability: Number(totalSellerEarnings.toFixed(2)),
          totalRefundsProcessed: Number(totalRefundsDeducted.toFixed(2)),
          netMarketplaceRevenue: Number(netMarketplaceRevenue.toFixed(2)),
          currency: 'INR',
        },
      },
      message: 'Revenue report generated successfully',
    };
  }

  async getCommissionReport(dto: ReportFilterDto): Promise<any> {
    const whereClause: any = {
      order: {
        paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] },
      },
    };
    if (dto.periodFrom || dto.periodTo) {
      whereClause.createdAt = {};
      if (dto.periodFrom) whereClause.createdAt.gte = new Date(dto.periodFrom);
      if (dto.periodTo) whereClause.createdAt.lte = new Date(dto.periodTo);
    }
    if (dto.sellerId) whereClause.sellerId = dto.sellerId;

    const orderItems = await this.prisma.orderItem.findMany({
      where: whereClause,
      include: {
        seller: { select: { id: true, displayName: true } },
        product: { include: { category: true } },
        order: { select: { orderNumber: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalCommission = 0;
    let totalItemSales = 0;

    const breakdown = orderItems.map((item) => {
      const sales = Number(item.totalAmount);
      const rate = Number(item.commissionRate);
      const comm = Number(item.commissionAmount);

      totalItemSales += sales;
      totalCommission += comm;

      return {
        orderNumber: item.order.orderNumber,
        productName: item.productName,
        category: item.product?.category?.name || 'General',
        sellerName: item.seller.displayName,
        itemSales: sales,
        commissionRate: rate,
        commissionAmount: comm,
        createdAt: item.createdAt,
      };
    });

    return {
      success: true,
      data: {
        summary: {
          totalItemSales: Number(totalItemSales.toFixed(2)),
          totalCommissionEarned: Number(totalCommission.toFixed(2)),
          effectiveAverageCommissionRate:
            totalItemSales > 0
              ? Number(((totalCommission / totalItemSales) * 100).toFixed(2))
              : 0.0,
          currency: 'INR',
        },
        items: breakdown,
      },
      message: 'Commission report generated successfully',
    };
  }

  async getSettlementsReport(dto: ReportFilterDto): Promise<any> {
    const whereClause: any = {};
    if (dto.periodFrom || dto.periodTo) {
      whereClause.createdAt = {};
      if (dto.periodFrom) whereClause.createdAt.gte = new Date(dto.periodFrom);
      if (dto.periodTo) whereClause.createdAt.lte = new Date(dto.periodTo);
    }
    if (dto.sellerId) whereClause.sellerId = dto.sellerId;

    const settlements = await this.prisma.settlement.findMany({
      where: whereClause,
      include: {
        seller: { select: { id: true, displayName: true, businessName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalGrossSettled = 0;
    let totalCommissionRetained = 0;
    let totalNetDisbursed = 0;
    let completedCount = 0;
    let pendingCount = 0;

    const rows = settlements.map((s) => {
      const gross = Number(s.grossAmount);
      const comm = Number(s.commissionAmount);
      const net = Number(s.netSettlementAmount);

      totalGrossSettled += gross;
      totalCommissionRetained += comm;
      totalNetDisbursed += net;

      if (s.status === 'SETTLED') completedCount++;
      if (s.status === 'GENERATED' || s.status === 'APPROVED') pendingCount++;

      return {
        settlementNumber: s.settlementNumber,
        sellerName: s.seller.displayName || s.seller.businessName,
        periodFrom: s.periodFrom,
        periodTo: s.periodTo,
        status: s.status,
        payoutMethod: s.payoutMethod,
        payoutReference: s.payoutReference,
        grossAmount: gross,
        commissionAmount: comm,
        netSettlementAmount: net,
        processedAt: s.processedAt,
      };
    });

    return {
      success: true,
      data: {
        summary: {
          totalSettlements: settlements.length,
          completedCount,
          pendingCount,
          totalGrossSettled: Number(totalGrossSettled.toFixed(2)),
          totalCommissionRetained: Number(totalCommissionRetained.toFixed(2)),
          totalNetDisbursed: Number(totalNetDisbursed.toFixed(2)),
          currency: 'INR',
        },
        settlements: rows,
      },
      message: 'Settlements report generated successfully',
    };
  }

  async getSellersReport(dto: ReportFilterDto): Promise<any> {
    const sellers = await this.prisma.sellerProfile.findMany({
      include: {
        orderItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts: Record<string, number> = {
      TOTAL: sellers.length,
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      REJECTED: 0,
      SUSPENDED: 0,
      BLOCKED: 0,
    };

    const sellerList = sellers.map((s) => {
      if (statusCounts[s.status] !== undefined) {
        statusCounts[s.status]++;
      }
      const totalRevenue = s.orderItems.reduce(
        (acc, item) => acc + Number(item.sellerEarnings),
        0,
      );
      return {
        sellerId: s.id,
        displayName: s.displayName,
        businessName: s.businessName,
        sellerType: s.sellerType,
        status: s.status,
        totalItemsSold: s.orderItems.length,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        createdAt: s.createdAt,
      };
    });

    return {
      success: true,
      data: {
        distribution: statusCounts,
        sellers: sellerList,
      },
      message: 'Sellers report generated successfully',
    };
  }

  async getProductsReport(dto: ReportFilterDto): Promise<any> {
    const products = await this.prisma.product.findMany({
      where: {
        status: { not: ProductStatus.SOFT_DELETED },
      },
      include: {
        category: true,
        seller: { select: { displayName: true } },
        variants: { include: { inventory: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts: Record<string, number> = {
      TOTAL: products.length,
      ACTIVE: 0,
      PAUSED: 0,
      HIDDEN: 0,
      SOFT_DELETED: 0,
      REMOVED_BY_ADMIN: 0,
    };

    const productList = products.map((p) => {
      if (statusCounts[p.status] !== undefined) {
        statusCounts[p.status]++;
      }
      const availableStock = p.variants?.reduce(
        (sum, v) => sum + (v.inventory?.availableQuantity ?? v.stockQuantity),
        0,
      ) || 0;
      const reservedStock = p.variants?.reduce(
        (sum, v) => sum + (v.inventory?.reservedQuantity ?? 0),
        0,
      ) || 0;

      return {
        productId: p.id,
        name: p.name,
        sku: p.variants?.[0]?.sku || '',
        category: p.category?.name || 'Unassigned',
        sellerName: p.seller?.displayName,
        price: Number(p.price),
        status: p.status,
        availableStock,
        reservedStock,
      };
    });

    return {
      success: true,
      data: {
        distribution: statusCounts,
        products: productList,
      },
      message: 'Products report generated successfully',
    };
  }

  async getInventoryReport(dto: ReportFilterDto): Promise<any> {
    const inventories = await this.prisma.inventory.findMany({
      include: {
        variant: {
          include: {
            product: {
              include: {
                seller: { select: { displayName: true } },
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    let totalAvailableQuantity = 0;
    let totalReservedQuantity = 0;
    const lowStockAlerts: any[] = [];

    const inventoryList = inventories.map((inv) => {
      const avail = inv.availableQuantity;
      const res = inv.reservedQuantity;
      const threshold = inv.lowStockThreshold || 5;

      totalAvailableQuantity += avail;
      totalReservedQuantity += res;

      const isLowStock = avail <= threshold;
      const item = {
        inventoryId: inv.id,
        variantId: inv.variantId,
        productId: inv.variant?.productId || (inv as any).productId || (inv as any).product?.id,
        productName: inv.variant?.product?.name || (inv as any).product?.name,
        sku: inv.variant?.sku || (inv as any).sku || (inv as any).product?.sku,
        sellerName: inv.variant?.product?.seller?.displayName || (inv as any).product?.seller?.displayName,
        category: inv.variant?.product?.category?.name || (inv as any).product?.category?.name,
        availableQuantity: avail,
        reservedQuantity: res,
        lowStockThreshold: threshold,
        isLowStock,
      };

      if (isLowStock) {
        lowStockAlerts.push(item);
      }

      return item;
    });

    return {
      success: true,
      data: {
        summary: {
          totalProductsTracked: inventories.length,
          totalAvailableStock: totalAvailableQuantity,
          totalReservedStock: totalReservedQuantity,
          lowStockItemCount: lowStockAlerts.length,
        },
        lowStockAlerts,
        inventory: inventoryList,
      },
      message: 'Inventory report generated successfully',
    };
  }

  async getVerificationsReport(dto: ReportFilterDto): Promise<any> {
    const verifications = await this.prisma.sellerVerification.findMany({
      include: {
        seller: { select: { displayName: true, contactEmail: true } },
        verificationDocuments: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    const statusCounts = {
      TOTAL: verifications.length,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };

    const verificationList = verifications.map((v) => {
      if (statusCounts[v.status] !== undefined) {
        statusCounts[v.status]++;
      }
      return {
        verificationId: v.id,
        sellerName: v.seller.displayName,
        submissionNumber: v.submissionNumber,
        status: v.status,
        submittedAt: v.submittedAt,
        reviewedAt: v.reviewedAt,
        rejectionReason: v.rejectionReason,
        documentsCount: v.verificationDocuments.length,
      };
    });

    return {
      success: true,
      data: {
        distribution: statusCounts,
        verifications: verificationList,
      },
      message: 'Verifications report generated successfully',
    };
  }

  // ================= 2. SELLER ANALYTICS =================

  async getSellerAnalytics(sellerUserId: string, dto: ReportFilterDto): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId: sellerUserId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const whereClause: any = { sellerId: seller.id };
    if (dto.periodFrom || dto.periodTo) {
      whereClause.createdAt = {};
      if (dto.periodFrom) whereClause.createdAt.gte = new Date(dto.periodFrom);
      if (dto.periodTo) whereClause.createdAt.lte = new Date(dto.periodTo);
    }

    const orderItems = await this.prisma.orderItem.findMany({
      where: whereClause,
      include: {
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalGrossSales = 0;
    let totalCommissionDeducted = 0;
    let totalSellerEarnings = 0;
    let totalUnitsSold = 0;

    const productSalesMap = new Map<string, { name: string; sku: string; units: number; earnings: number }>();

    for (const item of orderItems) {
      const gross = Number(item.totalAmount);
      const comm = Number(item.commissionAmount);
      const earnings = Number(item.sellerEarnings);
      const qty = item.quantity;

      totalGrossSales += gross;
      totalCommissionDeducted += comm;
      totalSellerEarnings += earnings;
      totalUnitsSold += qty;

      const existing = productSalesMap.get(item.productId) || {
        name: item.productName,
        sku: item.sku,
        units: 0,
        earnings: 0,
      };
      existing.units += qty;
      existing.earnings += earnings;
      productSalesMap.set(item.productId, existing);
    }

    const topProducts = Array.from(productSalesMap.values()).sort(
      (a, b) => b.earnings - a.earnings,
    );

    return {
      success: true,
      data: {
        sellerId: seller.id,
        sellerName: seller.displayName,
        summary: {
          totalOrdersCount: orderItems.length,
          totalUnitsSold,
          totalGrossSales: Number(totalGrossSales.toFixed(2)),
          totalCommissionDeducted: Number(totalCommissionDeducted.toFixed(2)),
          totalSellerEarnings: Number(totalSellerEarnings.toFixed(2)),
          currency: 'INR',
        },
        topPerformingProducts: topProducts,
      },
      message: 'Seller analytics retrieved successfully',
    };
  }

  // ================= 3. AUDIT & ACTIVITY LOGS =================

  async getAuditLogs(query: AuditLogQueryDto): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (query.userId) whereClause.userId = query.userId;
    if (query.action) whereClause.action = { contains: query.action, mode: 'insensitive' };
    if (query.resourceType) whereClause.resourceType = query.resourceType;
    if (query.resourceId) whereClause.resourceId = query.resourceId;
    if (query.periodFrom || query.periodTo) {
      whereClause.createdAt = {};
      if (query.periodFrom) whereClause.createdAt.gte = new Date(query.periodFrom);
      if (query.periodTo) whereClause.createdAt.lte = new Date(query.periodTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where: whereClause }),
    ]);

    return {
      success: true,
      data: {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      message: 'Audit logs retrieved successfully',
    };
  }

  async getActivityLogs(query: ActivityLogQueryDto): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (query.userId) whereClause.userId = query.userId;
    if (query.activityType) whereClause.activityType = query.activityType;
    if (query.resourceType) whereClause.resourceType = query.resourceType;
    if (query.periodFrom || query.periodTo) {
      whereClause.createdAt = {};
      if (query.periodFrom) whereClause.createdAt.gte = new Date(query.periodFrom);
      if (query.periodTo) whereClause.createdAt.lte = new Date(query.periodTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.activityLog.count({ where: whereClause }),
    ]);

    return {
      success: true,
      data: {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      message: 'Activity logs retrieved successfully',
    };
  }

  async recordActivity(data: {
    userId?: string;
    activityType: string;
    description: string;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<any> {
    return this.prisma.activityLog.create({
      data: {
        userId: data.userId || null,
        activityType: data.activityType,
        description: data.description,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  }

  // ================= 4. REPORT METADATA & EXPORTS =================

  async requestReportExport(
    userId: string,
    dto: RequestReportExportDto,
  ): Promise<any> {
    const periodFrom = dto.periodFrom ? new Date(dto.periodFrom) : null;
    const periodTo = dto.periodTo ? new Date(dto.periodTo) : null;
    const format = (dto.reportFormat || 'CSV').toUpperCase();

    const report = await this.prisma.reportMetadata.create({
      data: {
        reportName: dto.reportName.trim(),
        reportType: dto.reportType.trim(),
        requestedById: userId,
        reportFormat: format,
        periodFrom,
        periodTo,
        status: 'COMPLETED',
        fileKey: `exports/reports/${Date.now()}-${dto.reportType.toLowerCase()}.${format.toLowerCase()}`,
        filterParams: dto.filterParams || undefined,
        summaryMetrics: {
          generatedAt: new Date().toISOString(),
          requestedBy: userId,
        },
      },
    });

    return {
      success: true,
      data: report,
      message: 'Report export generated successfully',
    };
  }

  async getReportMetadataById(
    userId: string,
    userRole: string,
    reportId: string,
  ): Promise<any> {
    const report = await this.prisma.reportMetadata.findUnique({
      where: { id: reportId },
      include: {
        requestedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (userRole !== 'SUPER_ADMIN' && report.requestedById !== userId) {
      throw new ForbiddenException('You are not authorized to view this report');
    }

    return {
      success: true,
      data: report,
      message: 'Report metadata retrieved successfully',
    };
  }
}
