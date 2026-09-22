import { Test, TestingModule } from '@nestjs/testing';
import { ReportingService } from '../src/reporting/reporting.service';
import { PrismaService } from '../src/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  OrderStatus,
  PaymentStatus,
  SellerStatus,
  ProductStatus,
} from '@prisma/client';

describe('ReportingService', () => {
  let service: ReportingService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      order: {
        findMany: jest.fn(),
      },
      orderItem: {
        findMany: jest.fn(),
      },
      refund: {
        findMany: jest.fn(),
      },
      settlement: {
        findMany: jest.fn(),
      },
      sellerProfile: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
      inventory: {
        findMany: jest.fn(),
      },
      sellerVerification: {
        findMany: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      activityLog: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
  });

  describe('getSalesReport & getRevenueReport', () => {
    it('should generate sales report with total revenue and units', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          orderNumber: 'ORD-101',
          orderStatus: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          subtotal: new Decimal(2000.0),
          discountAmount: new Decimal(100.0),
          taxAmount: new Decimal(180.0),
          totalAmount: new Decimal(2080.0),
          currency: 'INR',
          createdAt: new Date(),
          orderItems: [{ quantity: 2, seller: { displayName: 'Seller A' } }],
        },
      ]);

      const res = await service.getSalesReport({});
      expect(res.success).toBe(true);
      expect(res.data.summary.totalOrders).toBe(1);
      expect(res.data.summary.totalUnitsSold).toBe(2);
      expect(res.data.summary.totalNetSales).toBe(2080.0);
    });

    it('should generate revenue report accounting for marketplace commission and refunds', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          totalAmount: new Decimal(2000.0),
          orderItems: [
            {
              commissionAmount: new Decimal(200.0),
              sellerEarnings: new Decimal(1800.0),
            },
          ],
        },
      ]);
      mockPrisma.refund.findMany.mockResolvedValue([
        { refundAmount: new Decimal(500.0) },
      ]);

      const res = await service.getRevenueReport({});
      expect(res.success).toBe(true);
      expect(res.data.summary.grossMerchandiseValue).toBe(2000.0);
      expect(res.data.summary.totalMarketplaceCommission).toBe(200.0);
      expect(res.data.summary.totalRefundsProcessed).toBe(500.0);
    });
  });

  describe('getInventoryReport & low-stock alerts', () => {
    it('should correctly flag items at or below lowStockThreshold', async () => {
      mockPrisma.inventory.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          productId: 'prod-1',
          availableQuantity: 3,
          reservedQuantity: 1,
          lowStockThreshold: 5,
          product: {
            name: 'Smartphone X',
            sku: 'SP-X',
            seller: { displayName: 'Seller A' },
            category: { name: 'Electronics' },
          },
        },
        {
          id: 'inv-2',
          productId: 'prod-2',
          availableQuantity: 20,
          reservedQuantity: 0,
          lowStockThreshold: 5,
          product: {
            name: 'Screen Guard',
            sku: 'SG-1',
            seller: { displayName: 'Seller A' },
            category: { name: 'Accessories' },
          },
        },
      ]);

      const res = await service.getInventoryReport({});
      expect(res.success).toBe(true);
      expect(res.data.summary.totalProductsTracked).toBe(2);
      expect(res.data.summary.lowStockItemCount).toBe(1);
      expect(res.data.lowStockAlerts[0].productName).toBe('Smartphone X');
      expect(res.data.lowStockAlerts[0].isLowStock).toBe(true);
    });
  });

  describe('getSellerAnalytics', () => {
    const sellerUserId = 'user-seller-1';

    it('should calculate seller-scoped sales and top performing products', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-prof-1',
        userId: sellerUserId,
        displayName: 'Tech Store',
      });

      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          productId: 'prod-1',
          productName: 'Gaming Mouse',
          sku: 'GM-100',
          quantity: 3,
          totalAmount: new Decimal(3000.0),
          commissionAmount: new Decimal(300.0),
          sellerEarnings: new Decimal(2700.0),
        },
      ]);

      const res = await service.getSellerAnalytics(sellerUserId, {});
      expect(res.success).toBe(true);
      expect(res.data.summary.totalOrdersCount).toBe(1);
      expect(res.data.summary.totalUnitsSold).toBe(3);
      expect(res.data.summary.totalSellerEarnings).toBe(2700.0);
      expect(res.data.topPerformingProducts[0].name).toBe('Gaming Mouse');
    });
  });

  describe('getAuditLogs & getActivityLogs', () => {
    it('should retrieve paginated audit logs', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'audit-1',
          action: 'SELLER_APPROVED',
          resourceType: 'SellerProfile',
          resourceId: 'seller-1',
          user: { fullName: 'Super Admin' },
        },
      ]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const res = await service.getAuditLogs({ action: 'SELLER' });
      expect(res.success).toBe(true);
      expect(res.data.items).toHaveLength(1);
      expect(res.data.items[0].action).toBe('SELLER_APPROVED');
    });
  });
});
