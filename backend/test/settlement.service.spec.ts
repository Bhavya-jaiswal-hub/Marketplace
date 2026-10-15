import { Test, TestingModule } from '@nestjs/testing';
import { SettlementService } from '../src/settlement/settlement.service';
import { PrismaService } from '../src/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  OrderItemStatus,
  SettlementBatchStatus,
  SettlementItemStatus,
  SettlementPayoutMethod,
  AdjustmentType,
  LedgerDirection,
  AdjustmentStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('SettlementService (SRS v1.2 Settlement Engine & Debit Ledger)', () => {
  let service: SettlementService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(async () => {
    mockPrisma = {
      sellerProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      orderItem: {
        findMany: jest.fn(),
      },
      settlement: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      settlementItem: {
        updateMany: jest.fn(),
      },
      sellerAdjustment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
    };

    mockAudit = {
      logAction: jest.fn().mockResolvedValue({ id: 'audit-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<SettlementService>(SettlementService);
  });

  const adminUserId = 'admin-user-1';
  const sellerId = 'seller-prof-1';
  const periodFrom = '2026-09-01T00:00:00.000Z';
  const periodTo = '2026-09-30T23:59:59.000Z';

  describe('previewSettlement', () => {
    it('should preview settlement calculating only items older than 7 days holding period and deduct pending debits', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({
        id: sellerId,
        displayName: 'Vanguard Apparel',
      });

      const eligibleDeliveredAt = new Date('2026-09-10T10:00:00.000Z'); // > 7 days
      const recentDeliveredAt = new Date('2026-09-28T10:00:00.000Z'); // < 7 days from periodTo

      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          sellerId,
          orderId: 'ord-1',
          productName: 'Cotton Crew T-Shirt',
          sku: 'TS-BLK-M',
          quantity: 2,
          unitPrice: new Decimal(500.0),
          totalAmount: new Decimal(1000.0),
          commissionRate: new Decimal(10.0),
          commissionAmount: new Decimal(100.0),
          shippingFeeShare: new Decimal(0.0),
          sellerEarnings: new Decimal(900.0),
          status: OrderItemStatus.DELIVERED,
          deliveredAt: eligibleDeliveredAt,
          createdAt: new Date('2026-09-05T00:00:00.000Z'),
          order: { orderNumber: 'ORD-101' },
          returnRequests: [],
          refunds: [],
          settlementItem: null,
          seller: { user: { role: { name: 'SELLER' } } },
        },
        {
          id: 'item-2',
          sellerId,
          orderId: 'ord-2',
          productName: 'Slim Denim Jeans',
          sku: 'JN-BLU-32',
          quantity: 1,
          unitPrice: new Decimal(2000.0),
          totalAmount: new Decimal(2000.0),
          commissionRate: new Decimal(10.0),
          commissionAmount: new Decimal(200.0),
          shippingFeeShare: new Decimal(0.0),
          sellerEarnings: new Decimal(1800.0),
          status: OrderItemStatus.DELIVERED,
          deliveredAt: recentDeliveredAt, // Not eligible (< 7 days)
          createdAt: new Date('2026-09-25T00:00:00.000Z'),
          order: { orderNumber: 'ORD-102' },
          returnRequests: [],
          refunds: [],
          settlementItem: null,
          seller: { user: { role: { name: 'SELLER' } } },
        },
        {
          id: 'item-3',
          sellerId,
          orderId: 'ord-3',
          productName: 'Linen Shirt',
          sku: 'SH-WHT-L',
          quantity: 1,
          unitPrice: new Decimal(1500.0),
          totalAmount: new Decimal(1500.0),
          commissionRate: new Decimal(10.0),
          commissionAmount: new Decimal(150.0),
          shippingFeeShare: new Decimal(0.0),
          sellerEarnings: new Decimal(1350.0),
          status: OrderItemStatus.DELIVERED,
          deliveredAt: eligibleDeliveredAt,
          createdAt: new Date('2026-09-08T00:00:00.000Z'),
          order: { orderNumber: 'ORD-103' },
          returnRequests: [{ id: 'ret-1', status: 'REQUESTED' }], // Open return blocks!
          refunds: [],
          settlementItem: null,
          seller: { user: { role: { name: 'SELLER' } } },
        },
      ]);

      mockPrisma.sellerAdjustment.findMany.mockResolvedValue([
        {
          id: 'adj-1',
          sellerId,
          amount: new Decimal(150.0),
          direction: LedgerDirection.DEBIT,
          status: AdjustmentStatus.PENDING,
          isWrittenOff: false,
        },
      ]);

      const res = await service.previewSettlement(adminUserId, {
        sellerId,
        periodFrom,
        periodTo,
      });

      expect(res.success).toBe(true);
      expect(res.data.eligibleItemCount).toBe(1);
      expect(res.data.grossProductSales).toBe(1000.0);
      expect(res.data.totalPlatformCommission).toBe(100.0);
      expect(res.data.previousBalanceAdjustment).toBe(150.0);
      // Net = 1000 - 100 - 150 = 750
      expect(res.data.netCalculatedAmount).toBe(750.0);
      expect(res.data.payoutAmount).toBe(750.0);
      expect(res.data.carriedForwardDebitBalance).toBe(0.0);
    });

    it('should floor negative net calculation at ₹0.00 and preview carried forward debit balance', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({
        id: sellerId,
        displayName: 'Vanguard Apparel',
      });

      const eligibleDeliveredAt = new Date('2026-09-10T10:00:00.000Z');
      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          sellerId,
          orderId: 'ord-1',
          totalAmount: new Decimal(500.0),
          commissionRate: new Decimal(10.0),
          commissionAmount: new Decimal(50.0),
          shippingFeeShare: new Decimal(0.0),
          sellerEarnings: new Decimal(450.0),
          status: OrderItemStatus.DELIVERED,
          deliveredAt: eligibleDeliveredAt,
          createdAt: new Date('2026-09-05T00:00:00.000Z'),
          order: { orderNumber: 'ORD-101' },
          returnRequests: [],
          refunds: [],
          settlementItem: null,
          seller: { user: { role: { name: 'SELLER' } } },
        },
      ]);

      // Seller has heavy debit of 800 from dispute/shortfall
      mockPrisma.sellerAdjustment.findMany.mockResolvedValue([
        {
          id: 'adj-heavy',
          sellerId,
          amount: new Decimal(800.0),
          direction: LedgerDirection.DEBIT,
          status: AdjustmentStatus.PENDING,
          isWrittenOff: false,
        },
      ]);

      const res = await service.previewSettlement(adminUserId, {
        sellerId,
        periodFrom,
        periodTo,
      });

      expect(res.success).toBe(true);
      // Net = 500 - 50 - 800 = -350
      expect(res.data.netCalculatedAmount).toBe(-350.0);
      expect(res.data.payoutAmount).toBe(0.0);
      expect(res.data.carriedForwardDebitBalance).toBe(350.0);
    });
  });

  describe('createSettlement (Batch Generation)', () => {
    it('should create settlement batch in GENERATED status and mark applied adjustments', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({
        id: sellerId,
        displayName: 'Vanguard Apparel',
        payoutDetails: {
          bankName: 'HDFC Bank',
          accountNumber: '1234567890',
          ifscCode: 'HDFC0001234',
        },
      });

      const eligibleDeliveredAt = new Date('2026-09-10T10:00:00.000Z');
      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          sellerId,
          orderId: 'ord-1',
          totalAmount: new Decimal(1000.0),
          commissionRate: new Decimal(10.0),
          commissionAmount: new Decimal(100.0),
          shippingFeeShare: new Decimal(0.0),
          sellerEarnings: new Decimal(900.0),
          status: OrderItemStatus.DELIVERED,
          deliveredAt: eligibleDeliveredAt,
          createdAt: new Date('2026-09-05T00:00:00.000Z'),
          order: { orderNumber: 'ORD-101' },
          returnRequests: [],
          refunds: [],
          settlementItem: null,
          seller: { user: { role: { name: 'SELLER' } } },
        },
      ]);

      mockPrisma.sellerAdjustment.findMany.mockResolvedValue([
        {
          id: 'adj-prev-1',
          sellerId,
          amount: new Decimal(100.0),
          direction: LedgerDirection.DEBIT,
          status: AdjustmentStatus.PENDING,
          isWrittenOff: false,
        },
      ]);

      mockPrisma.settlement.create.mockResolvedValue({
        id: 'set-1',
        settlementNumber: 'SET-20260930-1001',
        sellerId,
        grossAmount: new Decimal(1000.0),
        commissionAmount: new Decimal(100.0),
        netSettlementAmount: new Decimal(800.0),
        status: SettlementBatchStatus.GENERATED,
        items: [{ id: 'si-1', orderItemId: 'item-1' }],
      });

      const res = await service.createSettlement(adminUserId, {
        sellerId,
        periodFrom,
        periodTo,
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(SettlementBatchStatus.GENERATED);
      expect(mockPrisma.sellerAdjustment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'adj-prev-1' },
          data: expect.objectContaining({
            status: AdjustmentStatus.APPLIED,
            appliedInSettlementId: 'set-1',
          }),
        }),
      );
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SETTLEMENT_CREATED' }),
      );
    });

    it('should floor payout at ₹0.00 and record SETTLEMENT_SHORTFALL_DEBIT when net calculation < 0', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({
        id: sellerId,
        displayName: 'Vanguard Apparel',
      });

      const eligibleDeliveredAt = new Date('2026-09-10T10:00:00.000Z');
      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          sellerId,
          orderId: 'ord-1',
          totalAmount: new Decimal(500.0),
          commissionRate: new Decimal(10.0),
          commissionAmount: new Decimal(50.0),
          shippingFeeShare: new Decimal(0.0),
          sellerEarnings: new Decimal(450.0),
          status: OrderItemStatus.DELIVERED,
          deliveredAt: eligibleDeliveredAt,
          createdAt: new Date('2026-09-05T00:00:00.000Z'),
          order: { orderNumber: 'ORD-101' },
          returnRequests: [],
          refunds: [],
          settlementItem: null,
          seller: { user: { role: { name: 'SELLER' } } },
        },
      ]);

      mockPrisma.sellerAdjustment.findMany.mockResolvedValue([
        {
          id: 'adj-prev-2',
          sellerId,
          amount: new Decimal(700.0),
          direction: LedgerDirection.DEBIT,
          status: AdjustmentStatus.PENDING,
          isWrittenOff: false,
        },
      ]);

      mockPrisma.settlement.create.mockResolvedValue({
        id: 'set-2',
        settlementNumber: 'SET-20260930-1002',
        sellerId,
        grossAmount: new Decimal(500.0),
        commissionAmount: new Decimal(50.0),
        netSettlementAmount: new Decimal(0.0),
        status: SettlementBatchStatus.GENERATED,
        items: [{ id: 'si-2', orderItemId: 'item-1' }],
      });

      const res = await service.createSettlement(adminUserId, {
        sellerId,
        periodFrom,
        periodTo,
      });

      expect(res.success).toBe(true);
      // Payout is floored at 0
      expect(mockPrisma.settlement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            netSettlementAmount: new Decimal(0.0),
          }),
        }),
      );
      // Shortfall of 250 (500 - 50 - 700 = -250) recorded as new debit
      expect(mockPrisma.sellerAdjustment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sellerId,
            type: AdjustmentType.SETTLEMENT_SHORTFALL_DEBIT,
            amount: new Decimal(250.0),
            direction: LedgerDirection.DEBIT,
            status: AdjustmentStatus.PENDING,
            originatingSettlementId: 'set-2',
          }),
        }),
      );
    });
  });

  describe('confirmPayout (Immutability & External Reference)', () => {
    it('should confirm payout with external bank reference and lock settlement and items to SETTLED', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({
        id: 'set-1',
        status: SettlementBatchStatus.GENERATED,
        netSettlementAmount: new Decimal(800.0),
        payoutMethod: SettlementPayoutMethod.BANK_TRANSFER,
      });

      mockPrisma.settlement.update.mockResolvedValue({
        id: 'set-1',
        status: SettlementBatchStatus.SETTLED,
        payoutReference: 'HDFC-NEFT-998811',
      });

      const res = await service.confirmPayout(adminUserId, 'set-1', {
        bankTransactionReference: 'HDFC-NEFT-998811',
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(SettlementBatchStatus.SETTLED);
      expect(mockPrisma.settlementItem.updateMany).toHaveBeenCalledWith({
        where: { settlementId: 'set-1' },
        data: { status: SettlementItemStatus.SETTLED },
      });
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SETTLEMENT_SETTLED' }),
      );
    });

    it('should reject confirmPayout without bank reference if payout > 0', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({
        id: 'set-1',
        status: SettlementBatchStatus.GENERATED,
        netSettlementAmount: new Decimal(800.0),
      });

      await expect(
        service.confirmPayout(adminUserId, 'set-1', {
          bankTransactionReference: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject modifying an already SETTLED immutable settlement', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({
        id: 'set-1',
        status: SettlementBatchStatus.SETTLED,
        netSettlementAmount: new Decimal(800.0),
      });

      await expect(
        service.confirmPayout(adminUserId, 'set-1', {
          bankTransactionReference: 'ANOTHER-REF',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('writeOffAdjustment (Admin Waiver)', () => {
    it('should write off an active seller debit with mandatory audit reason', async () => {
      mockPrisma.sellerAdjustment.findUnique.mockResolvedValue({
        id: 'adj-1',
        sellerId,
        amount: new Decimal(350.0),
        direction: LedgerDirection.DEBIT,
        status: AdjustmentStatus.PENDING,
        isWrittenOff: false,
      });

      mockPrisma.sellerAdjustment.update.mockResolvedValue({
        id: 'adj-1',
        isWrittenOff: true,
        writtenOffReason: 'Admin waiver: courier warehouse fire destruction',
        status: AdjustmentStatus.WRITTEN_OFF,
      });

      const res = await service.writeOffAdjustment(adminUserId, 'adj-1', {
        reason: 'Admin waiver: courier warehouse fire destruction',
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(AdjustmentStatus.WRITTEN_OFF);
      expect(res.data.isWrittenOff).toBe(true);
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SELLER_ADJUSTMENT_WRITTEN_OFF' }),
      );
    });

    it('should reject write-off with empty reason', async () => {
      await expect(
        service.writeOffAdjustment(adminUserId, 'adj-1', {
          reason: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
