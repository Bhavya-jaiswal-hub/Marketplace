import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from '../src/cart/cart.service';
import { CartStatus, ProductStatus } from '@prisma/client';

describe('CartService', () => {
  let service: CartService;
  let prisma: any;
  let customerService: any;

  const mockProfile = {
    id: 'prof-1',
    userId: 'user-cust-1',
  };

  const mockCart = {
    id: 'cart-1',
    customerId: 'prof-1',
    status: CartStatus.ACTIVE,
  };

  const mockProduct = {
    id: 'prod-1',
    name: 'Wireless Headphones',
    sku: 'WH-1000',
    price: 4999.0,
    status: ProductStatus.ACTIVE,
    deletedAt: null,
    images: [{ imageUrl: 'https://example.com/headphone.jpg', isPrimary: true }],
    category: { id: 'cat-1', name: 'Electronics' },
    seller: { id: 'seller-1', displayName: 'TechStore', businessName: 'TechCorp' },
    inventory: {
      availableQuantity: 10,
      reservedQuantity: 0,
      totalQuantity: 10,
    },
  };

  beforeEach(() => {
    prisma = {
      cart: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      cartItem: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
      },
    };

    customerService = {
      getOrCreateProfile: jest.fn().mockResolvedValue({
        success: true,
        data: mockProfile,
      }),
    };

    service = new CartService(prisma, customerService);
  });

  describe('getCart', () => {
    it('should return cart with formatted items, images, and subtotal', async () => {
      prisma.cart.findFirst.mockResolvedValue(mockCart);
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: 'prod-1',
          quantity: 2,
          product: mockProduct,
        },
      ]);

      const res = await service.getCart('user-cust-1');
      expect(res.success).toBe(true);
      expect(res.data.cartId).toBe('cart-1');
      expect(res.data.items).toHaveLength(1);
      expect(res.data.totalQuantity).toBe(2);
      expect(res.data.subtotal).toBe(9998.0);
      expect(res.data.items[0].primaryImage).toBe(
        'https://example.com/headphone.jpg',
      );
      expect(res.data.items[0].isAvailable).toBe(true);
    });
  });

  describe('addItem', () => {
    beforeEach(() => {
      prisma.cart.findFirst.mockResolvedValue(mockCart);
    });

    it('should add new item to cart when inventory is sufficient', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.cartItem.findUnique.mockResolvedValue(null);
      prisma.cartItem.create.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'prod-1',
        quantity: 2,
      });
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: 'prod-1',
          quantity: 2,
          product: mockProduct,
        },
      ]);

      const res = await service.addItem('user-cust-1', {
        productId: 'prod-1',
        quantity: 2,
      });

      expect(res.success).toBe(true);
      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: 'cart-1',
          productId: 'prod-1',
          quantity: 2,
        },
      });
    });

    it('should merge quantities when product is already in cart', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'prod-1',
        quantity: 2,
      });
      prisma.cartItem.update.mockResolvedValue({
        id: 'item-1',
        quantity: 5,
      });
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: 'prod-1',
          quantity: 5,
          product: mockProduct,
        },
      ]);

      const res = await service.addItem('user-cust-1', {
        productId: 'prod-1',
        quantity: 3,
      });

      expect(res.success).toBe(true);
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 5 },
      });
    });

    it('should reject when product is inactive or deleted', async () => {
      prisma.product.findFirst.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.PAUSED,
      });

      await expect(
        service.addItem('user-cust-1', {
          productId: 'prod-1',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when requested quantity exceeds available stock', async () => {
      prisma.product.findFirst.mockResolvedValue({
        ...mockProduct,
        inventory: { availableQuantity: 2 },
      });

      await expect(
        service.addItem('user-cust-1', {
          productId: 'prod-1',
          quantity: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateItemQuantity', () => {
    beforeEach(() => {
      prisma.cart.findFirst.mockResolvedValue(mockCart);
    });

    it('should update cart item quantity within inventory bounds', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        quantity: 2,
        product: mockProduct,
      });
      prisma.cartItem.update.mockResolvedValue({
        id: 'item-1',
        quantity: 4,
      });
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          cartId: 'cart-1',
          quantity: 4,
          product: mockProduct,
        },
      ]);

      const res = await service.updateItemQuantity('user-cust-1', 'item-1', {
        quantity: 4,
      });

      expect(res.success).toBe(true);
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 4 },
      });
    });

    it('should reject update if quantity exceeds available stock', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        quantity: 2,
        product: {
          ...mockProduct,
          inventory: { availableQuantity: 3 },
        },
      });

      await expect(
        service.updateItemQuantity('user-cust-1', 'item-1', { quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeItem and clearCart', () => {
    beforeEach(() => {
      prisma.cart.findFirst.mockResolvedValue(mockCart);
    });

    it('should remove item from cart', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
      });
      prisma.cartItem.delete.mockResolvedValue({ id: 'item-1' });
      prisma.cartItem.findMany.mockResolvedValue([]);

      const res = await service.removeItem('user-cust-1', 'item-1');
      expect(res.success).toBe(true);
      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });

    it('should clear all items in active cart', async () => {
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 3 });

      const res = await service.clearCart('user-cust-1');
      expect(res.success).toBe(true);
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
    });
  });

  describe('validateCart', () => {
    beforeEach(() => {
      prisma.cart.findFirst.mockResolvedValue(mockCart);
    });

    it('should validate cart as valid when all products are active and in stock', async () => {
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          cartId: 'cart-1',
          quantity: 2,
          product: mockProduct,
        },
      ]);

      const res = await service.validateCart('user-cust-1');
      expect(res.success).toBe(true);
      expect(res.data.isValid).toBe(true);
      expect(res.data.subtotal).toBe(9998.0);
      expect(res.data.errors).toHaveLength(0);
    });

    it('should flag cart as invalid when a product is inactive or out of stock', async () => {
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          cartId: 'cart-1',
          quantity: 5,
          product: {
            ...mockProduct,
            inventory: { availableQuantity: 2 },
          },
        },
      ]);

      const res = await service.validateCart('user-cust-1');
      expect(res.success).toBe(true);
      expect(res.data.isValid).toBe(false);
      expect(res.data.errors).toHaveLength(1);
      expect(res.data.items[0].isValid).toBe(false);
    });
  });
});
