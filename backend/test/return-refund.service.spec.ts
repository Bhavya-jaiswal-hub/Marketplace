import { Test, TestingModule } from '@nestjs/testing';
import { ReturnRefundService } from '../src/return-refund/return-refund.service';
import { PrismaService } from '../src/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { StockAdjustmentMode } from '../src/inventory/dto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderItemStatus,
  ReturnRequestStatus,
  RefundStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('ReturnRefundService', () => {
  let service: ReturnRefundService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockInventory: any;

  beforeEach(async () => {
    mockPrisma = {
      customerProfile: {
        findUnique: jest.fn(),
      },
      sellerProfile: {
        findUnique: jest.fn(),
      },
      orderItem: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      orderItemHistory: {
        create: jest.fn(),
      },
      returnRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      refund: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      order: {
        update: jest.fn(),
      },
      paymentTransaction: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
    };

    mockAudit = {
      logAction: jest.fn().mockResolvedValue({ id: 'audit-123' }),
    };

    mockInventory = {
      restockReturnedProduct: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnRefundService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: InventoryService, useValue: mockInventory },
      ],
    }).compile();

    service = module.get<ReturnRefundService>(ReturnRefundService);
  });

  describe('createReturnRequest', () => {
    const customerUserId = 'user-cust-1';
    const customerId = 'cust-prof-1';
    const orderId = 'order-123';
    const orderItemId = 'item-456';

    it('should successfully create a return request within 5 days of delivery', async () => {
      mockPrisma.customerProfile.findUnique.mockResolvedValue({
        id: customerId,
        userId: customerUserId,
      });

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      mockPrisma.orderItem.findUnique.mockResolvedValue({
        id: orderItemId,
        orderId,
        sellerId: 'seller-789',
        status: OrderItemStatus.DELIVERED,
        deliveredAt: threeDaysAgo,
        quantity: 2,
        order: { customerId },
        returnRequests: [],
      });

      mockPrisma.returnRequest.create.mockResolvedValue({
        id: 'ret-1',
        orderId,
        orderItemId,
        customerId,
        sellerId: 'seller-789',
        returnQuantity: 1,
        reason: 'Defective speaker',
        status: ReturnRequestStatus.PENDING,
      });

      const res = await service.createReturnRequest(
        customerUserId,
        orderId,
        orderItemId,
        { returnQuantity: 1, reason: 'Defective speaker' },
      );

      expect(res.success).toBe(true);
      expect(res.data.id).toBe('ret-1');
      expect(mockPrisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: orderItemId },
        data: { status: OrderItemStatus.RETURN_REQUESTED },
      });
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RETURN_REQUEST_CREATED' }),
      );
    });

    it('should reject return if item is not DELIVERED', async () => {
      mockPrisma.customerProfile.findUnique.mockResolvedValue({
        id: customerId,
        userId: customerUserId,
      });

      mockPrisma.orderItem.findUnique.mockResolvedValue({
        id: orderItemId,
        orderId,
        sellerId: 'seller-789',
        status: OrderItemStatus.SHIPPED,
        quantity: 2,
        order: { customerId },
        returnRequests: [],
      });

      await expect(
        service.createReturnRequest(customerUserId, orderId, orderItemId, {
          returnQuantity: 1,
          reason: 'Defective speaker',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject return if delivery was more than 5 days ago', async () => {
      mockPrisma.customerProfile.findUnique.mockResolvedValue({
        id: customerId,
        userId: customerUserId,
      });

      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      mockPrisma.orderItem.findUnique.mockResolvedValue({
        id: orderItemId,
        orderId,
        sellerId: 'seller-789',
        status: OrderItemStatus.DELIVERED,
        deliveredAt: sixDaysAgo,
        quantity: 2,
        order: { customerId },
        returnRequests: [],
      });

      await expect(
        service.createReturnRequest(customerUserId, orderId, orderItemId, {
          returnQuantity: 1,
          reason: 'Defective speaker',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject return if returnQuantity exceeds ordered quantity', async () => {
      mockPrisma.customerProfile.findUnique.mockResolvedValue({
        id: customerId,
        userId: customerUserId,
      });

      mockPrisma.orderItem.findUnique.mockResolvedValue({
        id: orderItemId,
        orderId,
        sellerId: 'seller-789',
        status: OrderItemStatus.DELIVERED,
        deliveredAt: new Date(),
        quantity: 1,
        order: { customerId },
        returnRequests: [],
      });

      await expect(
        service.createReturnRequest(customerUserId, orderId, orderItemId, {
          returnQuantity: 2,
          reason: 'Defective',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveReturnRequest & rejectReturnRequest', () => {
    const adminUserId = 'admin-1';
    const returnId = 'ret-1';

    it('should approve return request and schedule pickup', async () => {
      mockPrisma.returnRequest.findUnique.mockResolvedValue({
        id: returnId,
        status: ReturnRequestStatus.PENDING,
        orderItemId: 'item-1',
      });
      mockPrisma.returnRequest.update.mockResolvedValue({
        id: returnId,
        status: ReturnRequestStatus.PICKUP_SCHEDULED,
        pickupCarrier: 'BlueDart',
      });

      const res = await service.approveReturnRequest(adminUserId, returnId, {
        pickupCarrier: 'BlueDart',
        pickupTrackingNumber: 'BD-9988',
      });

      expect(res.success).toBe(true);
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RETURN_REQUEST_APPROVED' }),
      );
    });

    it('should reject return request with reason and restore item to DELIVERED', async () => {
      mockPrisma.returnRequest.findUnique.mockResolvedValue({
        id: returnId,
        status: ReturnRequestStatus.PENDING,
        orderItemId: 'item-1',
      });
      mockPrisma.returnRequest.update.mockResolvedValue({
        id: returnId,
        status: ReturnRequestStatus.REJECTED,
      });

      const res = await service.rejectReturnRequest(adminUserId, returnId, {
        rejectionReason: 'Product used and altered',
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { status: OrderItemStatus.DELIVERED },
      });
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RETURN_REQUEST_REJECTED' }),
      );
    });
  });

  describe('completeReturnRequest', () => {
    const adminUserId = 'admin-1';
    const returnId = 'ret-1';

    it('should complete return, restock inventory, and create a pending refund', async () => {
      mockPrisma.returnRequest.findUnique.mockResolvedValue({
        id: returnId,
        orderId: 'order-1',
        orderItemId: 'item-1',
        customerId: 'cust-1',
        returnQuantity: 1,
        reason: 'Broken screen',
        status: ReturnRequestStatus.APPROVED,
        orderItem: {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 2,
          totalAmount: new Decimal(2000.0),
        },
        order: {
          currency: 'INR',
          paymentTransactions: [
            {
              id: 'tx-1',
              status: PaymentTransactionStatus.SUCCEEDED,
              transactionType: PaymentTransactionType.PAYMENT,
            },
          ],
        },
      });

      mockPrisma.returnRequest.update.mockResolvedValue({
        id: returnId,
        status: ReturnRequestStatus.COMPLETED,
      });
      mockPrisma.refund.create.mockResolvedValue({
        id: 'refund-1',
        refundAmount: new Decimal(1000.0),
        status: RefundStatus.PENDING,
      });

      const res = await service.completeReturnRequest(adminUserId, returnId, {
        restockInventory: true,
      });

      expect(res.success).toBe(true);
      expect(mockInventory.restockReturnedProduct).toHaveBeenCalledWith(
        'prod-1',
        1,
        returnId,
        adminUserId,
      );
      expect(mockPrisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { status: OrderItemStatus.RETURNED },
      });
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RETURN_REQUEST_COMPLETED' }),
      );
    });
  });

  describe('processRefund', () => {
    const adminUserId = 'admin-1';
    const refundId = 'refund-1';

    it('should process pending refund and create payment transaction', async () => {
      mockPrisma.refund.findUnique.mockResolvedValue({
        id: refundId,
        orderId: 'order-1',
        orderItemId: 'item-1',
        customerId: 'cust-1',
        refundAmount: new Decimal(1000.0),
        currency: 'INR',
        status: RefundStatus.PENDING,
        order: {
          id: 'order-1',
          totalAmount: new Decimal(2000.0),
          refunds: [],
          orderItems: [
            { id: 'item-1', status: OrderItemStatus.RETURNED },
            { id: 'item-2', status: OrderItemStatus.DELIVERED },
          ],
        },
        orderItem: {
          id: 'item-1',
          status: OrderItemStatus.RETURNED,
        },
      });

      mockPrisma.refund.update.mockResolvedValue({
        id: refundId,
        status: RefundStatus.SUCCEEDED,
      });

      const res = await service.processRefund(adminUserId, refundId, {
        providerRefundId: 'rfnd_razorpay_9988',
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.paymentTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerTransactionId: 'rfnd_razorpay_9988',
            transactionType: PaymentTransactionType.REFUND,
          }),
        }),
      );
      expect(mockPrisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { status: OrderItemStatus.REFUNDED },
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { paymentStatus: 'PARTIALLY_REFUNDED' },
      });
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REFUND_PROCESSED' }),
      );
    });
  });
});
