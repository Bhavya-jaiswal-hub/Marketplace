import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrderService, calculateSlaDueAt } from '../src/order/order.service';
import {
  AdjustmentStatus,
  AdjustmentType,
  DisputeResolutionOutcome,
  DisputeStatus,
  LedgerDirection,
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
} from '@prisma/client';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: any;
  let customerService: any;
  let inventoryService: any;
  let audit: any;

  const mockCustomer = {
    id: 'cust-1',
    userId: 'user-cust-1',
    firstName: 'Jane',
    lastName: 'Doe',
  };

  const mockAddress = {
    id: 'addr-1',
    customerId: 'cust-1',
    fullName: 'Jane Doe',
    phoneNumber: '9876543210',
    addressLine1: '123 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'India',
    addressType: 'HOME',
    isActive: true,
  };

  const mockProduct = {
    id: 'prod-1',
    sellerId: 'seller-1',
    name: 'Cotton Oxford Shirt',
    sku: 'OXFORD-SHIRT',
    price: 1299.0,
    status: ProductStatus.ACTIVE,
    deletedAt: null,
    category: {
      id: 'cat-1',
      commissions: [{ commissionRate: 10.0 }],
    },
  };

  const mockVariant = {
    id: 'var-1',
    productId: 'prod-1',
    sku: 'OXFORD-SHIRT-BLU-L',
    size: 'L',
    color: 'Blue',
    priceOverride: null,
    stockQuantity: 10,
    isActive: true,
    product: mockProduct,
    inventory: { availableQuantity: 10 },
  };

  const mockCart = {
    id: 'cart-1',
    customerId: 'cust-1',
    status: 'ACTIVE',
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        variantId: 'var-1',
        quantity: 2,
        product: mockProduct,
        variant: mockVariant,
      },
    ],
  };

  beforeEach(() => {
    prisma = {
      customerAddress: {
        findFirst: jest.fn(),
      },
      cart: {
        findFirst: jest.fn(),
      },
      cartItem: {
        deleteMany: jest.fn(),
      },
      paymentPending: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      order: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      orderItem: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      orderItemHistory: {
        create: jest.fn(),
      },
      sellerProfile: {
        findUnique: jest.fn(),
      },
      sellerAdjustment: {
        create: jest.fn(),
      },
      refund: {
        create: jest.fn(),
      },
    };

    customerService = {
      getOrCreateProfile: jest.fn().mockResolvedValue({
        success: true,
        data: mockCustomer,
      }),
    };

    inventoryService = {
      reserveStock: jest.fn().mockResolvedValue(true),
      releaseReservation: jest.fn().mockResolvedValue(true),
      adjustVariantStock: jest.fn().mockResolvedValue(true),
    };

    audit = {
      logAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    service = new OrderService(
      prisma,
      customerService,
      inventoryService,
      audit,
    );
  });

  describe('calculateSlaDueAt', () => {
    it('should correctly calculate 3 business days skipping weekends', () => {
      // Monday 10:00 -> Thursday 10:00 (+3 days)
      const monday = new Date('2026-10-12T10:00:00.000Z');
      const dueFromMon = calculateSlaDueAt(monday);
      expect(dueFromMon.toISOString()).toBe('2026-10-15T10:00:00.000Z');

      // Thursday 10:00 -> Fri (1), Sat (skip), Sun (skip), Mon (2), Tue (3) -> Tuesday 10:00
      const thursday = new Date('2026-10-15T10:00:00.000Z');
      const dueFromThu = calculateSlaDueAt(thursday);
      expect(dueFromThu.toISOString()).toBe('2026-10-20T10:00:00.000Z');
    });
  });

  describe('initiateCheckout', () => {
    it('should successfully reserve variant stock, snapshot pricing & address, and create order in PLACED status', async () => {
      prisma.customerAddress.findFirst.mockResolvedValue(mockAddress);
      prisma.cart.findFirst.mockResolvedValue(mockCart);
      prisma.paymentPending.findUnique.mockResolvedValue(null);

      const createdOrder = {
        id: 'ord-1',
        orderNumber: 'ORD-123',
        totalAmount: 2598.0,
      };
      prisma.order.create.mockResolvedValue(createdOrder);
      prisma.paymentPending.create.mockResolvedValue({
        id: 'pay-1',
        paymentReference: 'PAY-123',
        providerOrderReference: 'order_123',
        amount: 2598.0,
        currency: 'INR',
        expiresAt: new Date(),
      });

      const res = await service.initiateCheckout('user-cust-1', {
        shippingAddressId: 'addr-1',
      });

      expect(res.success).toBe(true);
      expect(inventoryService.reserveStock).toHaveBeenCalledWith({
        reservationId: expect.stringMatching(/^ORD-/),
        items: [{ variantId: 'var-1', quantity: 2 }],
      });
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'cust-1',
            orderStatus: OrderStatus.PLACED,
            paymentStatus: PaymentStatus.PENDING,
            totalAmount: 2598.0,
            shippingAddressSnapshot: expect.objectContaining({
              postalCode: '560001',
            }),
          }),
        }),
      );
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
    });

    it('should reject checkout if shipping address is invalid', async () => {
      prisma.customerAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.initiateCheckout('user-cust-1', {
          shippingAddressId: 'invalid-addr',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject checkout if cart is empty', async () => {
      prisma.customerAddress.findFirst.mockResolvedValue(mockAddress);
      prisma.cart.findFirst.mockResolvedValue({ ...mockCart, items: [] });

      await expect(
        service.initiateCheckout('user-cust-1', {
          shippingAddressId: 'addr-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelOrder', () => {
    const mockOrderToCancel = {
      id: 'ord-1',
      orderNumber: 'ORD-123',
      customerId: 'cust-1',
      orderStatus: OrderStatus.PLACED,
      paymentStatus: PaymentStatus.PENDING,
      currency: 'INR',
      orderItems: [
        {
          id: 'item-1',
          sellerId: 'seller-1',
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 2,
          unitPrice: 1299.0,
          totalAmount: 2598.0,
          shippingFeeShare: 79.0,
          productName: 'Cotton Oxford Shirt',
          status: OrderItemStatus.PLACED,
        },
      ],
    };

    it('should cancel PLACED order item and release reserved variant stock', async () => {
      prisma.order.findFirst.mockResolvedValue(mockOrderToCancel);
      prisma.orderItem.findMany.mockResolvedValue([
        { ...mockOrderToCancel.orderItems[0], status: OrderItemStatus.CANCELLED },
      ]);
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrderToCancel,
        orderStatus: OrderStatus.CANCELLED,
        orderItems: [
          { ...mockOrderToCancel.orderItems[0], status: OrderItemStatus.CANCELLED },
        ],
      });

      const res = await service.cancelOrder('user-cust-1', 'ord-1', {
        reason: 'Customer changed mind',
      });

      expect(res.success).toBe(true);
      expect(prisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          status: OrderItemStatus.CANCELLED,
          cancellationReason: 'Customer changed mind',
        }),
      });
      expect(inventoryService.releaseReservation).toHaveBeenCalledWith({
        reservationId: 'ORD-123',
        items: [{ variantId: 'var-1', productId: 'prod-1', quantity: 2 }],
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        data: { orderStatus: OrderStatus.CANCELLED },
      });
    });

    it('should restock inventory and refund full shipping fee when all items for seller are cancelled on paid order', async () => {
      const paidOrder = {
        ...mockOrderToCancel,
        paymentStatus: PaymentStatus.PAID,
      };
      prisma.order.findFirst.mockResolvedValue(paidOrder);
      prisma.orderItem.findMany.mockResolvedValue([
        { ...paidOrder.orderItems[0], status: OrderItemStatus.CANCELLED },
      ]);
      prisma.order.findUnique.mockResolvedValue({
        ...paidOrder,
        orderStatus: OrderStatus.CANCELLED,
        orderItems: [
          { ...paidOrder.orderItems[0], status: OrderItemStatus.CANCELLED },
        ],
      });

      await service.cancelOrder('user-cust-1', 'ord-1', {
        reason: 'Out of stock cancellation',
      });

      // Verifies variant restock
      expect(inventoryService.adjustVariantStock).toHaveBeenCalledWith(
        'user-cust-1',
        'var-1',
        expect.objectContaining({
          mode: 'ADD',
          quantity: 2,
        }),
      );

      // Verifies refund record with item amount + shipping fee (2598 + 79 = 2677)
      expect(prisma.refund.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'ord-1',
          refundAmount: 2677.0,
          currency: 'INR',
        }),
      });
    });

    it('should reject cancellation if item is already shipped or delivered', async () => {
      prisma.order.findFirst.mockResolvedValue({
        ...mockOrderToCancel,
        orderItems: [
          {
            ...mockOrderToCancel.orderItems[0],
            status: OrderItemStatus.SHIPPED,
          },
        ],
      });

      await expect(
        service.cancelOrder('user-cust-1', 'ord-1', { reason: 'Too late' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Seller Fulfillment Workflow', () => {
    const mockSeller = { id: 'seller-1', userId: 'user-seller-1' };
    const mockSellerItem = {
      id: 'item-1',
      orderId: 'ord-1',
      sellerId: 'seller-1',
      variantId: 'var-1',
      productId: 'prod-1',
      quantity: 1,
      status: OrderItemStatus.PACKED,
      order: { id: 'ord-1', orderNumber: 'ORD-123', paymentStatus: PaymentStatus.PAID },
    };

    it('should transition from PACKED to SHIPPED with tracking info and carrier', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(mockSeller);
      prisma.orderItem.findFirst.mockResolvedValue(mockSellerItem);
      prisma.orderItem.update.mockResolvedValue({
        ...mockSellerItem,
        status: OrderItemStatus.SHIPPED,
      });
      prisma.orderItem.findMany.mockResolvedValue([
        { ...mockSellerItem, status: OrderItemStatus.SHIPPED },
      ]);

      const res = await service.updateSellerOrderItemStatus(
        'user-seller-1',
        'ord-1',
        'item-1',
        {
          status: OrderItemStatus.SHIPPED,
          courierName: 'Delhivery',
          trackingNumber: 'DEL-123456789',
        },
      );

      expect(res.success).toBe(true);
      expect(prisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          status: OrderItemStatus.SHIPPED,
          courierName: 'Delhivery',
          trackingCarrier: 'Delhivery',
          trackingNumber: 'DEL-123456789',
        }),
      });
      // Order status updated to PARTIALLY_SHIPPED
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        data: { orderStatus: OrderStatus.PARTIALLY_SHIPPED },
      });
    });

    it('should transition from SHIPPED to DELIVERED and record deliveredAt', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(mockSeller);
      prisma.orderItem.findFirst.mockResolvedValue({
        ...mockSellerItem,
        status: OrderItemStatus.SHIPPED,
      });
      prisma.orderItem.update.mockResolvedValue({
        ...mockSellerItem,
        status: OrderItemStatus.DELIVERED,
      });
      prisma.orderItem.findMany.mockResolvedValue([
        { ...mockSellerItem, status: OrderItemStatus.DELIVERED },
      ]);

      const res = await service.updateSellerOrderItemStatus(
        'user-seller-1',
        'ord-1',
        'item-1',
        { status: OrderItemStatus.DELIVERED },
      );

      expect(res.success).toBe(true);
      expect(prisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          status: OrderItemStatus.DELIVERED,
          deliveredAt: expect.any(Date),
        }),
      });
      // All items delivered -> OrderStatus.DELIVERED
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        data: { orderStatus: OrderStatus.DELIVERED },
      });
    });

    it('should reject SHIPPED transition if tracking details are missing', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(mockSeller);
      prisma.orderItem.findFirst.mockResolvedValue(mockSellerItem);

      await expect(
        service.updateSellerOrderItemStatus(
          'user-seller-1',
          'ord-1',
          'item-1',
          { status: OrderItemStatus.SHIPPED },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid transition jumping from PLACED directly to DELIVERED', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(mockSeller);
      prisma.orderItem.findFirst.mockResolvedValue({
        ...mockSellerItem,
        status: OrderItemStatus.PLACED,
      });

      await expect(
        service.updateSellerOrderItemStatus(
          'user-seller-1',
          'ord-1',
          'item-1',
          { status: OrderItemStatus.DELIVERED },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('"Not Received" Dispute Governance Workflow', () => {
    const mockDeliveredItem = {
      id: 'item-disp-1',
      orderId: 'ord-1',
      sellerId: 'seller-1',
      variantId: 'var-1',
      productId: 'prod-1',
      productName: 'Cotton Oxford Shirt',
      quantity: 1,
      totalAmount: 1299.0,
      shippingFeeShare: 79.0,
      status: OrderItemStatus.DELIVERED,
      disputeStatus: DisputeStatus.NONE,
      deliveredAt: new Date(Date.now() - 2 * 24 * 3600 * 1000), // delivered 2 days ago (< 7 days)
      order: {
        id: 'ord-1',
        customerId: 'cust-1',
        currency: 'INR',
        paymentStatus: PaymentStatus.PAID,
      },
    };

    describe('reportNotReceived', () => {
      it('should report not received within 7-day window, set slaDueAt (+3 business days), and update order to UNDER_DISPUTE', async () => {
        prisma.order.findFirst.mockResolvedValue({ id: 'ord-1', customerId: 'cust-1' });
        prisma.orderItem.findFirst.mockResolvedValue(mockDeliveredItem);
        prisma.orderItem.update.mockResolvedValue({
          ...mockDeliveredItem,
          status: OrderItemStatus.NOT_RECEIVED_UNDER_DISPUTE,
          disputeStatus: DisputeStatus.OPEN,
        });
        prisma.orderItem.findMany.mockResolvedValue([
          { ...mockDeliveredItem, status: OrderItemStatus.NOT_RECEIVED_UNDER_DISPUTE },
        ]);

        const res = await service.reportNotReceived('user-cust-1', 'ord-1', 'item-disp-1', {
          reason: 'Package was marked delivered but not received at doorstep',
        });

        expect(res.success).toBe(true);
        expect(prisma.orderItem.update).toHaveBeenCalledWith({
          where: { id: 'item-disp-1' },
          data: expect.objectContaining({
            status: OrderItemStatus.NOT_RECEIVED_UNDER_DISPUTE,
            disputeStatus: DisputeStatus.OPEN,
            slaDueAt: expect.any(Date),
            notReceivedReportedAt: expect.any(Date),
          }),
        });

        // Parent order reflects UNDER_DISPUTE
        expect(prisma.order.update).toHaveBeenCalledWith({
          where: { id: 'ord-1' },
          data: { orderStatus: OrderStatus.UNDER_DISPUTE },
        });
      });

      it('should block report if more than 7 calendar days (168h) have elapsed since delivery', async () => {
        prisma.order.findFirst.mockResolvedValue({ id: 'ord-1', customerId: 'cust-1' });
        prisma.orderItem.findFirst.mockResolvedValue({
          ...mockDeliveredItem,
          deliveredAt: new Date(Date.now() - 8 * 24 * 3600 * 1000), // 8 days ago (> 7 days)
        });

        await expect(
          service.reportNotReceived('user-cust-1', 'ord-1', 'item-disp-1', {
            reason: 'Package not received',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject report if item is not in DELIVERED status', async () => {
        prisma.order.findFirst.mockResolvedValue({ id: 'ord-1', customerId: 'cust-1' });
        prisma.orderItem.findFirst.mockResolvedValue({
          ...mockDeliveredItem,
          status: OrderItemStatus.SHIPPED,
        });

        await expect(
          service.reportNotReceived('user-cust-1', 'ord-1', 'item-disp-1', {
            reason: 'Package not received',
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('submitDisputeProof', () => {
      it('should allow seller to attach proof notes and tracking carrier details for an open dispute', async () => {
        const mockSeller = { id: 'seller-1', userId: 'user-seller-1' };
        prisma.sellerProfile.findUnique.mockResolvedValue(mockSeller);
        prisma.orderItem.findFirst.mockResolvedValue({
          ...mockDeliveredItem,
          status: OrderItemStatus.NOT_RECEIVED_UNDER_DISPUTE,
          disputeStatus: DisputeStatus.OPEN,
        });
        prisma.orderItem.update.mockResolvedValue({
          ...mockDeliveredItem,
          sellerProofNotes: 'Delivery verified by security guard',
        });

        const res = await service.submitDisputeProof(
          'user-seller-1',
          'ord-1',
          'item-disp-1',
          {
            proofNotes: 'Delivery verified by security guard',
            proofDocumentUrl: 'https://cdn.example.com/pod-signed.jpg',
          },
        );

        expect(res.success).toBe(true);
        expect(prisma.orderItem.update).toHaveBeenCalledWith({
          where: { id: 'item-disp-1' },
          data: expect.objectContaining({
            sellerProofNotes: 'Delivery verified by security guard',
            sellerProofDocumentUrl: 'https://cdn.example.com/pod-signed.jpg',
          }),
        });
      });

      it('should reject proof submission if order item is not under dispute', async () => {
        const mockSeller = { id: 'seller-1', userId: 'user-seller-1' };
        prisma.sellerProfile.findUnique.mockResolvedValue(mockSeller);
        prisma.orderItem.findFirst.mockResolvedValue(mockDeliveredItem);

        await expect(
          service.submitDisputeProof('user-seller-1', 'ord-1', 'item-disp-1', {
            proofNotes: 'Notes',
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('arbitrateDispute', () => {
      const mockDisputedItem = {
        ...mockDeliveredItem,
        status: OrderItemStatus.NOT_RECEIVED_UNDER_DISPUTE,
        disputeStatus: DisputeStatus.OPEN,
      };

      it('should uphold customer refund, debit seller adjustment ledger, and record customer refund', async () => {
        prisma.orderItem.findUnique.mockResolvedValue(mockDisputedItem);
        prisma.orderItem.update.mockResolvedValue({
          ...mockDisputedItem,
          disputeStatus: DisputeStatus.RESOLVED_REFUNDED,
        });
        prisma.orderItem.findMany.mockResolvedValue([
          { ...mockDisputedItem, disputeStatus: DisputeStatus.RESOLVED_REFUNDED },
        ]);

        const res = await service.arbitrateDispute('admin-usr-1', 'item-disp-1', {
          outcome: DisputeResolutionOutcome.CUSTOMER_REFUND_UPHELD,
          adminNotes: 'Carrier confirmed delivery failed at wrong address',
        });

        expect(res.success).toBe(true);

        // Verifies SellerAdjustment ledger debit (totalAmount 1299 + shippingShare 79 = 1378)
        expect(prisma.sellerAdjustment.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            sellerId: 'seller-1',
            type: AdjustmentType.DISPUTE_CHARGE_DEBIT,
            direction: LedgerDirection.DEBIT,
            amount: 1378.0,
            status: AdjustmentStatus.PENDING,
          }),
        });

        // Verifies Refund creation
        expect(prisma.refund.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            orderId: 'ord-1',
            orderItemId: 'item-disp-1',
            refundAmount: 1378.0,
          }),
        });

        // Verifies OrderItem dispute status update
        expect(prisma.orderItem.update).toHaveBeenCalledWith({
          where: { id: 'item-disp-1' },
          data: expect.objectContaining({
            disputeStatus: DisputeStatus.RESOLVED_REFUNDED,
            resolutionOutcome: DisputeResolutionOutcome.CUSTOMER_REFUND_UPHELD,
            resolvedById: 'admin-usr-1',
          }),
        });
      });

      it('should reject customer claim, return item to DELIVERED status, and re-derive parent order', async () => {
        prisma.orderItem.findUnique.mockResolvedValue(mockDisputedItem);
        prisma.orderItem.update.mockResolvedValue({
          ...mockDisputedItem,
          status: OrderItemStatus.DELIVERED,
          disputeStatus: DisputeStatus.RESOLVED_DELIVERED,
        });
        prisma.orderItem.findMany.mockResolvedValue([
          { ...mockDisputedItem, status: OrderItemStatus.DELIVERED },
        ]);

        const res = await service.arbitrateDispute('admin-usr-1', 'item-disp-1', {
          outcome: DisputeResolutionOutcome.DISPUTE_REJECTED,
          adminNotes: 'Seller provided signed proof of delivery with OTP confirmation',
        });

        expect(res.success).toBe(true);
        expect(prisma.orderItem.update).toHaveBeenCalledWith({
          where: { id: 'item-disp-1' },
          data: expect.objectContaining({
            status: OrderItemStatus.DELIVERED,
            disputeStatus: DisputeStatus.RESOLVED_DELIVERED,
            resolutionOutcome: DisputeResolutionOutcome.DISPUTE_REJECTED,
          }),
        });

        // Parent order re-derived back to DELIVERED
        expect(prisma.order.update).toHaveBeenCalledWith({
          where: { id: 'ord-1' },
          data: { orderStatus: OrderStatus.DELIVERED },
        });
      });
    });

    describe('listAdminDisputes', () => {
      it('should return paginated disputes and flag overdue disputes past 3 business days SLA', async () => {
        const pastDate = new Date(Date.now() - 4 * 24 * 3600 * 1000); // 4 days ago
        const futureDate = new Date(Date.now() + 2 * 24 * 3600 * 1000); // 2 days in future

        prisma.orderItem.count.mockResolvedValue(2);
        prisma.orderItem.findMany.mockResolvedValue([
          {
            id: 'disp-1',
            disputeStatus: DisputeStatus.OPEN,
            slaDueAt: pastDate,
            order: { id: 'ord-1', customer: { firstName: 'Alice' } },
            seller: { displayName: 'Seller A' },
            product: { name: 'Shirt' },
          },
          {
            id: 'disp-2',
            disputeStatus: DisputeStatus.OPEN,
            slaDueAt: futureDate,
            order: { id: 'ord-2', customer: { firstName: 'Bob' } },
            seller: { displayName: 'Seller B' },
            product: { name: 'Jeans' },
          },
        ]);

        const res = await service.listAdminDisputes({ page: 1, limit: 10 });
        expect(res.success).toBe(true);
        expect(res.data).toHaveLength(2);
        expect(res.data[0].isOverdue).toBe(true);
        expect(res.data[1].isOverdue).toBe(false);
      });
    });
  });
});
