import { Test, TestingModule } from '@nestjs/testing';
import { ReturnRefundService } from '../src/return-refund/return-refund.service';
import { PrismaService } from '../src/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { InventoryService } from '../src/inventory/inventory.service';
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
  PaymentStatus,
  AdjustmentType,
  LedgerDirection,
  AdjustmentStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('ReturnRefundService (SRS v1.2 8-Stage Return Workflow)', () => {
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
      sellerAdjustment: {
        create: jest.fn(),
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

  const customerUserId = 'user-cust-1';
  const customerId = 'cust-prof-1';
  const sellerUserId = 'user-sell-1';
  const sellerId = 'sell-prof-1';
  const adminUserId = 'user-admin-1';
  const orderId = 'order-123';
  const orderItemId = 'item-456';
  const variantId = 'var-789';

  describe('Stage 1: createReturnRequest (Customer)', () => {
    it('should successfully create a return request in REQUESTED status within 5 days of delivery', async () => {
      mockPrisma.customerProfile.findUnique.mockResolvedValue({
        id: customerId,
        userId: customerUserId,
      });

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      mockPrisma.orderItem.findUnique.mockResolvedValue({
        id: orderItemId,
        orderId,
        sellerId,
        variantId,
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
        sellerId,
        returnQuantity: 1,
        reason: 'Defective zipper',
        status: ReturnRequestStatus.REQUESTED,
      });

      const res = await service.createReturnRequest(
        customerUserId,
        orderId,
        orderItemId,
        {
          returnQuantity: 1,
          reason: 'Defective zipper',
          faultClassification: 'SELLER_FAULT',
        },
      );

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(ReturnRequestStatus.REQUESTED);
      expect(mockPrisma.returnRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ReturnRequestStatus.REQUESTED,
            returnQuantity: 1,
            reason: 'Defective zipper',
          }),
        }),
      );
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RETURN_REQUEST_CREATED' }),
      );
    });

    it('should strictly reject return request when exceeding 120 hours (5 days) post-delivery window', async () => {
      mockPrisma.customerProfile.findUnique.mockResolvedValue({
        id: customerId,
        userId: customerUserId,
      });

      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      mockPrisma.orderItem.findUnique.mockResolvedValue({
        id: orderItemId,
        orderId,
        sellerId,
        variantId,
        status: OrderItemStatus.DELIVERED,
        deliveredAt: sixDaysAgo,
        quantity: 2,
        order: { customerId },
        returnRequests: [],
      });

      await expect(
        service.createReturnRequest(customerUserId, orderId, orderItemId, {
          returnQuantity: 1,
          reason: 'Defective zipper',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject return if item is not DELIVERED', async () => {
      mockPrisma.customerProfile.findUnique.mockResolvedValue({
        id: customerId,
        userId: customerUserId,
      });

      mockPrisma.orderItem.findUnique.mockResolvedValue({
        id: orderItemId,
        orderId,
        sellerId,
        status: OrderItemStatus.SHIPPED,
        quantity: 2,
        order: { customerId },
        returnRequests: [],
      });

      await expect(
        service.createReturnRequest(customerUserId, orderId, orderItemId, {
          returnQuantity: 1,
          reason: 'Changed mind',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject return if an active return request already exists', async () => {
      mockPrisma.customerProfile.findUnique.mockResolvedValue({
        id: customerId,
        userId: customerUserId,
      });

      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      mockPrisma.orderItem.findUnique.mockResolvedValue({
        id: orderItemId,
        orderId,
        sellerId,
        status: OrderItemStatus.DELIVERED,
        deliveredAt: twoDaysAgo,
        quantity: 2,
        order: { customerId },
        returnRequests: [{ id: 'ret-existing', status: ReturnRequestStatus.REQUESTED }],
      });

      await expect(
        service.createReturnRequest(customerUserId, orderId, orderItemId, {
          returnQuantity: 1,
          reason: 'Defective fabric',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Stage 2: approveReturnRequest & rejectReturnRequest (Super Admin)', () => {
    it('should approve a REQUESTED return request moving it to APPROVED', async () => {
      mockPrisma.returnRequest.findUnique.mockResolvedValue({
        id: 'ret-1',
        status: ReturnRequestStatus.REQUESTED,
      });

      mockPrisma.returnRequest.update.mockResolvedValue({
        id: 'ret-1',
        status: ReturnRequestStatus.APPROVED,
        adminRemarks: 'Eligibility verified by Admin',
      });

      const res = await service.approveReturnRequest(adminUserId, 'ret-1', {
        adminRemarks: 'Eligibility verified by Admin',
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(ReturnRequestStatus.APPROVED);
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RETURN_REQUEST_APPROVED' }),
      );
    });

    it('should reject a return request moving it to REJECTED', async () => {
      mockPrisma.returnRequest.findUnique.mockResolvedValue({
        id: 'ret-1',
        status: ReturnRequestStatus.REQUESTED,
      });

      mockPrisma.returnRequest.update.mockResolvedValue({
        id: 'ret-1',
        status: ReturnRequestStatus.REJECTED,
        rejectionReason: 'Item is not eligible for return',
      });

      const res = await service.rejectReturnRequest(adminUserId, 'ret-1', {
        rejectionReason: 'Item is not eligible for return',
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(ReturnRequestStatus.REJECTED);
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RETURN_REQUEST_REJECTED' }),
      );
    });
  });

  describe('Stage 3: customerShipReturn (Customer)', () => {
    it('should allow customer to upload return courier details moving status to IN_TRANSIT', async () => {
      mockPrisma.customerProfile.findUnique.mockResolvedValue({
        id: customerId,
        userId: customerUserId,
      });

      mockPrisma.returnRequest.findUnique.mockResolvedValue({
        id: 'ret-1',
        customerId,
        status: ReturnRequestStatus.APPROVED,
      });

      mockPrisma.returnRequest.update.mockResolvedValue({
        id: 'ret-1',
        status: ReturnRequestStatus.IN_TRANSIT,
        pickupCarrier: 'Delhivery',
        pickupTrackingNumber: 'DLV-123456',
      });

      const res = await service.customerShipReturn(customerUserId, 'ret-1', {
        courierName: 'Delhivery',
        trackingNumber: 'DLV-123456',
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(ReturnRequestStatus.IN_TRANSIT);
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RETURN_IN_TRANSIT' }),
      );
    });

    it('should reject shipping upload if return request is not APPROVED', async () => {
      mockPrisma.customerProfile.findUnique.mockResolvedValue({
        id: customerId,
        userId: customerUserId,
      });

      mockPrisma.returnRequest.findUnique.mockResolvedValue({
        id: 'ret-1',
        customerId,
        status: ReturnRequestStatus.REQUESTED,
      });

      await expect(
        service.customerShipReturn(customerUserId, 'ret-1', {
          courierName: 'Delhivery',
          trackingNumber: 'DLV-123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Stage 4: sellerConfirmReceipt (Seller)', () => {
    it('should allow seller to confirm physical receipt moving status to RECEIVED', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({
        id: sellerId,
        userId: sellerUserId,
      });

      mockPrisma.returnRequest.findUnique.mockResolvedValue({
        id: 'ret-1',
        sellerId,
        status: ReturnRequestStatus.IN_TRANSIT,
      });

      mockPrisma.returnRequest.update.mockResolvedValue({
        id: 'ret-1',
        status: ReturnRequestStatus.RECEIVED,
        receivedAt: new Date(),
      });

      const res = await service.sellerConfirmReceipt(sellerUserId, 'ret-1');

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(ReturnRequestStatus.RECEIVED);
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RETURN_RECEIVED' }),
      );
    });
  });

  describe('Stage 5: sellerVerifyReturn & sellerRejectInspection (Seller)', () => {
    it('should verify return condition, move to VERIFIED, and restock variant inventory', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({
        id: sellerId,
        userId: sellerUserId,
      });

      mockPrisma.returnRequest.findUnique.mockResolvedValue({
        id: 'ret-1',
        sellerId,
        returnQuantity: 1,
        status: ReturnRequestStatus.RECEIVED,
        orderItem: { variantId },
      });

      mockPrisma.returnRequest.update.mockResolvedValue({
        id: 'ret-1',
        status: ReturnRequestStatus.VERIFIED,
      });

      const res = await service.sellerVerifyReturn(
        sellerUserId,
        'ret-1',
        'Item inspected in pristine condition with tags intact',
      );

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(ReturnRequestStatus.VERIFIED);
      expect(mockInventory.restockReturnedProduct).toHaveBeenCalledWith(
        variantId,
        1,
        'ret-1',
        sellerUserId,
      );
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RETURN_VERIFIED' }),
      );
    });

    it('should reject return condition on inspection and escalate dispute to Admin', async () => {
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({
        id: sellerId,
        userId: sellerUserId,
      });

      mockPrisma.returnRequest.findUnique.mockResolvedValue({
        id: 'ret-1',
        sellerId,
        status: ReturnRequestStatus.RECEIVED,
      });

      mockPrisma.returnRequest.update.mockResolvedValue({
        id: 'ret-1',
        status: ReturnRequestStatus.REJECTED_ON_INSPECTION,
        rejectionReason: 'Garment washed and perfume odor detected; tags missing',
      });

      const res = await service.sellerRejectInspection(sellerUserId, 'ret-1', {
        reason: 'Garment washed and perfume odor detected; tags missing',
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(ReturnRequestStatus.REJECTED_ON_INSPECTION);
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RETURN_INSPECTION_REJECTED' }),
      );
    });
  });

  describe('Stage 6: resolveReturnDispute (Super Admin)', () => {
    it('should overrule seller inspection rejection, transition to VERIFIED, and restock inventory', async () => {
      mockPrisma.returnRequest.findUnique.mockResolvedValue({
        id: 'ret-1',
        status: ReturnRequestStatus.REJECTED_ON_INSPECTION,
        returnQuantity: 1,
        orderItem: { variantId },
      });

      mockPrisma.returnRequest.update.mockResolvedValue({
        id: 'ret-1',
        status: ReturnRequestStatus.VERIFIED,
        adminRemarks: 'Admin arbitration determined tags were loose from manufacturing defect',
      });

      const res = await service.resolveReturnDispute(adminUserId, 'ret-1', {
        resolution: 'OVERRULE_SELLER_APPROVE_REFUND',
        adminNotes: 'Admin arbitration determined tags were loose from manufacturing defect',
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(ReturnRequestStatus.VERIFIED);
      expect(mockInventory.restockReturnedProduct).toHaveBeenCalledWith(
        variantId,
        1,
        'ret-1',
        adminUserId,
      );
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RETURN_DISPUTE_RESOLVED' }),
      );
    });

    it('should uphold seller rejection, transition to REJECTED, closing return process', async () => {
      mockPrisma.returnRequest.findUnique.mockResolvedValue({
        id: 'ret-1',
        status: ReturnRequestStatus.REJECTED_ON_INSPECTION,
      });

      mockPrisma.returnRequest.update.mockResolvedValue({
        id: 'ret-1',
        status: ReturnRequestStatus.REJECTED,
        adminRemarks: 'Admin verified evidence of customer wear',
      });

      const res = await service.resolveReturnDispute(adminUserId, 'ret-1', {
        resolution: 'UPHOLD_SELLER_REJECTION',
        adminNotes: 'Admin verified evidence of customer wear',
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(ReturnRequestStatus.REJECTED);
    });
  });

  describe('Stage 7 & 8: processReturnRefund (Super Admin & Fault Allocation)', () => {
    it('should process SELLER_FAULT return refund, reimburse courier cost, and record SellerAdjustment debit', async () => {
      mockPrisma.returnRequest.findUnique.mockResolvedValue({
        id: 'ret-1',
        orderId,
        orderItemId,
        customerId,
        sellerId,
        returnQuantity: 1,
        reason: 'Defective fabric tore immediately',
        status: ReturnRequestStatus.VERIFIED,
        orderItem: {
          id: orderItemId,
          sellerId,
          totalAmount: new Decimal(1000),
          quantity: 1,
        },
        order: {
          id: orderId,
          totalAmount: new Decimal(1080),
          shippingAmount: new Decimal(80),
          currency: 'INR',
          orderItems: [
            {
              id: orderItemId,
              sellerId,
              status: OrderItemStatus.DELIVERED,
            },
          ],
          refunds: [],
          paymentTransactions: [
            {
              id: 'tx-orig-1',
              status: PaymentTransactionStatus.SUCCEEDED,
              transactionType: PaymentTransactionType.PAYMENT,
            },
          ],
        },
      });

      mockPrisma.refund.findUnique.mockResolvedValue(null);
      mockPrisma.refund.create.mockResolvedValue({
        id: 'ref-1',
        refundAmount: new Decimal(1080),
        status: RefundStatus.SUCCEEDED,
      });
      mockPrisma.returnRequest.update.mockResolvedValue({
        id: 'ret-1',
        status: ReturnRequestStatus.REFUNDED,
      });
      mockPrisma.sellerAdjustment.create.mockResolvedValue({
        id: 'adj-1',
        type: AdjustmentType.SELLER_FAULT_RETURN_SHIPPING_DEBIT,
        amount: new Decimal(79),
        direction: LedgerDirection.DEBIT,
      });

      const res = await service.processReturnRefund(adminUserId, 'ret-1', {
        faultClassification: 'SELLER_FAULT',
        returnShippingFee: 79.0,
      });

      expect(res.success).toBe(true);
      expect(res.data.returnRequest.status).toBe(ReturnRequestStatus.REFUNDED);
      // Item price (1000) + full seller shipment original shipping refunded (80)
      expect(mockPrisma.refund.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refundAmount: new Decimal(1080),
            status: RefundStatus.SUCCEEDED,
          }),
        }),
      );
      // Seller fault return shipping fee debited to seller
      expect(mockPrisma.sellerAdjustment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sellerId,
            type: AdjustmentType.SELLER_FAULT_RETURN_SHIPPING_DEBIT,
            amount: new Decimal(79),
            direction: LedgerDirection.DEBIT,
            status: AdjustmentStatus.PENDING,
          }),
        }),
      );
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RETURN_REFUNDED' }),
      );
    });

    it('should process CUSTOMER_FAULT return refund for item price only without seller shipping debit', async () => {
      mockPrisma.returnRequest.findUnique.mockResolvedValue({
        id: 'ret-2',
        orderId,
        orderItemId,
        customerId,
        sellerId,
        returnQuantity: 1,
        reason: 'Change of mind / size preference',
        status: ReturnRequestStatus.VERIFIED,
        orderItem: {
          id: orderItemId,
          sellerId,
          totalAmount: new Decimal(1000),
          quantity: 1,
        },
        order: {
          id: orderId,
          totalAmount: new Decimal(1080),
          shippingAmount: new Decimal(80),
          currency: 'INR',
          orderItems: [
            {
              id: orderItemId,
              sellerId,
              status: OrderItemStatus.DELIVERED,
            },
          ],
          refunds: [],
          paymentTransactions: [
            {
              id: 'tx-orig-1',
              status: PaymentTransactionStatus.SUCCEEDED,
              transactionType: PaymentTransactionType.PAYMENT,
            },
          ],
        },
      });

      mockPrisma.refund.findUnique.mockResolvedValue(null);
      mockPrisma.refund.create.mockResolvedValue({
        id: 'ref-2',
        refundAmount: new Decimal(1000),
        status: RefundStatus.SUCCEEDED,
      });
      mockPrisma.returnRequest.update.mockResolvedValue({
        id: 'ret-2',
        status: ReturnRequestStatus.REFUNDED,
      });

      const res = await service.processReturnRefund(adminUserId, 'ret-2', {
        faultClassification: 'CUSTOMER_FAULT',
      });

      expect(res.success).toBe(true);
      expect(res.data.returnRequest.status).toBe(ReturnRequestStatus.REFUNDED);
      // Item price only (1000), original shipping retained (80)
      expect(mockPrisma.refund.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refundAmount: new Decimal(1000),
          }),
        }),
      );
      // No seller adjustment debit created for customer fault
      expect(mockPrisma.sellerAdjustment.create).not.toHaveBeenCalled();
    });
  });
});
