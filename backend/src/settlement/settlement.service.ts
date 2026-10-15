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
  RunSettlementDto,
  ProcessPayoutDto,
  ConfirmPayoutDto,
  RetryPayoutDto,
  WriteOffAdjustmentDto,
  SettlementQueryDto,
} from './dto';
import {
  SettlementBatchStatus,
  SettlementItemStatus,
  SettlementPayoutMethod,
  OrderItemStatus,
  ReturnRequestStatus,
  RefundStatus,
  DisputeStatus,
  AdjustmentType,
  LedgerDirection,
  AdjustmentStatus,
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

  async fetchEligibleOrderItems(
    sellerId: string,
    periodFromStr?: string,
    periodToStr?: string,
    txClient?: any,
  ): Promise<any[]> {
    const prisma = txClient || this.prisma;

    const periodFrom = periodFromStr ? new Date(periodFromStr) : new Date(0);
    const periodTo = periodToStr ? new Date(periodToStr) : new Date();

    if (isNaN(periodFrom.getTime()) || isNaN(periodTo.getTime())) {
      throw new BadRequestException('Invalid settlement period dates');
    }

    if (periodFrom >= periodTo) {
      throw new BadRequestException('periodFrom must be earlier than periodTo');
    }

    // 7-day holding period cutoff: strictly delivered >= 168 hours ago (7 calendar days)
    const sevenDaysMs = 168 * 60 * 60 * 1000;
    const holdingCutoff = new Date(periodTo.getTime());

    // Fetch candidate delivered items for this seller
    const candidateItems = await prisma.orderItem.findMany({
      where: {
        sellerId,
        status: OrderItemStatus.DELIVERED,
        createdAt: {
          gte: periodFrom,
          lte: periodTo,
        },
      },
      include: {
        order: true,
        seller: { include: { user: { include: { role: true } } } },
        returnRequests: true,
        refunds: true,
        settlementItem: { include: { settlement: true } },
      },
    });

    const eligibleItems = candidateItems.filter((item: any) => {
      // 1. Exclude Super Admin direct sales (0% commission, direct platform revenue)
      if (item.seller?.user?.role?.name === 'SUPER_ADMIN') {
        return false;
      }

      // 2. Must have deliveredAt
      if (!item.deliveredAt) return false;

      // 3. Must satisfy 7-day holding period strictly (> 168 hours)
      const deliveredTime = new Date(item.deliveredAt).getTime();
      if (deliveredTime + sevenDaysMs > holdingCutoff.getTime()) {
        return false;
      }

      // 4. Must not already be settled or in an active settlement batch
      if (item.settlementItem) {
        const batchStatus = item.settlementItem.settlement?.status;
        if (
          item.settlementItem.status === SettlementItemStatus.SETTLED ||
          batchStatus === SettlementBatchStatus.GENERATED ||
          batchStatus === SettlementBatchStatus.APPROVED ||
          batchStatus === SettlementBatchStatus.SETTLED ||
          !batchStatus
        ) {
          return false;
        }
      }

      // 5. Must not have open/active return requests (REQUESTED, APPROVED, IN_TRANSIT, RECEIVED, VERIFIED, REJECTED_ON_INSPECTION)
      const hasOpenReturn = item.returnRequests.some(
        (r: any) =>
          r.status !== ReturnRequestStatus.REJECTED &&
          r.status !== ReturnRequestStatus.REFUNDED,
      );
      if (hasOpenReturn) return false;

      // 6. Must not have active "Not received" dispute
      if (
        item.status === OrderItemStatus.NOT_RECEIVED_UNDER_DISPUTE ||
        item.disputeStatus === DisputeStatus.OPEN
      ) {
        return false;
      }

      // 7. Must not have pending refunds
      const hasBlockingRefund = item.refunds.some(
        (rf: any) =>
          rf.status === RefundStatus.PENDING ||
          rf.status === RefundStatus.PROCESSING,
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
    const periodFrom = dto.periodFrom || '2026-09-01T00:00:00.000Z';
    const periodTo = dto.periodTo || new Date().toISOString();

    let targetSellers: any[] = [];
    if (dto.sellerId) {
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { id: dto.sellerId },
      });
      if (!seller) {
        throw new NotFoundException('Seller profile not found');
      }
      targetSellers = [seller];
    } else {
      targetSellers = await this.prisma.sellerProfile.findMany({
        where: {
          user: { role: { name: { not: 'SUPER_ADMIN' } } },
        },
      });
    }

    const sellerSummaries: any[] = [];

    for (const seller of targetSellers) {
      const items = await this.fetchEligibleOrderItems(
        seller.id,
        periodFrom,
        periodTo,
      );

      // Fetch pending adjustments for this seller
      const pendingAdjustments = await this.prisma.sellerAdjustment.findMany({
        where: {
          sellerId: seller.id,
          status: AdjustmentStatus.PENDING,
          isWrittenOff: false,
        },
      });

      const previousDebits = pendingAdjustments
        .filter((a) => a.direction === LedgerDirection.DEBIT)
        .reduce((sum, a) => sum + Number(a.amount), 0);
      const previousCredits = pendingAdjustments
        .filter((a) => a.direction === LedgerDirection.CREDIT)
        .reduce((sum, a) => sum + Number(a.amount), 0);
      const previousBalanceAdjustment = Number((previousDebits - previousCredits).toFixed(2));

      let grossProductSales = 0;
      let totalPlatformCommission = 0;
      let totalShippingCollected = 0;
      let netItemEarnings = 0;

      const breakdown = items.map((item) => {
        const gross = Number(item.totalAmount);
        const commRate = Number(item.commissionRate);
        const comm = Number(item.commissionAmount);
        const shippingFee = Number(item.shippingFeeShare || 0);
        const net = Number(item.sellerEarnings);

        grossProductSales += gross;
        totalPlatformCommission += comm;
        totalShippingCollected += shippingFee;
        netItemEarnings += net;

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
          shippingFeeShare: shippingFee,
          netAmount: net,
          deliveredAt: item.deliveredAt,
        };
      });

      // Net calculated amount = Gross + Shipping - Commission - Return Deductions - Carried Debits
      const netCalculatedAmount = Number(
        (grossProductSales + totalShippingCollected - totalPlatformCommission - previousBalanceAdjustment).toFixed(2),
      );

      // Floor at ₹0.00: negative balance never produces negative payout
      const payoutAmount = Math.max(0, netCalculatedAmount);
      const carriedForwardDebitBalance = netCalculatedAmount < 0 ? Math.abs(netCalculatedAmount) : 0;

      sellerSummaries.push({
        sellerId: seller.id,
        sellerName: seller.displayName || seller.businessName,
        periodFrom,
        periodTo,
        eligibleItemCount: items.length,
        grossProductSales: Number(grossProductSales.toFixed(2)),
        totalShippingCollected: Number(totalShippingCollected.toFixed(2)),
        totalPlatformCommission: Number(totalPlatformCommission.toFixed(2)),
        totalReturnAdjustments: 0.0,
        totalSellerFaultReturnShipping: 0.0,
        previousBalanceAdjustment: Number(previousBalanceAdjustment.toFixed(2)),
        netCalculatedAmount,
        payoutAmount,
        carriedForwardDebitBalance,
        summary: {
          grossAmount: Number(grossProductSales.toFixed(2)),
          commissionAmount: Number(totalPlatformCommission.toFixed(2)),
          refundDeductions: 0.0,
          adjustmentAmount: Number(previousBalanceAdjustment.toFixed(2)),
          netSettlementAmount: payoutAmount,
          currency: 'INR',
        },
        items: breakdown,
      });
    }

    if (dto.sellerId && sellerSummaries.length > 0) {
      return {
        success: true,
        data: sellerSummaries[0],
        message: 'Settlement preview calculated successfully',
      };
    }

    return {
      success: true,
      data: {
        sellers: sellerSummaries,
      },
      message: 'Settlement preview compiled successfully',
    };
  }

  // ================= 2. EXECUTE SETTLEMENT =================

  async createSettlement(
    adminUserId: string,
    dto: CreateSettlementDto,
  ): Promise<any> {
    const periodFrom = dto.periodFrom || '2026-09-01T00:00:00.000Z';
    const periodTo = dto.periodTo || new Date().toISOString();

    let targetSellers: any[] = [];
    if (dto.sellerId) {
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { id: dto.sellerId },
      });
      if (!seller) {
        throw new NotFoundException('Seller profile not found');
      }
      targetSellers = [seller];
    } else {
      targetSellers = await this.prisma.sellerProfile.findMany({
        where: {
          user: { role: { name: { not: 'SUPER_ADMIN' } } },
        },
      });
    }

    const createdSettlements: any[] = [];

    for (const seller of targetSellers) {
      // Execute atomically in a transaction to prevent race conditions with open returns/disputes
      const settlement = await this.prisma.$transaction(async (tx) => {
        const items = await this.fetchEligibleOrderItems(
          seller.id,
          periodFrom,
          periodTo,
          tx,
        );

        if (items.length === 0) {
          if (dto.sellerId) {
            throw new BadRequestException(
              'No eligible delivered order items found for this seller in the specified period',
            );
          }
          return null;
        }

        // Fetch candidate active debits from SellerAdjustment
        const pendingAdjustments = await tx.sellerAdjustment.findMany({
          where: {
            sellerId: seller.id,
            status: AdjustmentStatus.PENDING,
            isWrittenOff: false,
          },
        });

        const previousDebits = pendingAdjustments
          .filter((a: any) => a.direction === LedgerDirection.DEBIT)
          .reduce((sum: number, a: any) => sum + Number(a.amount), 0);
        const previousCredits = pendingAdjustments
          .filter((a: any) => a.direction === LedgerDirection.CREDIT)
          .reduce((sum: number, a: any) => sum + Number(a.amount), 0);
        const previousBalanceAdjustment = Number((previousDebits - previousCredits).toFixed(2));

        let grossProductSales = 0;
        let totalPlatformCommission = 0;
        let totalShippingCollected = 0;
        let netItemEarnings = 0;

        const settlementItemsData = items.map((item: any) => {
          const gross = Number(item.totalAmount);
          const commRate = Number(item.commissionRate);
          const comm = Number(item.commissionAmount);
          const shippingFee = Number(item.shippingFeeShare || 0);
          const net = Number(item.sellerEarnings);

          grossProductSales += gross;
          totalPlatformCommission += comm;
          totalShippingCollected += shippingFee;
          netItemEarnings += net;

          return {
            orderItemId: item.id,
            sellerId: seller.id,
            grossAmount: new Decimal(gross),
            commissionRate: new Decimal(commRate),
            commissionAmount: new Decimal(comm),
            refundAmount: new Decimal(0.0),
            adjustmentAmount: new Decimal(0.0),
            netAmount: new Decimal(net),
            status: SettlementItemStatus.ELIGIBLE,
          };
        });

        const netCalculatedAmount = Number(
          (grossProductSales + totalShippingCollected - totalPlatformCommission - previousBalanceAdjustment).toFixed(2),
        );

        // Negative Settlement Balance Handling:
        // If Net Payable < 0, payout is ₹0.00 and shortfall is recorded as a new SETTLEMENT_SHORTFALL_DEBIT in SellerAdjustment
        const payoutAmount = Math.max(0, netCalculatedAmount);
        const shortfallAmount = netCalculatedAmount < 0 ? Math.abs(netCalculatedAmount) : 0;

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randSuffix = Math.floor(1000 + Math.random() * 9000);
        const settlementNumber = `SET-${dateStr}-${randSuffix}`;

        const created = await tx.settlement.create({
          data: {
            settlementNumber,
            sellerId: seller.id,
            periodFrom: new Date(periodFrom),
            periodTo: new Date(periodTo),
            grossAmount: new Decimal(grossProductSales.toFixed(2)),
            commissionAmount: new Decimal(totalPlatformCommission.toFixed(2)),
            refundDeductions: new Decimal(0.0),
            adjustmentAmount: new Decimal(previousBalanceAdjustment.toFixed(2)),
            netSettlementAmount: new Decimal(payoutAmount.toFixed(2)),
            currency: 'INR',
            status: SettlementBatchStatus.GENERATED,
            payoutMethod: SettlementPayoutMethod.BANK_TRANSFER,
            bankSnapshot: (seller.payoutDetails as any) || undefined,
            items: {
              create: settlementItemsData,
            },
          },
          include: {
            items: true,
          },
        });

        // Link and transition applied adjustments to this settlement
        if (pendingAdjustments.length > 0) {
          for (const adj of pendingAdjustments) {
            await tx.sellerAdjustment.update({
              where: { id: adj.id },
              data: {
                appliedInSettlementId: created.id,
                appliedAt: new Date(),
                status: AdjustmentStatus.APPLIED,
              },
            });
          }
        }

        // If there was a shortfall (net < 0), record the new carried-forward debit
        if (shortfallAmount > 0) {
          await tx.sellerAdjustment.create({
            data: {
              sellerId: seller.id,
              type: AdjustmentType.SETTLEMENT_SHORTFALL_DEBIT,
              amount: new Decimal(shortfallAmount),
              direction: LedgerDirection.DEBIT,
              status: AdjustmentStatus.PENDING,
              reason: `Settlement shortfall carried forward from settlement ${settlementNumber}`,
              originatingSettlementId: created.id,
            },
          });
        }

        return created;
      });

      if (settlement) {
        createdSettlements.push(settlement);
        await this.auditService.logAction({
          userId: adminUserId,
          action: 'SETTLEMENT_CREATED',
          resourceType: 'Settlement',
          resourceId: settlement.id,
          newValue: {
            settlementNumber: settlement.settlementNumber,
            sellerId: seller.id,
            netSettlementAmount: Number(settlement.netSettlementAmount),
            status: settlement.status,
          },
        });
      }
    }

    if (dto.sellerId && createdSettlements.length > 0) {
      return {
        success: true,
        data: createdSettlements[0],
        message: 'Settlement created successfully in GENERATED status',
      };
    }

    return {
      success: true,
      data: {
        settlements: createdSettlements,
      },
      message: `Batch settlement created successfully (${createdSettlements.length} sellers processed)`,
    };
  }

  // ================= 3. CONFIRM EXTERNAL PAYOUT & IMMUTABILITY =================

  async confirmPayout(
    adminUserId: string,
    settlementId: string,
    dto: ConfirmPayoutDto,
  ): Promise<any> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { items: true },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    if (settlement.status === SettlementBatchStatus.SETTLED) {
      throw new BadRequestException('Settlement payout has already been locked and settled');
    }

    if (settlement.status === SettlementBatchStatus.CANCELLED) {
      throw new BadRequestException('Cannot confirm payout on a cancelled settlement batch');
    }

    const reference = dto.bankTransactionReference?.trim() || dto.payoutReference?.trim();
    const payoutAmount = Number(settlement.netSettlementAmount);

    if (payoutAmount > 0 && !reference) {
      throw new BadRequestException(
        'A mandatory external bank/UPI transaction reference number is required when payout amount > 0',
      );
    }

    const finalReference = reference || 'ZERO_PAYOUT_NET_SHORTFALL';

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Lock Settlement record to SETTLED
      const settled = await tx.settlement.update({
        where: { id: settlementId },
        data: {
          status: SettlementBatchStatus.SETTLED,
          payoutReference: finalReference,
          payoutMethod: dto.payoutMethod || settlement.payoutMethod,
          payoutNotes: dto.payoutNotes?.trim() || settlement.payoutNotes,
          processedById: adminUserId,
          processedAt: new Date(),
        },
        include: { items: true },
      });

      // 2. Lock child SettlementItems to SETTLED
      await tx.settlementItem.updateMany({
        where: { settlementId },
        data: { status: SettlementItemStatus.SETTLED },
      });

      return settled;
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SETTLEMENT_SETTLED',
      resourceType: 'Settlement',
      resourceId: settlementId,
      previousValue: { status: settlement.status },
      newValue: {
        status: SettlementBatchStatus.SETTLED,
        payoutReference: finalReference,
      },
    });

    return {
      success: true,
      data: updated,
      message: 'Settlement payout confirmed and permanently locked as SETTLED',
    };
  }

  // Backward-compatible alias for processPayout
  async processPayout(
    adminUserId: string,
    settlementId: string,
    dto: ProcessPayoutDto,
  ): Promise<any> {
    return this.confirmPayout(adminUserId, settlementId, {
      bankTransactionReference: dto.bankTransactionReference || dto.payoutReference,
      payoutMethod: dto.payoutMethod,
      payoutNotes: dto.payoutNotes,
    });
  }

  async retryPayout(
    adminUserId: string,
    settlementId: string,
    dto: RetryPayoutDto,
  ): Promise<any> {
    return this.confirmPayout(adminUserId, settlementId, {
      bankTransactionReference: dto.bankTransactionReference || dto.payoutReference,
      payoutMethod: dto.payoutMethod,
      payoutNotes: dto.payoutNotes,
    });
  }

  async cancelSettlement(
    adminUserId: string,
    settlementId: string,
  ): Promise<any> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        appliedAdjustments: true,
        originatingAdjustments: true,
      },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    if (settlement.status === SettlementBatchStatus.SETTLED) {
      throw new BadRequestException('Cannot cancel an immutable settled record');
    }

    const cancelled = await this.prisma.$transaction(async (tx) => {
      // Revert applied adjustments back to PENDING
      if (settlement.appliedAdjustments.length > 0) {
        for (const adj of settlement.appliedAdjustments) {
          await tx.sellerAdjustment.update({
            where: { id: adj.id },
            data: {
              status: AdjustmentStatus.PENDING,
              appliedInSettlementId: null,
              appliedAt: null,
            },
          });
        }
      }

      // Cancel originating shortfall adjustment if any
      if (settlement.originatingAdjustments.length > 0) {
        for (const adj of settlement.originatingAdjustments) {
          await tx.sellerAdjustment.update({
            where: { id: adj.id },
            data: {
              status: AdjustmentStatus.CANCELLED,
            },
          });
        }
      }

      // Mark batch cancelled
      const updated = await tx.settlement.update({
        where: { id: settlementId },
        data: {
          status: SettlementBatchStatus.CANCELLED,
        },
      });

      // Release items by deleting settlement item links
      await tx.settlementItem.deleteMany({
        where: { settlementId },
      });

      return updated;
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SETTLEMENT_CANCELLED',
      resourceType: 'Settlement',
      resourceId: settlementId,
      newValue: { status: SettlementBatchStatus.CANCELLED },
    });

    return {
      success: true,
      data: cancelled,
      message: 'Settlement batch cancelled successfully and linked items released',
    };
  }

  // ================= 4. SELLER ADJUSTMENT DEBIT LEDGER =================

  async getSellerAdjustments(sellerId: string): Promise<any> {
    const adjustments = await this.prisma.sellerAdjustment.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        orderItem: { select: { id: true, productName: true, sku: true } },
        returnRequest: { select: { id: true, reason: true } },
      },
    });

    // Compute live debit balance strictly from active PENDING debits
    const activeDebits = adjustments
      .filter((a) => a.status === AdjustmentStatus.PENDING && a.direction === LedgerDirection.DEBIT && !a.isWrittenOff)
      .reduce((sum, a) => sum + Number(a.amount), 0);
    const activeCredits = adjustments
      .filter((a) => a.status === AdjustmentStatus.PENDING && a.direction === LedgerDirection.CREDIT && !a.isWrittenOff)
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const currentDebitBalance = Number((activeDebits - activeCredits).toFixed(2));

    return {
      success: true,
      data: {
        currentDebitBalance,
        adjustments,
      },
      message: 'Seller adjustment ledger retrieved successfully',
    };
  }

  async getMyAdjustments(userId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    return this.getSellerAdjustments(seller.id);
  }

  async writeOffAdjustment(
    adminUserId: string,
    adjustmentId: string,
    dto: WriteOffAdjustmentDto,
  ): Promise<any> {
    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException('A mandatory explanation must be provided when writing off a seller debit');
    }

    const adjustment = await this.prisma.sellerAdjustment.findUnique({
      where: { id: adjustmentId },
    });

    if (!adjustment) {
      throw new NotFoundException('Seller adjustment not found');
    }

    if (adjustment.isWrittenOff || adjustment.status === AdjustmentStatus.WRITTEN_OFF) {
      throw new BadRequestException('Adjustment has already been written off');
    }

    if (adjustment.status === AdjustmentStatus.APPLIED) {
      throw new BadRequestException('Cannot write off an already settled/applied adjustment');
    }

    const updated = await this.prisma.sellerAdjustment.update({
      where: { id: adjustmentId },
      data: {
        isWrittenOff: true,
        writtenOffById: adminUserId,
        writtenOffAt: new Date(),
        writtenOffReason: reason,
        status: AdjustmentStatus.WRITTEN_OFF,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SELLER_ADJUSTMENT_WRITTEN_OFF',
      resourceType: 'SellerAdjustment',
      resourceId: adjustmentId,
      previousValue: {
        status: adjustment.status,
        amount: Number(adjustment.amount),
      },
      newValue: {
        status: AdjustmentStatus.WRITTEN_OFF,
        writtenOffReason: reason,
      },
    });

    return {
      success: true,
      data: updated,
      message: 'Seller debit successfully written off by Super Admin',
    };
  }

  // ================= 5. LOOKUPS & REPORTS =================

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
          appliedAdjustments: true,
          originatingAdjustments: true,
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
        appliedAdjustments: true,
        originatingAdjustments: true,
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
          appliedAdjustments: true,
          originatingAdjustments: true,
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
        appliedAdjustments: true,
        originatingAdjustments: true,
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
        appliedAdjustments: true,
        originatingAdjustments: true,
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
          adjustmentAmount: Number(settlement.adjustmentAmount),
          netSettlementAmount: Number(settlement.netSettlementAmount),
          currency: settlement.currency,
        },
        items: rows,
        appliedAdjustments: settlement.appliedAdjustments,
        originatingAdjustments: settlement.originatingAdjustments,
      },
      message: 'Settlement report generated successfully',
    };
  }
}
