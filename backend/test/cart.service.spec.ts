import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService, PLATFORM_SHIPPING_CONFIG } from '../src/cart/cart.service';
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
    name: 'Cotton Oxford Shirt',
    sku: 'OXFORD-SHIRT',
    price: 1299.0,
    status: ProductStatus.ACTIVE,
    deletedAt: null,
    images: [{ imageUrl: 'https://example.com/shirt.jpg', isPrimary: true }],
    category: { id: 'cat-1', name: "Men's Clothing" },
    seller: { id: 'seller-1', displayName: 'Apex Apparel', businessName: 'Apex Clothing' },
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
    inventory: {
      id: 'inv-1',
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
        findUnique: jest.fn(),
      },
      productVariant: {
        findUnique: jest.fn(),
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
    it('should return cart with formatted variant items, seller groups, and shipping fee calculation', async () => {
      prisma.cart.findFirst.mockResolvedValue(mockCart);
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 2,
          product: mockProduct,
          variant: mockVariant,
        },
      ]);

      const res = await service.getCart('user-cust-1');
      expect(res.success).toBe(true);
      expect(res.data.cartId).toBe('cart-1');
      expect(res.data.items).toHaveLength(1);
      expect(res.data.totalQuantity).toBe(2);
      expect(res.data.subtotal).toBe(2598.0);
      expect(res.data.items[0].variantId).toBe('var-1');
      expect(res.data.items[0].sku).toBe('OXFORD-SHIRT-BLU-L');
      expect(res.data.items[0].size).toBe('L');
      expect(res.data.items[0].color).toBe('Blue');
      expect(res.data.items[0].primaryImage).toBe('https://example.com/shirt.jpg');
      expect(res.data.items[0].isAvailable).toBe(true);

      // Subtotal 2598 >= 999 threshold -> free shipping unlocked
      expect(res.data.shippingAmount).toBe(0);
      expect(res.data.totalAmount).toBe(2598.0);
      expect(res.data.sellerGroups).toHaveLength(1);
      expect(res.data.sellerGroups[0].freeShippingEligible).toBe(true);
      expect(res.data.sellerGroups[0].shippingFee).toBe(0);
    });

    it('should apply flat shipping fee and provide nudge when seller subtotal is below threshold', async () => {
      prisma.cart.findFirst.mockResolvedValue(mockCart);
      const lowPriceProduct = { ...mockProduct, price: 499.0 };
      const lowPriceVariant = { ...mockVariant, product: lowPriceProduct };

      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 1,
          product: lowPriceProduct,
          variant: lowPriceVariant,
        },
      ]);

      const res = await service.getCart('user-cust-1');
      expect(res.success).toBe(true);
      expect(res.data.subtotal).toBe(499.0);
      expect(res.data.shippingAmount).toBe(PLATFORM_SHIPPING_CONFIG.FLAT_FEE_PER_SELLER);
      expect(res.data.totalAmount).toBe(499.0 + PLATFORM_SHIPPING_CONFIG.FLAT_FEE_PER_SELLER);

      const group = res.data.sellerGroups[0];
      expect(group.freeShippingEligible).toBe(false);
      expect(group.shippingFee).toBe(79.0);
      expect(group.amountNeededForFreeShipping).toBe(500.0);
      expect(group.freeShippingNudge).toContain('Add ₹500 more for free shipping');
    });
  });

  describe('addItem', () => {
    beforeEach(() => {
      prisma.cart.findFirst.mockResolvedValue(mockCart);
    });

    it('should add new variant to cart when inventory is sufficient', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(mockVariant);
      prisma.cartItem.findUnique.mockResolvedValue(null);
      prisma.cartItem.create.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'prod-1',
        variantId: 'var-1',
        quantity: 2,
      });
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 2,
          product: mockProduct,
          variant: mockVariant,
        },
      ]);

      const res = await service.addItem('user-cust-1', {
        variantId: 'var-1',
        quantity: 2,
      });

      expect(res.success).toBe(true);
      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: 'cart-1',
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 2,
        },
      });
    });

    it('should merge quantities when variant is already in cart', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(mockVariant);
      prisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'prod-1',
        variantId: 'var-1',
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
          variantId: 'var-1',
          quantity: 5,
          product: mockProduct,
          variant: mockVariant,
        },
      ]);

      const res = await service.addItem('user-cust-1', {
        variantId: 'var-1',
        quantity: 3,
      });

      expect(res.success).toBe(true);
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 5 },
      });
    });

    it('should reject when variant does not exist', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem('user-cust-1', {
          variantId: 'non-existent-var',
          quantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when variant is inactive', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({
        ...mockVariant,
        isActive: false,
      });

      await expect(
        service.addItem('user-cust-1', {
          variantId: 'var-1',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when parent product is paused or deleted', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({
        ...mockVariant,
        product: {
          ...mockProduct,
          status: ProductStatus.PAUSED,
        },
      });

      await expect(
        service.addItem('user-cust-1', {
          variantId: 'var-1',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when requested quantity exceeds available stock for variant', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({
        ...mockVariant,
        inventory: { availableQuantity: 2 },
      });

      await expect(
        service.addItem('user-cust-1', {
          variantId: 'var-1',
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
        variant: mockVariant,
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
          variant: mockVariant,
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

    it('should reject update if quantity exceeds available variant stock', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        quantity: 2,
        product: mockProduct,
        variant: {
          ...mockVariant,
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

    it('should validate cart as valid when all variants are active and in stock', async () => {
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 2,
          product: mockProduct,
          variant: mockVariant,
        },
      ]);

      const res = await service.validateCart('user-cust-1');
      expect(res.success).toBe(true);
      expect(res.data.isValid).toBe(true);
      expect(res.data.subtotal).toBe(2598.0);
      expect(res.data.errors).toHaveLength(0);
    });

    it('should flag cart as invalid when a variant is out of stock', async () => {
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 5,
          product: mockProduct,
          variant: {
            ...mockVariant,
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
