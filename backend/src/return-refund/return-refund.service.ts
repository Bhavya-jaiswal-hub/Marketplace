import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { StockAdjustmentMode } from '../inventory/dto';
import {
  CreateReturnRequestDto,
  ApproveReturnRequestDto,
  RejectReturnRequestDto,
  CompleteReturnRequestDto,
  ProcessRefundDto,
  ReturnQueryDto,
  RefundQueryDto,
} from './dto';
import {
  ReturnRequestStatus,
  RefundStatus,
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReturnRefundService {
  private readonly logger = new Logger(ReturnRefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly inventoryService: InventoryService,
  ) {}

  // ================= 1. CUSTOMER RETURN REQUEST WORKFLOW =================

  async createReturnRequest(
    userId: string,
    orderId: string,
    orderItemId: string,
    dto: CreateReturnRequestDto,
  ): Promise<any> {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
        seller: true,
        returnRequests: true,
      },
    });

    if (!orderItem || orderItem.orderId !== orderId) {
      throw new NotFoundException('Order item not found for this order');
    }

    if (orderItem.order.customerId !== customer.id) {
      throw new ForbiddenException('You are not authorized to return items from this order');
    }

    if (orderItem.status !== OrderItemStatus.DELIVERED) {
      throw new BadRequestException(
        `Item cannot be returned. Current item status is '${orderItem.status}'. Item must be DELIVERED to request a return`,
      );
    }

    if (!orderItem.deliveredAt) {
      throw new BadRequestException('Item delivery timestamp is missing');
    }

    // 5-day return window verification
    const returnWindowMs = 5 * 24 * 60 * 60 * 1000;
    const timeSinceDelivery = Date.now() - new Date(orderItem.deliveredAt).getTime();
    if (timeSinceDelivery > returnWindowMs) {
      throw new BadRequestException(
        'Return window expired. Returns must be requested within 5 days of delivery',
      );
    }

    if (dto.returnQuantity <= 0 || dto.returnQuantity > orderItem.quantity) {
      throw new BadRequestException(
        `Invalid return quantity. Eligible return quantity is between 1 and ${orderItem.quantity}`,
      );
    }

    // Check for existing active return request
    const existingActiveRequest = orderItem.returnRequests.find(
      (r) =>
        r.status !== ReturnRequestStatus.REJECTED &&
        r.status !== ReturnRequestStatus.CANCELLED,
    );
    if (existingActiveRequest) {
      throw new BadRequestException(
        `An active return request (${existingActiveRequest.status}) already exists for this item`,
      );
    }

    const returnRequest = await this.prisma.$transaction(async (tx) => {
      const created = await tx.returnRequest.create({
        data: {
          orderId: orderItem.orderId,
          orderItemId: orderItem.id,
          customerId: customer.id,
          sellerId: orderItem.sellerId,
          returnQuantity: dto.returnQuantity,
          reason: dto.reason.trim(),
          customerComments: dto.customerComments?.trim() || null,
          status: ReturnRequestStatus.PENDING,
        },
      });

      await tx.orderItem.update({
        where: { id: orderItem.id },
        data: { status: OrderItemStatus.RETURN_REQUESTED },
      });

      await tx.orderItemHistory.create({
        data: {
          orderItemId: orderItem.id,
          previousStatus: OrderItemStatus.DELIVERED,
          newStatus: OrderItemStatus.RETURN_REQUESTED,
          eventType: 'RETURN_REQUESTED',
          reason: dto.reason.trim(),
          changedBy: userId,
        },
      });

      return created;
    });

    await this.auditService.logAction({
      userId,
      action: 'RETURN_REQUEST_CREATED',
      resourceType: 'ReturnRequest',
      resourceId: returnRequest.id,
      newValue: {
        orderId,
        orderItemId,
        returnQuantity: dto.returnQuantity,
        reason: dto.reason,
      },
    });

    return {
      success: true,
      data: returnRequest,
      message: 'Return request submitted successfully',
    };
  }

  async getCustomerReturns(userId: string, query: ReturnQueryDto): Promise<any> {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = { customerId: customer.id };
    if (query.status) whereClause.status = query.status;
    if (query.orderId) whereClause.orderId = query.orderId;

    const [items, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItem: true,
          seller: { select: { id: true, displayName: true, businessName: true } },
          refund: true,
        },
      }),
      this.prisma.returnRequest.count({ where: whereClause }),
    ]);

    return {
      success: true,
      data: {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      message: 'Customer return requests retrieved successfully',
    };
  }

  async getCustomerReturnById(userId: string, returnId: string): Promise<any> {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        orderItem: true,
        order: true,
        seller: { select: { id: true, displayName: true, businessName: true } },
        refund: true,
      },
    });

    if (!returnRequest || returnRequest.customerId !== customer.id) {
      throw new NotFoundException('Return request not found');
    }

    return {
      success: true,
      data: returnRequest,
      message: 'Return request retrieved successfully',
    };
  }

  // ================= 2. SELLER RETURN LOOKUP WORKFLOW =================

  async getSellerReturns(userId: string, query: ReturnQueryDto): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = { sellerId: seller.id };
    if (query.status) whereClause.status = query.status;
    if (query.orderId) whereClause.orderId = query.orderId;

    const [items, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItem: true,
          customer: { select: { id: true, firstName: true, lastName: true } },
          refund: true,
        },
      }),
      this.prisma.returnRequest.count({ where: whereClause }),
    ]);

    return {
      success: true,
      data: {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      message: 'Seller return requests retrieved successfully',
    };
  }

  async getSellerReturnById(userId: string, returnId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        orderItem: true,
        order: true,
        customer: { select: { id: true, firstName: true, lastName: true } },
        refund: true,
      },
    });

    if (!returnRequest || returnRequest.sellerId !== seller.id) {
      throw new NotFoundException('Return request not found');
    }

    return {
      success: true,
      data: returnRequest,
      message: 'Return request retrieved successfully',
    };
  }

  // ================= 3. SUPER ADMIN RETURN APPROVAL WORKFLOW =================

  async getAdminReturns(query: ReturnQueryDto): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (query.status) whereClause.status = query.status;
    if (query.orderId) whereClause.orderId = query.orderId;
    if (query.sellerId) whereClause.sellerId = query.sellerId;

    const [items, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItem: true,
          order: true,
          customer: { select: { id: true, firstName: true, lastName: true, user: { select: { email: true } } } },
          seller: { select: { id: true, displayName: true, businessName: true } },
          refund: true,
        },
      }),
      this.prisma.returnRequest.count({ where: whereClause }),
    ]);

    return {
      success: true,
      data: {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      message: 'Admin return requests retrieved successfully',
    };
  }

  async getAdminReturnById(returnId: string): Promise<any> {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        orderItem: true,
        order: true,
        customer: { select: { id: true, firstName: true, lastName: true, user: { select: { email: true } } } },
        seller: { select: { id: true, displayName: true, businessName: true } },
        refund: true,
      },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    return {
      success: true,
      data: returnRequest,
      message: 'Return request details retrieved successfully',
    };
  }

  async approveReturnRequest(
    adminUserId: string,
    returnId: string,
    dto: ApproveReturnRequestDto,
  ): Promise<any> {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: { orderItem: true },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.status !== ReturnRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve return request in '${returnRequest.status}' status. Must be PENDING`,
      );
    }

    const nextStatus = dto.pickupCarrier
      ? ReturnRequestStatus.PICKUP_SCHEDULED
      : ReturnRequestStatus.APPROVED;

    const updated = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: nextStatus,
        pickupCarrier: dto.pickupCarrier?.trim() || null,
        pickupTrackingNumber: dto.pickupTrackingNumber?.trim() || null,
        pickupScheduledAt: dto.pickupScheduledAt ? new Date(dto.pickupScheduledAt) : null,
        adminRemarks: dto.adminRemarks?.trim() || null,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'RETURN_REQUEST_APPROVED',
      resourceType: 'ReturnRequest',
      resourceId: returnId,
      previousValue: { status: ReturnRequestStatus.PENDING },
      newValue: {
        status: nextStatus,
        pickupCarrier: dto.pickupCarrier,
        pickupTrackingNumber: dto.pickupTrackingNumber,
      },
    });

    return {
      success: true,
      data: updated,
      message: `Return request approved successfully (${nextStatus})`,
    };
  }

  async rejectReturnRequest(
    adminUserId: string,
    returnId: string,
    dto: RejectReturnRequestDto,
  ): Promise<any> {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: { orderItem: true },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.status !== ReturnRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject return request in '${returnRequest.status}' status. Must be PENDING`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const rejected = await tx.returnRequest.update({
        where: { id: returnId },
        data: {
          status: ReturnRequestStatus.REJECTED,
          rejectionReason: dto.rejectionReason.trim(),
          adminRemarks: dto.adminRemarks?.trim() || null,
        },
      });

      // Restore order item status back to DELIVERED
      await tx.orderItem.update({
        where: { id: returnRequest.orderItemId },
        data: { status: OrderItemStatus.DELIVERED },
      });

      await tx.orderItemHistory.create({
        data: {
          orderItemId: returnRequest.orderItemId,
          previousStatus: OrderItemStatus.RETURN_REQUESTED,
          newStatus: OrderItemStatus.DELIVERED,
          eventType: 'RETURN_REJECTED',
          reason: dto.rejectionReason.trim(),
          changedBy: adminUserId,
        },
      });

      return rejected;
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'RETURN_REQUEST_REJECTED',
      resourceType: 'ReturnRequest',
      resourceId: returnId,
      previousValue: { status: ReturnRequestStatus.PENDING },
      newValue: {
        status: ReturnRequestStatus.REJECTED,
        rejectionReason: dto.rejectionReason,
      },
    });

    return {
      success: true,
      data: updated,
      message: 'Return request rejected successfully',
    };
  }

  async completeReturnRequest(
    adminUserId: string,
    returnId: string,
    dto: CompleteReturnRequestDto,
  ): Promise<any> {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        orderItem: true,
        order: { include: { paymentTransactions: true } },
      },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (
      returnRequest.status !== ReturnRequestStatus.APPROVED &&
      returnRequest.status !== ReturnRequestStatus.PICKUP_SCHEDULED &&
      returnRequest.status !== ReturnRequestStatus.RECEIVED
    ) {
      throw new BadRequestException(
        `Cannot complete return request in '${returnRequest.status}' status. Must be APPROVED, PICKUP_SCHEDULED, or RECEIVED`,
      );
    }

    const orderItem = returnRequest.orderItem;
    // Calculate refundable amount proportionally for the item
    const itemTotal = Number(orderItem.totalAmount);
    const itemQty = orderItem.quantity;
    const returnQty = returnRequest.returnQuantity;
    const calculatedRefundAmount = Number(((itemTotal / itemQty) * returnQty).toFixed(2));

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mark return request COMPLETED
      const completedReturn = await tx.returnRequest.update({
        where: { id: returnId },
        data: {
          status: ReturnRequestStatus.COMPLETED,
          receivedAt: new Date(),
          completedAt: new Date(),
          adminRemarks: dto.adminRemarks?.trim() || returnRequest.adminRemarks,
        },
      });

      // 2. Update OrderItem status to RETURNED
      await tx.orderItem.update({
        where: { id: orderItem.id },
        data: { status: OrderItemStatus.RETURNED },
      });

      await tx.orderItemHistory.create({
        data: {
          orderItemId: orderItem.id,
          previousStatus: orderItem.status,
          newStatus: OrderItemStatus.RETURNED,
          eventType: 'RETURN_COMPLETED',
          reason: `Return inspection completed for request ${returnId}`,
          changedBy: adminUserId,
        },
      });

      // 3. Create Refund record in PENDING status
      const originalTx = returnRequest.order.paymentTransactions.find(
        (t) => t.status === PaymentTransactionStatus.SUCCEEDED && t.transactionType === PaymentTransactionType.PAYMENT,
      );

      const createdRefund = await tx.refund.create({
        data: {
          orderId: returnRequest.orderId,
          orderItemId: returnRequest.orderItemId,
          returnRequestId: returnRequest.id,
          customerId: returnRequest.customerId,
          paymentTransactionId: originalTx ? originalTx.id : null,
          refundAmount: new Decimal(calculatedRefundAmount),
          currency: returnRequest.order.currency,
          refundReason: `Return accepted: ${returnRequest.reason}`,
          status: RefundStatus.PENDING,
        },
      });

      return { completedReturn, createdRefund };
    });

    // 4. If restock requested (default true), adjust inventory
    if (dto.restockInventory !== false) {
      try {
        await this.inventoryService.restockReturnedProduct(
          orderItem.productId,
          returnRequest.returnQuantity,
          returnId,
          adminUserId,
        );
      } catch (err: any) {
        this.logger.warn(`Could not automatically restock inventory for product ${orderItem.productId}: ${err?.message || err}`);
      }
    }

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'RETURN_REQUEST_COMPLETED',
      resourceType: 'ReturnRequest',
      resourceId: returnId,
      newValue: {
        returnRequestId: returnId,
        refundId: result.createdRefund.id,
        refundAmount: calculatedRefundAmount,
        restocked: dto.restockInventory !== false,
      },
    });

    return {
      success: true,
      data: {
        returnRequest: result.completedReturn,
        refund: result.createdRefund,
      },
      message: 'Return request completed and pending refund created successfully',
    };
  }

  // ================= 4. REFUND WORKFLOW =================

  async getAdminRefunds(query: RefundQueryDto): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (query.status) whereClause.status = query.status;
    if (query.orderId) whereClause.orderId = query.orderId;

    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: true,
          orderItem: true,
          returnRequest: true,
          customer: { select: { id: true, firstName: true, lastName: true, user: { select: { email: true } } } },
        },
      }),
      this.prisma.refund.count({ where: whereClause }),
    ]);

    return {
      success: true,
      data: {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      message: 'Refund records retrieved successfully',
    };
  }

  async getCustomerRefunds(userId: string, query: RefundQueryDto): Promise<any> {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = { customerId: customer.id };
    if (query.status) whereClause.status = query.status;
    if (query.orderId) whereClause.orderId = query.orderId;

    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItem: true,
          returnRequest: true,
        },
      }),
      this.prisma.refund.count({ where: whereClause }),
    ]);

    return {
      success: true,
      data: {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      message: 'Customer refunds retrieved successfully',
    };
  }

  async getRefundById(userId: string, refundId: string, roleName: string): Promise<any> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: true,
        orderItem: true,
        returnRequest: true,
        customer: true,
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (roleName !== 'SUPER_ADMIN') {
      const customer = await this.prisma.customerProfile.findUnique({
        where: { userId },
      });
      if (!customer || refund.customerId !== customer.id) {
        throw new ForbiddenException('You are not authorized to view this refund');
      }
    }

    return {
      success: true,
      data: refund,
      message: 'Refund details retrieved successfully',
    };
  }

  async processRefund(
    adminUserId: string,
    refundId: string,
    dto: ProcessRefundDto,
  ): Promise<any> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            orderItems: true,
            refunds: true,
          },
        },
        orderItem: true,
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status === RefundStatus.SUCCEEDED) {
      throw new BadRequestException('Refund has already been processed successfully');
    }

    if (refund.status !== RefundStatus.PENDING && refund.status !== RefundStatus.PROCESSING) {
      throw new BadRequestException(
        `Cannot process refund in '${refund.status}' status. Must be PENDING or PROCESSING`,
      );
    }

    // Check that total refunded does not exceed total paid
    const orderTotal = Number(refund.order.totalAmount);
    const existingRefundedAmount = refund.order.refunds
      .filter((r) => r.status === RefundStatus.SUCCEEDED && r.id !== refund.id)
      .reduce((sum, r) => sum + Number(r.refundAmount), 0);

    const currentRefundAmount = Number(refund.refundAmount);
    if (existingRefundedAmount + currentRefundAmount > orderTotal) {
      throw new BadRequestException(
        `Refund amount exceeds order total. Order Total: ₹${orderTotal}, Previously Refunded: ₹${existingRefundedAmount}, Attempted Refund: ₹${currentRefundAmount}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update Refund to SUCCEEDED
      const updatedRefund = await tx.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.SUCCEEDED,
          providerRefundId: dto.providerRefundId.trim(),
          processedAt: new Date(),
          processedById: adminUserId,
          rawResponse: dto.rawResponse || null,
        },
      });

      // 2. Create PaymentTransaction record of type REFUND
      await tx.paymentTransaction.create({
        data: {
          orderId: refund.orderId,
          customerId: refund.customerId,
          paymentReference: `REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          providerTransactionId: dto.providerRefundId.trim(),
          amount: refund.refundAmount,
          currency: refund.currency,
          status: PaymentTransactionStatus.SUCCEEDED,
          transactionType: PaymentTransactionType.REFUND,
          processedAt: new Date(),
          rawWebhookPayload: dto.rawResponse || null,
        },
      });

      // 3. Update OrderItem status if applicable
      if (refund.orderItemId) {
        await tx.orderItem.update({
          where: { id: refund.orderItemId },
          data: { status: OrderItemStatus.REFUNDED },
        });

        await tx.orderItemHistory.create({
          data: {
            orderItemId: refund.orderItemId,
            previousStatus: refund.orderItem?.status || OrderItemStatus.RETURNED,
            newStatus: OrderItemStatus.REFUNDED,
            eventType: 'ITEM_REFUNDED',
            reason: `Refund processed: ${dto.providerRefundId}`,
            changedBy: adminUserId,
          },
        });
      }

      // 4. Update parent Order payment status
      const totalRefundedNow = existingRefundedAmount + currentRefundAmount;
      const newPaymentStatus =
        totalRefundedNow >= orderTotal
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;

      const orderItems = refund.order.orderItems;
      const allItemsRefundedOrCancelled = orderItems.every(
        (i) =>
          i.id === refund.orderItemId ||
          i.status === OrderItemStatus.REFUNDED ||
          i.status === OrderItemStatus.CANCELLED,
      );

      await tx.order.update({
        where: { id: refund.orderId },
        data: {
          paymentStatus: newPaymentStatus,
          ...(allItemsRefundedOrCancelled
            ? { orderStatus: OrderStatus.REFUNDED }
            : {}),
        },
      });

      return updatedRefund;
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'REFUND_PROCESSED',
      resourceType: 'Refund',
      resourceId: refundId,
      newValue: {
        orderId: refund.orderId,
        refundAmount: currentRefundAmount,
        providerRefundId: dto.providerRefundId,
      },
    });

    return {
      success: true,
      data: result,
      message: 'Refund processed successfully',
    };
  }
}
