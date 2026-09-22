import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  PreviewSettlementDto,
  CreateSettlementDto,
  ProcessPayoutDto,
  RetryPayoutDto,
  SettlementQueryDto,
} from './dto';
import {
  SettlementStatus,
  OrderItemStatus,
  ReturnRequestStatus,
  RefundStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ================= 1. ELIGIBILITY & PREVIEW =================

  private async fetchEligibleOrderItems(
    sellerId: string,
    periodFromStr: string,
    periodToStr: string,
  ): Promise<any[]> {
    const periodFrom = new Date(periodFromStr);
    const periodTo = new Date(periodToStr);

    if (isNaN(periodFrom.getTime()) || isNaN(periodTo.getTime())) {
      throw new BadRequestException('Invalid settlement period dates');
    }

    if (periodFrom >= periodTo) {
      throw new BadRequestException('periodFrom must be earlier than periodTo');
    }

    // 7-day holding period: deliveredAt + 7 days <= periodTo (or now)
    const holdingCutoff = new Date(periodTo.getTime());

    // Fetch delivered items for this seller within the period
    const candidateItems = await this.prisma.orderItem.findMany({
      where: {
        sellerId,
        status: OrderItemStatus.DELIVERED,
        createdAt: {
          gte: periodFrom,
          lte: periodTo,
        },
        settlementItem: null, // Must not be settled already
      },
      include: {
        order: true,
        returnRequests: true,
        refunds: true,
      },
    });

    const eligibleItems = candidateItems.filter((item) => {
      // 1. Must have deliveredAt
      if (!item.deliveredAt) return false;

      // 2. Must satisfy 7-day holding period after delivery
      const deliveredTime = new Date(item.deliveredAt).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (deliveredTime + sevenDaysMs > holdingCutoff.getTime()) {
        return false;
      }

      // 3. Must not have active or approved return requests
      const hasBlockingReturn = item.returnRequests.some(
        (r) =>
          r.status !== ReturnRequestStatus.REJECTED &&
          r.status !== ReturnRequestStatus.CANCELLED,
      );
      if (hasBlockingReturn) return false;

      // 4. Must not have active/succeeded refunds
      const hasBlockingRefund = item.refunds.some(
        (rf) =>
          rf.status !== RefundStatus.FAILED &&
          rf.status !== RefundStatus.CANCELLED,
      );
      if (hasBlockingRefund) return false;

      return true;
    });

    return eligibleItems;
  }

  async previewSettlement(
    adminUserId: string,
    dto: PreviewSettlementDto,
  ): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: dto.sellerId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const items = await this.fetchEligibleOrderItems(
      dto.sellerId,
      dto.periodFrom,
      dto.periodTo,
    );

    let grossAmount = 0;
    let commissionAmount = 0;
    let netSettlementAmount = 0;

    const breakdown = items.map((item) => {
      const gross = Number(item.totalAmount);
      const commRate = Number(item.commissionRate);
      const comm = Number(item.commissionAmount);
      const net = Number(item.sellerEarnings);

      grossAmount += gross;
      commissionAmount += comm;
      netSettlementAmount += net;

      return {
        orderItemId: item.id,
        orderNumber: item.order.orderNumber,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        grossAmount: gross,
        commissionRate: commRate,
        commissionAmount: comm,
        netAmount: net,
        deliveredAt: item.deliveredAt,
      };
    });

    return {
      success: true,
      data: {
        sellerId: seller.id,
        sellerName: seller.displayName || seller.businessName,
        periodFrom: dto.periodFrom,
        periodTo: dto.periodTo,
        eligibleItemCount: items.length,
        summary: {
          grossAmount: Number(grossAmount.toFixed(2)),
          commissionAmount: Number(commissionAmount.toFixed(2)),
          refundDeductions: 0.0,
          adjustmentAmount: 0.0,
          netSettlementAmount: Number(netSettlementAmount.toFixed(2)),
          currency: 'INR',
        },
        items: breakdown,
      },
      message: 'Settlement preview calculated successfully',
    };
  }

  // ================= 2. CREATE SETTLEMENT =================

  async createSettlement(
    adminUserId: string,
    dto: CreateSettlementDto,
  ): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: dto.sellerId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const items = await this.fetchEligibleOrderItems(
      dto.sellerId,
      dto.periodFrom,
      dto.periodTo,
    );

    if (items.length === 0) {
      throw new BadRequestException(
        'No eligible delivered order items found for this seller in the specified period',
      );
    }

    let grossAmount = 0;
    let commissionAmount = 0;
    let netSettlementAmount = 0;

    const settlementItemsData = items.map((item) => {
      const gross = Number(item.totalAmount);
      const commRate = Number(item.commissionRate);
      const comm = Number(item.commissionAmount);
      const net = Number(item.sellerEarnings);

      grossAmount += gross;
      commissionAmount += comm;
      netSettlementAmount += net;

      return {
        orderItemId: item.id,
        sellerId: seller.id,
        grossAmount: new Decimal(gross),
        commissionRate: new Decimal(commRate),
        commissionAmount: new Decimal(comm),
        refundAmount: new Decimal(0.0),
        adjustmentAmount: new Decimal(0.0),
        netAmount: new Decimal(net),
      };
    });

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const settlementNumber = `SET-${dateStr}-${randSuffix}`;

    const settlement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.settlement.create({
        data: {
          settlementNumber,
          sellerId: seller.id,
          periodFrom: new Date(dto.periodFrom),
          periodTo: new Date(dto.periodTo),
          grossAmount: new Decimal(grossAmount.toFixed(2)),
          commissionAmount: new Decimal(commissionAmount.toFixed(2)),
          refundDeductions: new Decimal(0.0),
          adjustmentAmount: new Decimal(0.0),
          netSettlementAmount: new Decimal(netSettlementAmount.toFixed(2)),
          currency: 'INR',
          status: SettlementStatus.PENDING,
          bankSnapshot: (seller.payoutDetails as any) || undefined,
          items: {
            create: settlementItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      return created;
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SETTLEMENT_CREATED',
      resourceType: 'Settlement',
      resourceId: settlement.id,
      newValue: {
        settlementNumber,
        sellerId: seller.id,
        itemCount: items.length,
        netSettlementAmount: Number(netSettlementAmount.toFixed(2)),
      },
    });

    return {
      success: true,
      data: settlement,
      message: 'Settlement created successfully in PENDING status',
    };
  }

  // ================= 3. PROCESS PAYOUT =================

  async processPayout(
    adminUserId: string,
    settlementId: string,
    dto: ProcessPayoutDto,
  ): Promise<any> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    if (settlement.status === SettlementStatus.COMPLETED) {
      throw new BadRequestException('Settlement payout has already been completed');
    }

    if (settlement.status !== SettlementStatus.PENDING && settlement.status !== SettlementStatus.PROCESSING) {
      throw new BadRequestException(
        `Cannot process payout for settlement in '${settlement.status}' status`,
      );
    }

    const updated = await this.prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.COMPLETED,
        payoutMethod: dto.payoutMethod,
        payoutReference: dto.payoutReference.trim(),
        payoutNotes: dto.payoutNotes?.trim() || null,
        processedById: adminUserId,
        processedAt: new Date(),
      },
      include: {
        items: true,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SETTLEMENT_PAYOUT_PROCESSED',
      resourceType: 'Settlement',
      resourceId: settlementId,
      previousValue: { status: settlement.status },
      newValue: {
        status: SettlementStatus.COMPLETED,
        payoutReference: dto.payoutReference,
        payoutMethod: dto.payoutMethod,
      },
    });

    return {
      success: true,
      data: updated,
      message: 'Settlement payout processed and marked COMPLETED successfully',
    };
  }

  async retryPayout(
    adminUserId: string,
    settlementId: string,
    dto: RetryPayoutDto,
  ): Promise<any> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    if (settlement.status === SettlementStatus.COMPLETED) {
      throw new BadRequestException('Settlement is already completed');
    }

    const updated = await this.prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.COMPLETED,
        payoutMethod: dto.payoutMethod,
        payoutReference: dto.payoutReference.trim(),
        payoutNotes: dto.payoutNotes?.trim() || null,
        processedById: adminUserId,
        processedAt: new Date(),
      },
      include: {
        items: true,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SETTLEMENT_PAYOUT_RETRIED',
      resourceType: 'Settlement',
      resourceId: settlementId,
      newValue: {
        status: SettlementStatus.COMPLETED,
        payoutReference: dto.payoutReference,
      },
    });

    return {
      success: true,
      data: updated,
      message: 'Settlement payout retried and marked COMPLETED successfully',
    };
  }

  // ================= 4. LOOKUPS & REPORTS =================

  async getSellerSettlements(
    userId: string,
    query: SettlementQueryDto,
  ): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = { sellerId: seller.id };
    if (query.status) whereClause.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
        },
      }),
      this.prisma.settlement.count({ where: whereClause }),
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
      message: 'Seller settlements retrieved successfully',
    };
  }

  async getSellerSettlementById(
    userId: string,
    settlementId: string,
  ): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        items: {
          include: {
            orderItem: {
              include: {
                order: { select: { orderNumber: true, createdAt: true } },
              },
            },
          },
        },
      },
    });

    if (!settlement || settlement.sellerId !== seller.id) {
      throw new NotFoundException('Settlement not found');
    }

    return {
      success: true,
      data: settlement,
      message: 'Settlement details retrieved successfully',
    };
  }

  async getAdminSettlements(query: SettlementQueryDto): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (query.status) whereClause.status = query.status;
    if (query.sellerId) whereClause.sellerId = query.sellerId;

    const [items, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { id: true, displayName: true, businessName: true } },
          items: true,
        },
      }),
      this.prisma.settlement.count({ where: whereClause }),
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
      message: 'Admin settlements retrieved successfully',
    };
  }

  async getAdminSettlementById(settlementId: string): Promise<any> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        seller: true,
        items: {
          include: {
            orderItem: {
              include: {
                order: { select: { orderNumber: true, createdAt: true } },
              },
            },
          },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    return {
      success: true,
      data: settlement,
      message: 'Settlement details retrieved successfully',
    };
  }

  async generateSettlementReport(
    userId: string,
    settlementId: string,
    roleName: string,
  ): Promise<any> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        seller: true,
        items: {
          include: {
            orderItem: {
              include: {
                order: true,
              },
            },
          },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    if (roleName !== 'SUPER_ADMIN') {
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { userId },
      });
      if (!seller || settlement.sellerId !== seller.id) {
        throw new ForbiddenException('You are not authorized to download this settlement report');
      }
    }

    const rows = settlement.items.map((item) => ({
      settlementNumber: settlement.settlementNumber,
      orderNumber: item.orderItem.order.orderNumber,
      productName: item.orderItem.productName,
      sku: item.orderItem.sku,
      unitPrice: Number(item.orderItem.unitPrice),
      quantity: item.orderItem.quantity,
      grossAmount: Number(item.grossAmount),
      commissionRate: Number(item.commissionRate),
      commissionAmount: Number(item.commissionAmount),
      netAmount: Number(item.netAmount),
      deliveredAt: item.orderItem.deliveredAt,
    }));

    return {
      success: true,
      data: {
        settlementNumber: settlement.settlementNumber,
        sellerName: settlement.seller.displayName || settlement.seller.businessName,
        periodFrom: settlement.periodFrom,
        periodTo: settlement.periodTo,
        status: settlement.status,
        payoutMethod: settlement.payoutMethod,
        payoutReference: settlement.payoutReference,
        payoutNotes: settlement.payoutNotes,
        summary: {
          grossAmount: Number(settlement.grossAmount),
          commissionAmount: Number(settlement.commissionAmount),
          refundDeductions: Number(settlement.refundDeductions),
          netSettlementAmount: Number(settlement.netSettlementAmount),
          currency: settlement.currency,
        },
        items: rows,
      },
      message: 'Settlement report generated successfully',
    };
  }
}
