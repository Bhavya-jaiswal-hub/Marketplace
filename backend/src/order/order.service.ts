import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommissionStatus,
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CustomerService } from '../customer/customer.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import {
  CancelOrderDto,
  InitiateCheckoutDto,
  OrderQueryDto,
  UpdateFulfillmentStatusDto,
} from './dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
    private readonly inventoryService: InventoryService,
    private readonly audit: AuditService,
  ) {}

  async initiateCheckout(userId: string, dto: InitiateCheckoutDto) {
    const profileRes = await this.customerService.getOrCreateProfile(userId);
    const customer = profileRes.data;

    // Validate shipping address
    const shippingAddress = await this.prisma.customerAddress.findFirst({
      where: {
        id: dto.shippingAddressId,
        customerId: customer.id,
        isActive: true,
      },
    });

    if (!shippingAddress) {
      throw new BadRequestException(
        'Valid active shipping address is required for checkout',
      );
    }

    // Retrieve active cart with variants and products
    const cart = await this.prisma.cart.findFirst({
      where: {
        customerId: customer.id,
        status: 'ACTIVE',
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: {
                  include: {
                    commissions: {
                      where: { status: CommissionStatus.ACTIVE },
                      orderBy: { effectiveFrom: 'desc' },
                      take: 1,
                    },
                  },
                },
              },
            },
            variant: {
              include: {
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Shopping cart is empty');
    }

    // Check idempotency if key provided
    if (dto.idempotencyKey) {
      const existingPayment = await this.prisma.paymentPending.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { order: true },
      });
      if (existingPayment) {
        return {
          success: true,
          data: {
            orderId: existingPayment.orderId,
            orderNumber: existingPayment.order.orderNumber,
            paymentReference: existingPayment.paymentReference,
            providerOrderReference: existingPayment.providerOrderReference,
            amount: Number(existingPayment.amount),
            currency: existingPayment.currency,
            expiresAt: existingPayment.expiresAt,
          },
        };
      }
    }

    // Validate each cart item and variant inventory
    for (const item of cart.items) {
      const product = item.product;
      const variant = item.variant;

      if (!variant || !variant.isActive) {
        throw new BadRequestException(
          `Product variant for "${product.name}" is no longer active`,
        );
      }

      if (product.deletedAt || product.status !== ProductStatus.ACTIVE) {
        throw new BadRequestException(
          `Product "${product.name}" is no longer available for purchase`,
        );
      }

      const availableStock = variant.inventory?.availableQuantity ?? variant.stockQuantity ?? 0;
      if (availableStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}" (${variant.size} / ${variant.color}). Available: ${availableStock}, Requested: ${item.quantity}`,
        );
      }
    }

    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentReference = `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const providerOrderReference = `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

    // Atomically reserve inventory for all items in batch using variantId
    await this.inventoryService.reserveStock({
      reservationId: orderNumber,
      items: cart.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    });

    // Group items by seller for platform shipping fee calculation (FR-8)
    const sellerItemsMap = new Map<string, any[]>();
    for (const item of cart.items) {
      const sId = item.product.sellerId;
      if (!sellerItemsMap.has(sId)) sellerItemsMap.set(sId, []);
      sellerItemsMap.get(sId)!.push(item);
    }

    const FLAT_FEE_PER_SELLER = 79.0;
    const FREE_SHIPPING_THRESHOLD = 999.0;

    let totalShippingAmount = 0;
    const sellerShippingMap = new Map<string, number>();

    for (const [sellerId, items] of sellerItemsMap.entries()) {
      const sellerSubtotal = items.reduce((sum, item) => {
        const unitPrice = item.variant?.priceOverride
          ? Number(item.variant.priceOverride)
          : Number(item.product.price);
        return sum + unitPrice * item.quantity;
      }, 0);

      const fee = sellerSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_FEE_PER_SELLER;
      sellerShippingMap.set(sellerId, fee);
      totalShippingAmount += fee;
    }

    // Calculate item and order totals with snapshots
    let orderSubtotal = 0;
    const orderItemsData = cart.items.map((item) => {
      const product = item.product;
      const variant = item.variant;
      const unitPrice = variant?.priceOverride
        ? Number(variant.priceOverride)
        : Number(product.price);
      const subtotal = unitPrice * item.quantity;
      orderSubtotal += subtotal;

      // Item shipping share within its seller shipment
      const sellerItems = sellerItemsMap.get(product.sellerId) || [];
      const sellerFee = sellerShippingMap.get(product.sellerId) || 0;
      const sellerSubtotal = sellerItems.reduce((sum, it) => {
        const up = it.variant?.priceOverride
          ? Number(it.variant.priceOverride)
          : Number(it.product.price);
        return sum + up * it.quantity;
      }, 0);
      const shippingFeeShare =
        sellerSubtotal > 0 ? Number(((subtotal / sellerSubtotal) * sellerFee).toFixed(2)) : 0;

      const commissionRate =
        product.category?.commissions?.[0]?.commissionRate !== undefined
          ? Number(product.category.commissions[0].commissionRate)
          : 0.0;
      const commissionAmount = Number(((subtotal * commissionRate) / 100).toFixed(2));
      const sellerEarnings = Number((subtotal - commissionAmount + shippingFeeShare).toFixed(2));

      return {
        productId: product.id,
        variantId: variant.id,
        sellerId: product.sellerId,
        productName: product.name,
        sku: variant.sku,
        productNameSnapshot: product.name,
        skuSnapshot: variant.sku,
        sizeSnapshot: variant.size,
        colorSnapshot: variant.color,
        unitPrice,
        quantity: item.quantity,
        subtotal,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: subtotal,
        commissionRate,
        commissionAmount,
        shippingFeeShare,
        sellerEarnings,
        status: OrderItemStatus.PLACED,
      };
    });

    const shippingAddressSnapshot = {
      fullName: shippingAddress.fullName,
      phoneNumber: shippingAddress.phoneNumber,
      addressLine1: shippingAddress.addressLine1,
      addressLine2: shippingAddress.addressLine2,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country,
      addressType: shippingAddress.addressType,
    };

    const totalAmount = Number((orderSubtotal + totalShippingAmount).toFixed(2));

    // Create Order and items
    const order = await this.prisma.order.create({
      data: {
        customerId: customer.id,
        orderNumber,
        shippingAddressId: shippingAddress.id,
        shippingAddressSnapshot,
        orderStatus: OrderStatus.PLACED,
        paymentStatus: PaymentStatus.PENDING,
        currency: 'INR',
        subtotal: orderSubtotal,
        shippingAmount: totalShippingAmount,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount,
        orderItems: {
          create: orderItemsData.map((item) => ({
            ...item,
            history: {
              create: {
                newStatus: OrderItemStatus.PLACED,
                eventType: 'Created',
                reason: 'Order placed by customer',
                changedBy: userId,
              },
            },
          })),
        },
      },
    });

    // Create Payment Pending record
    const paymentPending = await this.prisma.paymentPending.create({
      data: {
        orderId: order.id,
        customerId: customer.id,
        paymentReference,
        providerOrderReference,
        amount: totalAmount,
        currency: 'INR',
        status: PaymentStatus.PENDING,
        attemptNumber: 1,
        idempotencyKey: dto.idempotencyKey || null,
        expiresAt,
      },
    });

    // Clear customer cart
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    await this.audit.logAction({
      userId,
      action: 'ORDER_INITIATED',
      resourceType: 'Order',
      resourceId: order.id,
      newValue: {
        orderNumber,
        totalAmount,
        itemCount: orderItemsData.length,
      },
    });

    return {
      success: true,
      data: {
        orderId: order.id,
        orderNumber,
        paymentReference,
        providerOrderReference,
        amount: totalAmount,
        currency: 'INR',
        expiresAt,
      },
      message: 'Checkout initiated and inventory reserved for 15 minutes',
    };
  }

  async listCustomerOrders(userId: string, query: OrderQueryDto) {
    const profileRes = await this.customerService.getOrCreateProfile(userId);
    const customer = profileRes.data;

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      customerId: customer.id,
      ...(query.status && { orderStatus: query.status }),
      ...(query.paymentStatus && { paymentStatus: query.paymentStatus }),
      ...(query.startDate &&
        query.endDate && {
          createdAt: {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
          },
        }),
    };

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where: whereClause }),
      this.prisma.order.findMany({
        where: whereClause,
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCustomerOrder(userId: string, orderId: string) {
    const profileRes = await this.customerService.getOrCreateProfile(userId);
    const customer = profileRes.data;

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: customer.id,
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
                },
              },
            },
            history: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        paymentsPending: true,
        paymentTransactions: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      success: true,
      data: order,
    };
  }

  async cancelOrder(userId: string, orderId: string, dto: CancelOrderDto) {
    const profileRes = await this.customerService.getOrCreateProfile(userId);
    const customer = profileRes.data;

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: customer.id,
      },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.orderStatus === OrderStatus.CANCELLED ||
      order.orderStatus === OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        `Order in status "${order.orderStatus}" cannot be cancelled`,
      );
    }

    const itemsToCancel = dto.orderItemIds?.length
      ? order.orderItems.filter((i) => dto.orderItemIds!.includes(i.id))
      : order.orderItems;

    for (const item of itemsToCancel) {
      if (
        item.status === OrderItemStatus.SHIPPED ||
        item.status === OrderItemStatus.DELIVERED
      ) {
        throw new BadRequestException(
          `Cannot cancel item "${item.productName}" because it has already been shipped or delivered`,
        );
      }

      await this.prisma.orderItem.update({
        where: { id: item.id },
        data: {
          status: OrderItemStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: dto.reason,
        },
      });

      await this.prisma.orderItemHistory.create({
        data: {
          orderItemId: item.id,
          previousStatus: item.status,
          newStatus: OrderItemStatus.CANCELLED,
          eventType: 'Cancelled',
          reason: dto.reason,
          changedBy: userId,
        },
      });

      // Restock inventory if paid
      if (order.paymentStatus === PaymentStatus.PAID) {
        await this.inventoryService.adjustStock(userId, item.productId, {
          mode: 'ADD' as any,
          quantity: item.quantity,
          reason: `Restock cancelled order item ${item.id}`,
        });
      }
    }

    // If payment was not yet captured, release reservations for all cancelled items in batch
    if (order.paymentStatus !== PaymentStatus.PAID) {
      await this.inventoryService.releaseReservation({
        reservationId: order.orderNumber,
        items: itemsToCancel.map((i) => ({
          variantId: i.variantId,
          productId: i.productId,
          quantity: i.quantity,
        })),
      });
    }

    // Check if all order items are now cancelled
    const updatedItems = await this.prisma.orderItem.findMany({
      where: { orderId: order.id },
    });

    const allCancelled = updatedItems.every(
      (i) => i.status === OrderItemStatus.CANCELLED,
    );

    if (allCancelled) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { orderStatus: OrderStatus.CANCELLED },
      });
    }

    await this.audit.logAction({
      userId,
      action: 'ORDER_CANCELLED',
      resourceType: 'Order',
      resourceId: order.id,
      newValue: {
        reason: dto.reason,
        cancelledItemCount: itemsToCancel.length,
        allCancelled,
      },
    });

    return this.getCustomerOrder(userId, orderId);
  }

  async listSellerOrders(userId: string, query: OrderQueryDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new ForbiddenException('Seller profile is required');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      sellerId: seller.id,
      ...(query.status && { status: query.status }),
      ...(query.startDate &&
        query.endDate && {
          createdAt: {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
          },
        }),
    };

    const [total, items] = await Promise.all([
      this.prisma.orderItem.count({ where: whereClause }),
      this.prisma.orderItem.findMany({
        where: whereClause,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              orderStatus: true,
              paymentStatus: true,
              shippingAddressSnapshot: true,
              createdAt: true,
            },
          },
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          history: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateSellerOrderItemStatus(
    userId: string,
    orderId: string,
    orderItemId: string,
    dto: UpdateFulfillmentStatusDto,
  ) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new ForbiddenException('Seller profile is required');
    }

    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        orderId,
        sellerId: seller.id,
      },
      include: {
        order: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Order item not found for this seller');
    }

    // Validate status transitions per SRS Section 8.1
    const validTransitions: Record<string, string[]> = {
      [OrderItemStatus.PLACED]: [OrderItemStatus.PACKED, OrderItemStatus.CANCELLED],
      [OrderItemStatus.PACKED]: [OrderItemStatus.SHIPPED, OrderItemStatus.CANCELLED],
      [OrderItemStatus.SHIPPED]: [OrderItemStatus.DELIVERED],
      [OrderItemStatus.DELIVERED]: [OrderItemStatus.NOT_RECEIVED_UNDER_DISPUTE],
      [OrderItemStatus.CANCELLED]: [],
      [OrderItemStatus.NOT_RECEIVED_UNDER_DISPUTE]: [],
    };

    const allowed = validTransitions[item.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from "${item.status}" to "${dto.status}"`,
      );
    }

    if (dto.status === OrderItemStatus.SHIPPED) {
      if (!dto.trackingCarrier || !dto.trackingNumber) {
        throw new BadRequestException(
          'Tracking carrier and tracking number are required when shipping an order item',
        );
      }
    }

    const updated = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        status: dto.status,
        ...(dto.status === OrderItemStatus.SHIPPED && {
          shippedAt: new Date(),
          trackingCarrier: dto.trackingCarrier,
          trackingNumber: dto.trackingNumber,
        }),
        ...(dto.status === OrderItemStatus.DELIVERED && {
          deliveredAt: new Date(),
        }),
      },
    });

    await this.prisma.orderItemHistory.create({
      data: {
        orderItemId,
        previousStatus: item.status,
        newStatus: dto.status,
        eventType: 'Status Changed',
        reason: `Status updated to ${dto.status} by seller`,
        changedBy: userId,
      },
    });

    // Check if overall parent Order status can be updated per SRS Section 8.2
    const allOrderItems = await this.prisma.orderItem.findMany({
      where: { orderId },
    });

    const derivedStatus = this.deriveOrderStatus(allOrderItems);
    await this.prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: derivedStatus },
    });

    await this.audit.logAction({
      userId,
      action: 'ORDER_ITEM_FULFILLMENT_UPDATED',
      resourceType: 'OrderItem',
      resourceId: orderItemId,
      previousValue: { status: item.status },
      newValue: {
        status: dto.status,
        trackingCarrier: dto.trackingCarrier,
        trackingNumber: dto.trackingNumber,
      },
    });

    return {
      success: true,
      data: updated,
      message: `Order item status updated to ${dto.status}`,
    };
  }

  async listAdminOrders(query: OrderQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      ...(query.status && { orderStatus: query.status }),
      ...(query.paymentStatus && { paymentStatus: query.paymentStatus }),
      ...(query.startDate &&
        query.endDate && {
          createdAt: {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
          },
        }),
    };

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where: whereClause }),
      this.prisma.order.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              user: {
                select: { email: true },
              },
            },
          },
          orderItems: {
            include: {
              seller: {
                select: {
                  id: true,
                  displayName: true,
                  businessName: true,
                },
              },
            },
          },
          paymentTransactions: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAdminOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true },
            },
          },
        },
        orderItems: {
          include: {
            seller: true,
            product: true,
            history: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        paymentsPending: true,
        paymentTransactions: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      success: true,
      data: order,
    };
  }

  deriveOrderStatus(items: Array<{ status: OrderItemStatus }>): OrderStatus {
    if (!items || items.length === 0) {
      return OrderStatus.PLACED;
    }

    if (items.some((i) => i.status === OrderItemStatus.NOT_RECEIVED_UNDER_DISPUTE)) {
      return OrderStatus.UNDER_DISPUTE;
    }

    if (items.every((i) => i.status === OrderItemStatus.CANCELLED)) {
      return OrderStatus.CANCELLED;
    }

    const nonCancelled = items.filter((i) => i.status !== OrderItemStatus.CANCELLED);
    if (nonCancelled.length > 0 && nonCancelled.every((i) => i.status === OrderItemStatus.DELIVERED)) {
      return OrderStatus.DELIVERED;
    }

    if (items.some((i) => i.status === OrderItemStatus.DELIVERED)) {
      return OrderStatus.PARTIALLY_DELIVERED;
    }

    if (items.some((i) => i.status === OrderItemStatus.SHIPPED)) {
      return OrderStatus.PARTIALLY_SHIPPED;
    }

    if (items.some((i) => i.status === OrderItemStatus.CANCELLED)) {
      return OrderStatus.PARTIALLY_CANCELLED;
    }

    return OrderStatus.PLACED;
  }
}

