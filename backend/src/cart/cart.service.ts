import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CartStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CustomerService } from '../customer/customer.service';
import { AddToCartDto, UpdateCartItemDto } from './dto';

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
            inventory: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let subtotal = 0;
    let totalQuantity = 0;

    const formattedItems = items.map((item: any) => {
      const product = item.product;
      const price = Number(product.price);
      const itemSubtotal = price * item.quantity;
      const availableStock = product.inventory?.availableQuantity ?? 0;
      const isAvailable =
        product.status === ProductStatus.ACTIVE &&
        !product.deletedAt &&
        availableStock >= item.quantity;

      subtotal += itemSubtotal;
      totalQuantity += item.quantity;

      const primaryImage =
        product.images.find((img: any) => img.isPrimary)?.imageUrl ||
        product.images[0]?.imageUrl ||
        null;

      return {
        id: item.id,
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price,
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

    return {
      success: true,
      data: {
        cartId: cart.id,
        items: formattedItems,
        totalItems: formattedItems.length,
        totalQuantity,
        subtotal,
      },
    };
  }

  async addItem(userId: string, dto: AddToCartDto) {
    const cart = await this.getOrCreateActiveCart(userId);

    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        deletedAt: null,
      },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is not available for purchase');
    }

    const availableStock = product.inventory?.availableQuantity ?? 0;
    if (availableStock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient inventory available. Only ${availableStock} units remaining.`,
      );
    }

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      const mergedQuantity = existingItem.quantity + dto.quantity;
      if (mergedQuantity > availableStock) {
        throw new BadRequestException(
          `Requested total quantity (${mergedQuantity}) exceeds available stock (${availableStock})`,
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
          productId: dto.productId,
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
        product: {
          include: { inventory: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (
      item.product.status !== ProductStatus.ACTIVE ||
      item.product.deletedAt
    ) {
      throw new BadRequestException('Product is no longer available');
    }

    const availableStock = item.product.inventory?.availableQuantity ?? 0;
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
        product: {
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
      const price = Number(product.price);
      const itemSubtotal = price * item.quantity;
      const availableStock = product.inventory?.availableQuantity ?? 0;

      let isItemValid = true;
      let errorReason: string | null = null;

      if (product.deletedAt || product.status !== ProductStatus.ACTIVE) {
        isItemValid = false;
        errorReason = `Product "${product.name}" is no longer available`;
        errors.push(errorReason);
      } else if (availableStock < item.quantity) {
        isItemValid = false;
        errorReason = `Product "${product.name}" only has ${availableStock} units available (requested ${item.quantity})`;
        errors.push(errorReason);
      }

      subtotal += itemSubtotal;
      totalQuantity += item.quantity;

      itemValidations.push({
        id: item.id,
        productId: product.id,
        name: product.name,
        sku: product.sku,
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
