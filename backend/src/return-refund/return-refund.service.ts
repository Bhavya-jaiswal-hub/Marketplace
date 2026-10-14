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
import {
  CreateReturnRequestDto,
  CustomerShipReturnDto,
  ApproveReturnRequestDto,
  RejectReturnRequestDto,
  SellerRejectInspectionDto,
  AdminResolveDisputeDto,
  CompleteReturnRequestDto,
  ProcessRefundDto,
  ReturnQueryDto,
  RefundQueryDto,
} from './dto';
import {
  ReturnRequestStatus,
  RefundStatus,
  OrderItemStatus,
  PaymentStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
  AdjustmentType,
  LedgerDirection,
  AdjustmentStatus,
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

  // ================= 1. CUSTOMER RETURN WORKFLOW =================

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

    // 5-day return window verification (120 hours against UTC deliveredAt)
    const returnWindowMs = 120 * 60 * 60 * 1000;
    const timeSinceDelivery = Date.now() - new Date(orderItem.deliveredAt).getTime();
    if (timeSinceDelivery > returnWindowMs) {
      throw new BadRequestException(
        'Return window expired. Returns must be requested within 5 days of delivery',
      );
    }

    const returnQty = dto.returnQuantity ?? 1;
    if (returnQty <= 0 || returnQty > orderItem.quantity) {
      throw new BadRequestException(
        `Invalid return quantity. Eligible return quantity is between 1 and ${orderItem.quantity}`,
      );
    }

    // Check for existing active return request
    const existingActiveRequest = orderItem.returnRequests.find(
      (r) => r.status !== ReturnRequestStatus.REJECTED,
    );
    if (existingActiveRequest) {
      throw new BadRequestException(
        `An active return request (${existingActiveRequest.status}) already exists for this item`,
      );
    }

    // Construct customer comments with metadata if present
    const commentsParts: string[] = [];
    if (dto.reasonCategory) commentsParts.push(`Category: ${dto.reasonCategory}`);
    if (dto.faultClassification) commentsParts.push(`Fault: ${dto.faultClassification}`);
    if (dto.customerComments) commentsParts.push(dto.customerComments.trim());
    if (dto.photoUrls && dto.photoUrls.length > 0) {
      commentsParts.push(`Photos: ${dto.photoUrls.join(', ')}`);
    }
    const fullComments = commentsParts.length > 0 ? commentsParts.join(' | ') : null;

    const returnRequest = await this.prisma.$transaction(async (tx) => {
      const created = await tx.returnRequest.create({
        data: {
          orderId: orderItem.orderId,
          orderItemId: orderItem.id,
          customerId: customer.id,
          sellerId: orderItem.sellerId,
          returnQuantity: returnQty,
          reason: dto.reason.trim(),
          customerComments: fullComments,
          status: ReturnRequestStatus.REQUESTED,
        },
      });

      await tx.orderItemHistory.create({
        data: {
          orderItemId: orderItem.id,
          previousStatus: OrderItemStatus.DELIVERED,
          newStatus: OrderItemStatus.DELIVERED,
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
        returnQuantity: returnQty,
        reason: dto.reason,
      },
    });

    return {
      success: true,
      data: returnRequest,
      message: 'Return request submitted successfully',
    };
  }

  async customerShipReturn(
    userId: string,
    returnRequestId: string,
    dto: CustomerShipReturnDto,
  ): Promise<any> {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: { orderItem: true },
    });

    if (!returnRequest || returnRequest.customerId !== customer.id) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.status !== ReturnRequestStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot ship return package in '${returnRequest.status}' status. Must be APPROVED`,
      );
    }

    const courier = dto.courierName.trim();
    const tracking = dto.trackingNumber.trim();

    const updated = await this.prisma.returnRequest.update({
      where: { id: returnRequestId },
      data: {
        status: ReturnRequestStatus.IN_TRANSIT,
        pickupCarrier: courier,
        pickupTrackingNumber: tracking,
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'RETURN_IN_TRANSIT',
      resourceType: 'ReturnRequest',
      resourceId: returnRequestId,
      previousValue: { status: ReturnRequestStatus.APPROVED },
      newValue: {
        status: ReturnRequestStatus.IN_TRANSIT,
        courier,
        tracking,
      },
    });

    return {
      success: true,
      data: updated,
      message: 'Return shipment tracking details recorded. Status updated to IN_TRANSIT',
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
        adjustments: true,
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

  // ================= 2. SELLER INSPECTION WORKFLOW =================

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
        adjustments: true,
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

  async sellerConfirmReceipt(userId: string, returnRequestId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: { orderItem: true },
    });

    if (!returnRequest || returnRequest.sellerId !== seller.id) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.status !== ReturnRequestStatus.IN_TRANSIT) {
      throw new BadRequestException(
        `Cannot confirm receipt for return in '${returnRequest.status}' status. Must be IN_TRANSIT`,
      );
    }

    const updated = await this.prisma.returnRequest.update({
      where: { id: returnRequestId },
      data: {
        status: ReturnRequestStatus.RECEIVED,
        receivedAt: new Date(),
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'RETURN_RECEIVED',
      resourceType: 'ReturnRequest',
      resourceId: returnRequestId,
      previousValue: { status: ReturnRequestStatus.IN_TRANSIT },
      newValue: { status: ReturnRequestStatus.RECEIVED },
    });

    return {
      success: true,
      data: updated,
      message: 'Package receipt confirmed. Status updated to RECEIVED',
    };
  }

  async sellerVerifyReturn(
    userId: string,
    returnRequestId: string,
    comments?: string,
  ): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: { orderItem: true },
    });

    if (!returnRequest || returnRequest.sellerId !== seller.id) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.status !== ReturnRequestStatus.RECEIVED) {
      throw new BadRequestException(
        `Cannot verify return condition in '${returnRequest.status}' status. Must be RECEIVED`,
      );
    }

    const updated = await this.prisma.returnRequest.update({
      where: { id: returnRequestId },
      data: {
        status: ReturnRequestStatus.VERIFIED,
        sellerComments: comments?.trim() || 'Condition verified and accepted by seller',
      },
    });

    // Restock variant inventory upon verification
    const orderItem = returnRequest.orderItem;
    if (orderItem && orderItem.variantId) {
      try {
        await this.inventoryService.restockReturnedProduct(
          orderItem.variantId,
          returnRequest.returnQuantity,
          returnRequestId,
          userId,
        );
      } catch (err: any) {
        this.logger.warn(
          `Could not automatically restock inventory for variant ${orderItem.variantId}: ${err?.message || err}`,
        );
      }
    }

    await this.auditService.logAction({
      userId,
      action: 'RETURN_VERIFIED',
      resourceType: 'ReturnRequest',
      resourceId: returnRequestId,
      previousValue: { status: ReturnRequestStatus.RECEIVED },
      newValue: {
        status: ReturnRequestStatus.VERIFIED,
        comments,
      },
    });

    return {
      success: true,
      data: updated,
      message: 'Return verified and accepted. Ready for Super Admin refund processing',
    };
  }

  async sellerRejectInspection(
    userId: string,
    returnRequestId: string,
    dto: SellerRejectInspectionDto,
  ): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: { orderItem: true },
    });

    if (!returnRequest || returnRequest.sellerId !== seller.id) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.status !== ReturnRequestStatus.RECEIVED) {
      throw new BadRequestException(
        `Cannot reject return inspection in '${returnRequest.status}' status. Must be RECEIVED`,
      );
    }

    const reason = dto.reason.trim();
    if (!reason) {
      throw new BadRequestException('A mandatory explanation must be provided when rejecting a return inspection');
    }

    const fullComments = dto.photoUrls && dto.photoUrls.length > 0
      ? `${reason} | Photos: ${dto.photoUrls.join(', ')}`
      : reason;

    const updated = await this.prisma.returnRequest.update({
      where: { id: returnRequestId },
      data: {
        status: ReturnRequestStatus.REJECTED_ON_INSPECTION,
        sellerComments: fullComments,
        rejectionReason: reason,
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'RETURN_INSPECTION_REJECTED',
      resourceType: 'ReturnRequest',
      resourceId: returnRequestId,
      previousValue: { status: ReturnRequestStatus.RECEIVED },
      newValue: {
        status: ReturnRequestStatus.REJECTED_ON_INSPECTION,
        reason,
      },
    });

    return {
      success: true,
      data: updated,
      message: 'Return rejected on inspection. Dispute escalated to Super Admin for arbitration',
    };
  }

  // ================= 3. SUPER ADMIN RETURN & DISPUTE WORKFLOW =================

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
          adjustments: true,
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
        adjustments: true,
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

    if (returnRequest.status !== ReturnRequestStatus.REQUESTED) {
      throw new BadRequestException(
        `Cannot approve return request in '${returnRequest.status}' status. Must be REQUESTED`,
      );
    }

    const updated = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: ReturnRequestStatus.APPROVED,
        pickupCarrier: dto.pickupCarrier?.trim() || null,
        pickupTrackingNumber: dto.pickupTrackingNumber?.trim() || null,
        pickupScheduledAt: dto.pickupScheduledAt ? new Date(dto.pickupScheduledAt) : null,
        adminRemarks: dto.adminRemarks?.trim() || 'Approved by Super Admin',
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'RETURN_REQUEST_APPROVED',
      resourceType: 'ReturnRequest',
      resourceId: returnId,
      previousValue: { status: ReturnRequestStatus.REQUESTED },
      newValue: {
        status: ReturnRequestStatus.APPROVED,
        pickupCarrier: dto.pickupCarrier,
        pickupTrackingNumber: dto.pickupTrackingNumber,
      },
    });

    return {
      success: true,
      data: updated,
      message: 'Return request approved successfully (APPROVED)',
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

    if (returnRequest.status !== ReturnRequestStatus.REQUESTED) {
      throw new BadRequestException(
        `Cannot reject return request in '${returnRequest.status}' status. Must be REQUESTED`,
      );
    }

    const updated = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: ReturnRequestStatus.REJECTED,
        rejectionReason: dto.rejectionReason.trim(),
        adminRemarks: dto.adminRemarks?.trim() || null,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'RETURN_REQUEST_REJECTED',
      resourceType: 'ReturnRequest',
      resourceId: returnId,
      previousValue: { status: ReturnRequestStatus.REQUESTED },
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

  async resolveReturnDispute(
    adminUserId: string,
    returnId: string,
    dto: AdminResolveDisputeDto,
  ): Promise<any> {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        orderItem: true,
        order: true,
      },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.status !== ReturnRequestStatus.REJECTED_ON_INSPECTION) {
      throw new BadRequestException(
        `Cannot resolve dispute for return request in '${returnRequest.status}' status. Must be REJECTED_ON_INSPECTION`,
      );
    }

    const resolution = dto.resolution;
    let nextStatus: ReturnRequestStatus;
    let adminNotes = dto.adminNotes?.trim() || '';

    if (resolution === 'OVERRULE_SELLER_APPROVE_REFUND') {
      nextStatus = ReturnRequestStatus.VERIFIED;
      adminNotes = adminNotes || 'Super Admin overruled seller rejection and approved refund';

      // Optionally restock inventory if product was preserved
      const orderItem = returnRequest.orderItem;
      if (orderItem && orderItem.variantId) {
        try {
          await this.inventoryService.restockReturnedProduct(
            orderItem.variantId,
            returnRequest.returnQuantity,
            returnId,
            adminUserId,
          );
        } catch (err: any) {
          this.logger.warn(`Could not restock returned product: ${err?.message || err}`);
        }
      }
    } else if (resolution === 'UPHOLD_SELLER_REJECTION') {
      nextStatus = ReturnRequestStatus.REJECTED;
      adminNotes = adminNotes || 'Super Admin upheld seller rejection. Return process closed';
    } else {
      throw new BadRequestException(
        `Invalid dispute resolution '${resolution}'. Must be 'OVERRULE_SELLER_APPROVE_REFUND' or 'UPHOLD_SELLER_REJECTION'`,
      );
    }

    const updated = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: nextStatus,
        adminRemarks: adminNotes,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'RETURN_DISPUTE_RESOLVED',
      resourceType: 'ReturnRequest',
      resourceId: returnId,
      previousValue: { status: ReturnRequestStatus.REJECTED_ON_INSPECTION },
      newValue: {
        status: nextStatus,
        resolution,
        adminNotes,
      },
    });

    return {
      success: true,
      data: updated,
      message: `Inspection dispute arbitrated successfully (${nextStatus})`,
    };
  }

  // ================= 4. REFUND PROCESSING WORKFLOW =================

  async completeReturnRequest(
    adminUserId: string,
    returnId: string,
    dto: CompleteReturnRequestDto,
  ): Promise<any> {
    // Legacy bridge: if return is APPROVED or RECEIVED, verify and complete
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: { orderItem: true },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (
      returnRequest.status !== ReturnRequestStatus.APPROVED &&
      returnRequest.status !== ReturnRequestStatus.IN_TRANSIT &&
      returnRequest.status !== ReturnRequestStatus.RECEIVED &&
      returnRequest.status !== ReturnRequestStatus.VERIFIED
    ) {
      throw new BadRequestException(
        `Cannot complete return request in '${returnRequest.status}' status`,
      );
    }

    // Move to VERIFIED first if not already
    if (returnRequest.status !== ReturnRequestStatus.VERIFIED) {
      await this.prisma.returnRequest.update({
        where: { id: returnId },
        data: {
          status: ReturnRequestStatus.VERIFIED,
          receivedAt: returnRequest.receivedAt || new Date(),
          adminRemarks: dto.adminRemarks?.trim() || returnRequest.adminRemarks,
        },
      });

      if (dto.restockInventory !== false && returnRequest.orderItem?.variantId) {
        try {
          await this.inventoryService.restockReturnedProduct(
            returnRequest.orderItem.variantId,
            returnRequest.returnQuantity,
            returnId,
            adminUserId,
          );
        } catch (err: any) {
          this.logger.warn(`Could not restock returned product: ${err?.message || err}`);
        }
      }
    }

    return this.processReturnRefund(adminUserId, returnId, {
      payoutNotes: dto.adminRemarks,
    });
  }

  async processReturnRefund(
    adminUserId: string,
    returnId: string,
    dto: ProcessRefundDto,
  ): Promise<any> {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        orderItem: true,
        order: {
          include: {
            orderItems: true,
            refunds: true,
            paymentTransactions: true,
          },
        },
      },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.status !== ReturnRequestStatus.VERIFIED) {
      throw new BadRequestException(
        `Cannot process refund for return request in '${returnRequest.status}' status. Must be VERIFIED`,
      );
    }

    const orderItem = returnRequest.orderItem;
    const order = returnRequest.order;

    // 1. Calculate item price refund (proportional to returned quantity)
    const itemTotal = Number(orderItem.totalAmount);
    const itemQty = orderItem.quantity;
    const returnQty = returnRequest.returnQuantity;
    const itemRefundAmount = Number(((itemTotal / itemQty) * returnQty).toFixed(2));

    // Determine fault classification:
    // Seller Fault reasons: defective, damaged, wrong item/size, not as listed, or explicit SELLER_FAULT in DTO/reason
    const reasonLower = (returnRequest.reason + ' ' + (returnRequest.customerComments || '')).toLowerCase();
    const isSellerFault =
      dto.faultClassification === 'SELLER_FAULT' ||
      reasonLower.includes('defective') ||
      reasonLower.includes('damaged') ||
      reasonLower.includes('wrong') ||
      reasonLower.includes('fault: seller_fault') ||
      dto.faultClassification !== 'CUSTOMER_FAULT';

    // 2. Original Shipping Fee Refund Rule:
    // Original shipping is refunded IF AND ONLY IF all items in that seller's shipment were returned/cancelled due to seller fault.
    let originalShippingRefund = 0;
    if (isSellerFault) {
      const sellerItems = order.orderItems.filter((i) => i.sellerId === returnRequest.sellerId);
      const otherSellerItems = sellerItems.filter((i) => i.id !== orderItem.id);
      const allOthersCancelledOrReturned = otherSellerItems.every(
        (i) => i.status === OrderItemStatus.CANCELLED,
      );

      if (allOthersCancelledOrReturned) {
        // If all items for this seller are returned or cancelled, original shipping portion may be refunded
        // Check if shipping fee was already refunded in previous refunds
        const shippingFee = Number(order.shippingAmount || 0);
        const hasRefundedShipping = order.refunds.some(
          (rf) => rf.status === RefundStatus.SUCCEEDED && Number(rf.refundAmount) > itemTotal,
        );
        if (!hasRefundedShipping && shippingFee > 0) {
          originalShippingRefund = shippingFee;
        }
      }
    }

    const totalRefundAmount = Number((itemRefundAmount + originalShippingRefund).toFixed(2));
    const providerRefundId = dto.providerRefundId?.trim() || `REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const returnShippingFee = dto.returnShippingFee ?? (isSellerFault ? 79.0 : 0);

    const result = await this.prisma.$transaction(async (tx) => {
      // A. Create/Update Refund record
      let refund = await tx.refund.findUnique({
        where: { returnRequestId: returnRequest.id },
      });

      const originalTx = order.paymentTransactions.find(
        (t) =>
          t.status === PaymentTransactionStatus.SUCCEEDED &&
          t.transactionType === PaymentTransactionType.PAYMENT,
      );

      if (!refund) {
        refund = await tx.refund.create({
          data: {
            orderId: returnRequest.orderId,
            orderItemId: returnRequest.orderItemId,
            returnRequestId: returnRequest.id,
            customerId: returnRequest.customerId,
            paymentTransactionId: originalTx ? originalTx.id : null,
            refundAmount: new Decimal(totalRefundAmount),
            currency: order.currency || 'INR',
            refundReason: `Return accepted: ${returnRequest.reason}`,
            status: RefundStatus.SUCCEEDED,
            providerRefundId,
            processedById: adminUserId,
            processedAt: new Date(),
          },
        });
      } else {
        refund = await tx.refund.update({
          where: { id: refund.id },
          data: {
            status: RefundStatus.SUCCEEDED,
            refundAmount: new Decimal(totalRefundAmount),
            providerRefundId,
            processedById: adminUserId,
            processedAt: new Date(),
          },
        });
      }

      // B. Create PaymentTransaction of type REFUND
      await tx.paymentTransaction.create({
        data: {
          orderId: order.id,
          customerId: returnRequest.customerId,
          paymentReference: `REF-TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          providerTransactionId: providerRefundId,
          amount: new Decimal(totalRefundAmount),
          currency: order.currency || 'INR',
          status: PaymentTransactionStatus.SUCCEEDED,
          transactionType: PaymentTransactionType.REFUND,
          processedAt: new Date(),
        },
      });

      // C. Mark ReturnRequest as REFUNDED
      const updatedReturn = await tx.returnRequest.update({
        where: { id: returnId },
        data: {
          status: ReturnRequestStatus.REFUNDED,
          completedAt: new Date(),
          adminRemarks: dto.payoutNotes?.trim() || returnRequest.adminRemarks,
        },
      });

      // D. If Seller Fault, create SELLER_FAULT_RETURN_SHIPPING_DEBIT in SellerAdjustment
      if (isSellerFault && returnShippingFee > 0) {
        await tx.sellerAdjustment.create({
          data: {
            sellerId: returnRequest.sellerId,
            type: AdjustmentType.SELLER_FAULT_RETURN_SHIPPING_DEBIT,
            amount: new Decimal(returnShippingFee),
            direction: LedgerDirection.DEBIT,
            status: AdjustmentStatus.PENDING,
            reason: `Return shipping debit for seller-fault return ${returnRequest.id}`,
            orderItemId: returnRequest.orderItemId,
            returnRequestId: returnRequest.id,
          },
        });
      }

      // E. Update parent Order payment status
      const existingRefundedAmount = order.refunds
        .filter((r) => r.status === RefundStatus.SUCCEEDED && r.id !== refund!.id)
        .reduce((sum, r) => sum + Number(r.refundAmount), 0);

      const totalRefundedNow = existingRefundedAmount + totalRefundAmount;
      const orderTotal = Number(order.totalAmount);
      const newPaymentStatus =
        totalRefundedNow >= orderTotal
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;

      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: newPaymentStatus },
      });

      return { updatedReturn, refund };
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'RETURN_REFUNDED',
      resourceType: 'ReturnRequest',
      resourceId: returnId,
      newValue: {
        returnRequestId: returnId,
        refundId: result.refund.id,
        refundAmount: totalRefundAmount,
        providerRefundId,
        isSellerFault,
        returnShippingFee: isSellerFault ? returnShippingFee : 0,
      },
    });

    return {
      success: true,
      data: {
        returnRequest: result.updatedReturn,
        refund: result.refund,
      },
      message: 'Return refund processed successfully via payment gateway',
    };
  }

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
        returnRequest: true,
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status === RefundStatus.SUCCEEDED) {
      throw new BadRequestException('Refund has already been processed successfully');
    }

    const providerRefundId = dto.providerRefundId?.trim() || `REF-${Date.now()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.SUCCEEDED,
          providerRefundId,
          processedAt: new Date(),
          processedById: adminUserId,
          rawResponse: dto.rawResponse || null,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          orderId: refund.orderId,
          customerId: refund.customerId,
          paymentReference: `REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          providerTransactionId: providerRefundId,
          amount: refund.refundAmount,
          currency: refund.currency,
          status: PaymentTransactionStatus.SUCCEEDED,
          transactionType: PaymentTransactionType.REFUND,
          processedAt: new Date(),
          rawWebhookPayload: dto.rawResponse || null,
        },
      });

      if (refund.returnRequestId) {
        await tx.returnRequest.update({
          where: { id: refund.returnRequestId },
          data: {
            status: ReturnRequestStatus.REFUNDED,
            completedAt: new Date(),
          },
        });
      }

      const existingRefundedAmount = refund.order.refunds
        .filter((r) => r.status === RefundStatus.SUCCEEDED && r.id !== refund.id)
        .reduce((sum, r) => sum + Number(r.refundAmount), 0);
      const totalRefundedNow = existingRefundedAmount + Number(refund.refundAmount);
      const orderTotal = Number(refund.order.totalAmount);

      await tx.order.update({
        where: { id: refund.orderId },
        data: {
          paymentStatus:
            totalRefundedNow >= orderTotal
              ? PaymentStatus.REFUNDED
              : PaymentStatus.PARTIALLY_REFUNDED,
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
        refundAmount: Number(refund.refundAmount),
        providerRefundId,
      },
    });

    return {
      success: true,
      data: result,
      message: 'Refund processed successfully',
    };
  }
}
