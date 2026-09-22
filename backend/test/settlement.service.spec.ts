import { Test, TestingModule } from '@nestjs/testing';
import { SettlementService } from '../src/settlement/settlement.service';
import { PrismaService } from '../src/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  OrderItemStatus,
  SettlementStatus,
  SettlementPayoutMethod,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('SettlementService', () => {
  let service: SettlementService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(async () => {
    mockPrisma = {
      sellerProfile: {
        findUnique: jest.fn(),
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

  describe('previewSettlement & createSettlement', () => {
    const adminUserId = 'admin-1';
    const sellerId = 'seller-1';
    const periodFrom = '2026-09-01T00:00:00.000Z';
    const periodTo = '2026-09-30T23:59:59.000Z';

    it('should preview settlement calculating only items older than 7 days holding period without blocking returns', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({
        id: sellerId,
        displayName: 'TechWorld',
      });

      const eligibleDeliveredAt = new Date('2026-09-10T10:00:00.000Z');
      const recentDeliveredAt = new Date('2026-09-28T10:00:00.000Z'); // less than 7 days from periodTo

      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          sellerId,
          orderId: 'ord-1',
          productName: 'Gaming Mouse',
          sku: 'GM-100',
          quantity: 1,
          unitPrice: new Decimal(1000.0),
          totalAmount: new Decimal(1000.0),
          commissionRate: new Decimal(10.0),
          commissionAmount: new Decimal(100.0),
          sellerEarnings: new Decimal(900.0),
          status: OrderItemStatus.DELIVERED,
          deliveredAt: eligibleDeliveredAt,
          createdAt: new Date('2026-09-05T00:00:00.000Z'),
          order: { orderNumber: 'ORD-101' },
          returnRequests: [],
          refunds: [],
        },
        {
          id: 'item-2',
          sellerId,
          orderId: 'ord-2',
          productName: 'Mechanical Keyboard',
          sku: 'KB-200',
          quantity: 1,
          unitPrice: new Decimal(2000.0),
          totalAmount: new Decimal(2000.0),
          commissionRate: new Decimal(10.0),
          commissionAmount: new Decimal(200.0),
          sellerEarnings: new Decimal(1800.0),
          status: OrderItemStatus.DELIVERED,
          deliveredAt: recentDeliveredAt, // Not eligible (< 7 days)
          createdAt: new Date('2026-09-25T00:00:00.000Z'),
          order: { orderNumber: 'ORD-102' },
          returnRequests: [],
          refunds: [],
        },
        {
          id: 'item-3',
          sellerId,
          orderId: 'ord-3',
          productName: 'Headset',
          sku: 'HS-300',
          quantity: 1,
          unitPrice: new Decimal(1500.0),
          totalAmount: new Decimal(1500.0),
          commissionRate: new Decimal(10.0),
          commissionAmount: new Decimal(150.0),
          sellerEarnings: new Decimal(1350.0),
          status: OrderItemStatus.DELIVERED,
          deliveredAt: eligibleDeliveredAt,
          createdAt: new Date('2026-09-08T00:00:00.000Z'),
          order: { orderNumber: 'ORD-103' },
          returnRequests: [{ id: 'ret-1', status: 'PENDING' }], // Blocking return!
          refunds: [],
        },
      ]);

      const res = await service.previewSettlement(adminUserId, {
        sellerId,
        periodFrom,
        periodTo,
      });

      expect(res.success).toBe(true);
      expect(res.data.eligibleItemCount).toBe(1);
      expect(res.data.summary.grossAmount).toBe(1000.0);
      expect(res.data.summary.commissionAmount).toBe(100.0);
      expect(res.data.summary.netSettlementAmount).toBe(900.0);
    });

    it('should create settlement in PENDING status with snapshot bank details', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({
        id: sellerId,
        displayName: 'TechWorld',
        payoutDetails: {
          accountNumber: '1234567890',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank',
        },
      });

      const eligibleDeliveredAt = new Date('2026-09-10T10:00:00.000Z');
      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          sellerId,
          orderId: 'ord-1',
          productName: 'Gaming Mouse',
          sku: 'GM-100',
          quantity: 1,
          unitPrice: new Decimal(1000.0),
          totalAmount: new Decimal(1000.0),
          commissionRate: new Decimal(10.0),
          commissionAmount: new Decimal(100.0),
          sellerEarnings: new Decimal(900.0),
          status: OrderItemStatus.DELIVERED,
          deliveredAt: eligibleDeliveredAt,
          createdAt: new Date('2026-09-05T00:00:00.000Z'),
          order: { orderNumber: 'ORD-101' },
          returnRequests: [],
          refunds: [],
        },
      ]);

      mockPrisma.settlement.create.mockResolvedValue({
        id: 'set-1',
        settlementNumber: 'SET-20260930-1234',
        sellerId,
        grossAmount: new Decimal(1000.0),
        commissionAmount: new Decimal(100.0),
        netSettlementAmount: new Decimal(900.0),
        status: SettlementStatus.PENDING,
        items: [{ id: 'si-1', orderItemId: 'item-1' }],
      });

      const res = await service.createSettlement(adminUserId, {
        sellerId,
        periodFrom,
        periodTo,
      });

      expect(res.success).toBe(true);
      expect(res.data.id).toBe('set-1');
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SETTLEMENT_CREATED' }),
      );
    });

    it('should throw BadRequestException if no eligible items found', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({
        id: sellerId,
        displayName: 'TechWorld',
      });
      mockPrisma.orderItem.findMany.mockResolvedValue([]);

      await expect(
        service.createSettlement(adminUserId, {
          sellerId,
          periodFrom,
          periodTo,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processPayout & retryPayout', () => {
    const adminUserId = 'admin-1';
    const settlementId = 'set-1';

    it('should process payout and mark settlement COMPLETED', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({
        id: settlementId,
        status: SettlementStatus.PENDING,
        netSettlementAmount: new Decimal(900.0),
      });

      mockPrisma.settlement.update.mockResolvedValue({
        id: settlementId,
        status: SettlementStatus.COMPLETED,
        payoutMethod: SettlementPayoutMethod.BANK_TRANSFER,
        payoutReference: 'NEFT-998877',
      });

      const res = await service.processPayout(adminUserId, settlementId, {
        payoutMethod: SettlementPayoutMethod.BANK_TRANSFER,
        payoutReference: 'NEFT-998877',
        payoutNotes: 'Transferred via HDFC Corporate Banking',
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(SettlementStatus.COMPLETED);
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SETTLEMENT_PAYOUT_PROCESSED' }),
      );
    });
  });
});
