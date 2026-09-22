import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrderService } from '../src/order/order.service';
import {
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
    name: 'Mechanical Keyboard',
    sku: 'KB-01',
    price: 3000.0,
    status: ProductStatus.ACTIVE,
    deletedAt: null,
    inventory: { availableQuantity: 10 },
    category: {
      id: 'cat-1',
      commissions: [{ commissionRate: 10.0 }],
    },
  };

  const mockCart = {
    id: 'cart-1',
    customerId: 'cust-1',
    status: 'ACTIVE',
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        quantity: 2,
        product: mockProduct,
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
        count: jest.fn(),
        update: jest.fn(),
      },
      orderItemHistory: {
        create: jest.fn(),
      },
      sellerProfile: {
        findUnique: jest.fn(),
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
      adjustStock: jest.fn().mockResolvedValue(true),
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

  describe('initiateCheckout', () => {
    it('should successfully reserve stock, snapshot address & commission, and create order', async () => {
      prisma.customerAddress.findFirst.mockResolvedValue(mockAddress);
      prisma.cart.findFirst.mockResolvedValue(mockCart);
      prisma.paymentPending.findUnique.mockResolvedValue(null);

      const createdOrder = {
        id: 'ord-1',
        orderNumber: 'ORD-123',
        totalAmount: 6000.0,
      };
      prisma.order.create.mockResolvedValue(createdOrder);
      prisma.paymentPending.create.mockResolvedValue({
        id: 'pay-1',
        paymentReference: 'PAY-123',
        providerOrderReference: 'order_123',
        amount: 6000.0,
        currency: 'INR',
        expiresAt: new Date(),
      });

      const res = await service.initiateCheckout('user-cust-1', {
        shippingAddressId: 'addr-1',
      });

      expect(res.success).toBe(true);
      expect(inventoryService.reserveStock).toHaveBeenCalledWith({
        reservationId: expect.stringMatching(/^ORD-/),
        items: [{ productId: 'prod-1', quantity: 2 }],
      });
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'cust-1',
            totalAmount: 6000.0,
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

    it('should reject checkout if shipping address is invalid or not owned by customer', async () => {
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

    it('should reject checkout if inventory is insufficient', async () => {
      prisma.customerAddress.findFirst.mockResolvedValue(mockAddress);
      prisma.cart.findFirst.mockResolvedValue({
        ...mockCart,
        items: [
          {
            ...mockCart.items[0],
            quantity: 20, // available is only 10
          },
        ],
      });

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
      orderStatus: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
      orderItems: [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 2,
          productName: 'Mechanical Keyboard',
          status: OrderItemStatus.PENDING,
        },
      ],
    };

    it('should cancel pending order items and release reserved inventory', async () => {
      prisma.order.findFirst.mockResolvedValue(mockOrderToCancel);
      prisma.orderItem.findMany.mockResolvedValue([
        { ...mockOrderToCancel.orderItems[0], status: OrderItemStatus.CANCELLED },
      ]);
      prisma.order.update.mockResolvedValue({
        ...mockOrderToCancel,
        orderStatus: OrderStatus.CANCELLED,
      });

      const res = await service.cancelOrder('user-cust-1', 'ord-1', {
        reason: 'Customer changed mind',
      });

      expect(prisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          status: OrderItemStatus.CANCELLED,
          cancellationReason: 'Customer changed mind',
        }),
      });
      expect(inventoryService.releaseReservation).toHaveBeenCalledWith({
        reservationId: 'ORD-123',
        items: [{ productId: 'prod-1', quantity: 2 }],
      });
    });

    it('should reject cancellation if item is already shipped', async () => {
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
      status: OrderItemStatus.PROCESSING,
      order: { id: 'ord-1', orderStatus: OrderStatus.CONFIRMED },
    };

    it('should allow valid transition to SHIPPED with tracking info', async () => {
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
          trackingCarrier: 'BlueDart',
          trackingNumber: 'BD-987654321',
        },
      );

      expect(res.success).toBe(true);
      expect(prisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          status: OrderItemStatus.SHIPPED,
          trackingCarrier: 'BlueDart',
          trackingNumber: 'BD-987654321',
        }),
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

    it('should reject invalid backward or skip transition', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(mockSeller);
      prisma.orderItem.findFirst.mockResolvedValue({
        ...mockSellerItem,
        status: OrderItemStatus.PENDING,
      });

      // Cannot jump from PENDING directly to DELIVERED
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
});
