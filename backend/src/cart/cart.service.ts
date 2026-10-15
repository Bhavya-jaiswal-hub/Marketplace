import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CartStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CustomerService } from '../customer/customer.service';
import { AddToCartDto, UpdateCartItemDto } from './dto';

export const PLATFORM_SHIPPING_CONFIG = {
  FLAT_FEE_PER_SELLER: 79.0,
  FREE_SHIPPING_THRESHOLD: 999.0,
};

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
  ) {}

  async getOrCreateActiveCart(userId: string) {
    const profileRes = await this.customerService.getOrCreateProfile(userId);
    const customerId = profileRes.data.id;

    let cart = await this.prisma.cart.findFirst({
      where: {
        customerId,
        status: CartStatus.ACTIVE,
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          customerId,
          status: CartStatus.ACTIVE,
        },
      });
    }

    return cart;
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateActiveCart(userId);

    const items: any[] = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: {
          include: {
            images: {
              orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
            },
            category: true,
            seller: true,
          },
        },
        variant: {
          include: {
            inventory: true,
            images: {
              orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let subtotal = 0;
    let totalQuantity = 0;

    const formattedItems = items.map((item: any) => {
      const product = item.product;
      const variant = item.variant;
      const unitPrice = variant?.priceOverride ? Number(variant.priceOverride) : Number(product.price);
      const itemSubtotal = unitPrice * item.quantity;
      const availableStock = variant?.inventory?.availableQuantity ?? variant?.stockQuantity ?? 0;
      const isAvailable =
        variant?.isActive &&
        product.status === ProductStatus.ACTIVE &&
        !product.deletedAt &&
        availableStock >= item.quantity;

      subtotal += itemSubtotal;
      totalQuantity += item.quantity;

      const primaryImage =
        variant?.images?.[0]?.imageUrl ||
        product.images.find((img: any) => img.isPrimary)?.imageUrl ||
        product.images[0]?.imageUrl ||
        null;

      return {
        id: item.id,
        productId: product.id,
        variantId: variant?.id || item.variantId,
        name: product.name,
        sku: variant?.sku || product.sku,
        size: variant?.size || null,
        color: variant?.color || null,
        price: unitPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        primaryImage,
        category: {
          id: product.category.id,
          name: product.category.name,
        },
        seller: {
          id: product.seller.id,
          displayName: product.seller.displayName,
          businessName: product.seller.businessName,
        },
        availableStock,
        isAvailable,
        status: product.status,
      };
    });

    // Group items by seller for shipping calculation and free shipping nudges (FR-7, FR-8)
    const sellerMap = new Map<string, any>();
    for (const item of formattedItems) {
      const sId = item.seller.id;
      if (!sellerMap.has(sId)) {
        sellerMap.set(sId, {
          sellerId: sId,
          sellerName: item.seller.displayName || item.seller.businessName,
          items: [],
          subtotal: 0,
        });
      }
      const group = sellerMap.get(sId);
      group.items.push(item);
      group.subtotal += item.subtotal;
    }

    let totalShippingAmount = 0;
    const sellerGroups = Array.from(sellerMap.values()).map((group) => {
      const freeShippingEligible = group.subtotal >= PLATFORM_SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD;
      const shippingFee = freeShippingEligible ? 0 : PLATFORM_SHIPPING_CONFIG.FLAT_FEE_PER_SELLER;
      const amountNeeded = Math.max(
        0,
        Number((PLATFORM_SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD - group.subtotal).toFixed(2)),
      );
      totalShippingAmount += shippingFee;

      return {
        sellerId: group.sellerId,
        sellerName: group.sellerName,
        subtotal: group.subtotal,
        itemCount: group.items.length,
        items: group.items,
        shippingFee,
        freeShippingThreshold: PLATFORM_SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD,
        freeShippingEligible,
        amountNeededForFreeShipping: amountNeeded,
        freeShippingNudge: freeShippingEligible
          ? 'Free shipping unlocked for this seller!'
          : `Add ₹${amountNeeded} more for free shipping from this seller`,
      };
    });

    return {
      success: true,
      data: {
        cartId: cart.id,
        items: formattedItems,
        sellerGroups,
        totalItems: formattedItems.length,
        totalQuantity,
        subtotal,
        shippingAmount: totalShippingAmount,
        totalAmount: subtotal + totalShippingAmount,
      },
    };
  }

  async addItem(userId: string, dto: AddToCartDto) {
    const cart = await this.getOrCreateActiveCart(userId);

    // Validate variant
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: {
        product: true,
        inventory: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    if (!variant.isActive) {
      throw new BadRequestException('Selected product variant is inactive');
    }

    if (
      variant.product.status !== ProductStatus.ACTIVE ||
      variant.product.deletedAt !== null
    ) {
      throw new BadRequestException('Product is not available for purchase');
    }

    const availableStock = variant.inventory?.availableQuantity ?? variant.stockQuantity ?? 0;
    if (availableStock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient inventory available for variant '${variant.sku}'. Only ${availableStock} units remaining.`,
      );
    }

    // Check if variant already exists in customer's cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId: dto.variantId,
        },
      },
    });

    if (existingItem) {
      const mergedQuantity = existingItem.quantity + dto.quantity;
      if (mergedQuantity > availableStock) {
        throw new BadRequestException(
          `Requested total quantity (${mergedQuantity}) exceeds available stock (${availableStock}) for variant '${variant.sku}'`,
        );
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: mergedQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: variant.productId,
          variantId: variant.id,
          quantity: dto.quantity,
        },
      });
    }

    return this.getCart(userId);
  }

  async updateItemQuantity(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ) {
    const cart = await this.getOrCreateActiveCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      include: {
        product: true,
        variant: {
          include: { inventory: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (
      !item.variant.isActive ||
      item.product.status !== ProductStatus.ACTIVE ||
      item.product.deletedAt
    ) {
      throw new BadRequestException('Product variant is no longer available');
    }

    const availableStock =
      item.variant.inventory?.availableQuantity ?? item.variant.stockQuantity ?? 0;
    if (dto.quantity > availableStock) {
      throw new BadRequestException(
        `Requested quantity (${dto.quantity}) exceeds available stock (${availableStock})`,
      );
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateActiveCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateActiveCart(userId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return {
      success: true,
      message: 'Cart cleared successfully',
    };
  }

  async validateCart(userId: string) {
    const cart = await this.getOrCreateActiveCart(userId);

    const items: any[] = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: true,
        variant: {
          include: { inventory: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (items.length === 0) {
      return {
        success: true,
        data: {
          isValid: false,
          message: 'Cart is empty',
          items: [],
          subtotal: 0,
          totalQuantity: 0,
          warnings: [],
          errors: ['Cart is empty'],
        },
      };
    }

    let subtotal = 0;
    let totalQuantity = 0;
    const itemValidations: any[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const item of items) {
      const product = item.product;
      const variant = item.variant;
      const price = variant?.priceOverride ? Number(variant.priceOverride) : Number(product.price);
      const itemSubtotal = price * item.quantity;
      const availableStock =
        variant?.inventory?.availableQuantity ?? variant?.stockQuantity ?? 0;

      let isItemValid = true;
      let errorReason: string | null = null;

      if (
        !variant ||
        !variant.isActive ||
        product.deletedAt ||
        product.status !== ProductStatus.ACTIVE
      ) {
        isItemValid = false;
        errorReason = `Product variant "${variant?.sku || product.name}" is no longer available`;
        errors.push(errorReason);
      } else if (availableStock < item.quantity) {
        isItemValid = false;
        errorReason = `Variant "${variant.sku}" only has ${availableStock} units available (requested ${item.quantity})`;
        errors.push(errorReason);
      }

      subtotal += itemSubtotal;
      totalQuantity += item.quantity;

      itemValidations.push({
        id: item.id,
        productId: product.id,
        variantId: variant?.id,
        name: product.name,
        sku: variant?.sku,
        size: variant?.size,
        color: variant?.color,
        price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        availableStock,
        isValid: isItemValid,
        errorReason,
      });
    }

    const isValid = errors.length === 0;

    return {
      success: true,
      data: {
        cartId: cart.id,
        isValid,
        items: itemValidations,
        totalItems: itemValidations.length,
        totalQuantity,
        subtotal,
        warnings,
        errors,
      },
    };
  }
}
