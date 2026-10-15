import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateNotificationDto,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  NotificationQueryDto,
  TemplateQueryDto,
} from './dto';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  TemplateStatus,
} from '@prisma/client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  // ================= 1. NOTIFICATION CREATION & DISPATCH =================

  async sendNotification(dto: CreateNotificationDto): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      this.logger.warn(`Cannot send notification. User ${dto.userId} not found`);
      throw new NotFoundException('User not found');
    }

    const channel = dto.channel || NotificationChannel.IN_APP;
    let deliveryStatus: NotificationDeliveryStatus = NotificationDeliveryStatus.DELIVERED;
    let failureReason: string | null = null;

    let finalTitle = dto.title.trim();
    let finalMessage = dto.message.trim();

    if (dto.templateData) {
      try {
        const template = await this.prisma.notificationTemplate.findFirst({
          where: {
            notificationType: dto.type,
            channel,
            status: TemplateStatus.ACTIVE,
          },
        });
        if (template) {
          finalTitle = this.hydrateTemplate(template.titleTemplate, dto.templateData);
          finalMessage = this.hydrateTemplate(template.messageTemplate, dto.templateData);
        }
      } catch (err) {
        this.logger.debug(`Template hydration fallback to provided title/message: ${err}`);
      }
    }

    // Create database notification record
    const notification = await this.prisma.notification.create({
      data: {
        userId: user.id,
        type: dto.type,
        title: finalTitle,
        message: finalMessage,
        referenceType: dto.referenceType || null,
        referenceId: dto.referenceId || null,
        channel,
        status: NotificationDeliveryStatus.PROCESSING,
        isRead: false,
        deliveryAttempts: 1,
      },
    });

    // Safely attempt email delivery if requested or email channel
    if (channel === NotificationChannel.EMAIL || dto.emailRecipient || user.email) {
      const recipientEmail = dto.emailRecipient || user.email;
      try {
        await this.emailService.sendEmail({
          to: recipientEmail,
          subject: finalTitle,
          text: finalMessage,
          html: `<div style="font-family: Arial, sans-serif; padding: 15px;">
            <h2>${finalTitle}</h2>
            <p>${finalMessage}</p>
            <hr />
            <p style="font-size: 12px; color: #777;">Multi-Vendor Marketplace Automated Notification</p>
          </div>`,
        });
        deliveryStatus = NotificationDeliveryStatus.DELIVERED;
      } catch (err: any) {
        deliveryStatus = NotificationDeliveryStatus.FAILED;
        failureReason = err?.message || 'Email transport delivery failed';
        this.logger.warn(
          `Email delivery failed for notification ${notification.id} to ${recipientEmail}: ${failureReason}`,
        );
      }
    }

    // Update final delivery status
    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: deliveryStatus,
        failureReason,
      },
    });

    return {
      success: true,
      data: updated,
      message:
        deliveryStatus === NotificationDeliveryStatus.DELIVERED
          ? 'Notification delivered successfully'
          : 'Notification saved but external delivery failed',
    };
  }

  // ================= 2. USER NOTIFICATION QUERIES & STATUS =================

  async getUserNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = { userId };
    if (query.isRead !== undefined) whereClause.isRead = query.isRead;
    if (query.type) whereClause.type = query.type;
    if (query.channel) whereClause.channel = query.channel;

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: whereClause }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      success: true,
      data: {
        items,
        unreadCount,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      message: 'Notifications retrieved successfully',
    };
  }

  async getUserNotificationById(
    userId: string,
    notificationId: string,
  ): Promise<any> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return {
      success: true,
      data: notification,
      message: 'Notification retrieved successfully',
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<any> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      data: updated,
      message: 'Notification marked as read',
    };
  }

  async markAllAsRead(userId: string): Promise<any> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      data: { updatedCount: result.count },
      message: 'All notifications marked as read',
    };
  }

  // ================= 3. SUPER ADMIN TEMPLATES & RETRY =================

  async createTemplate(
    adminUserId: string,
    dto: CreateNotificationTemplateDto,
  ): Promise<any> {
    const existing = await this.prisma.notificationTemplate.findUnique({
      where: { templateName: dto.templateName.trim() },
    });

    if (existing) {
      throw new BadRequestException(
        `A template with name '${dto.templateName}' already exists`,
      );
    }

    const template = await this.prisma.notificationTemplate.create({
      data: {
        templateName: dto.templateName.trim(),
        notificationType: dto.notificationType.trim(),
        titleTemplate: dto.titleTemplate.trim(),
        messageTemplate: dto.messageTemplate.trim(),
        channel: dto.channel || NotificationChannel.IN_APP,
        status: TemplateStatus.ACTIVE,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'NOTIFICATION_TEMPLATE_CREATED',
      resourceType: 'NotificationTemplate',
      resourceId: template.id,
      newValue: template,
    });

    return {
      success: true,
      data: template,
      message: 'Notification template created successfully',
    };
  }

  async getTemplates(query: TemplateQueryDto): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (query.channel) whereClause.channel = query.channel;
    if (query.status) whereClause.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.notificationTemplate.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationTemplate.count({ where: whereClause }),
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
      message: 'Notification templates retrieved successfully',
    };
  }

  async updateTemplate(
    adminUserId: string,
    templateId: string,
    dto: UpdateNotificationTemplateDto,
  ): Promise<any> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Notification template not found');
    }

    const updated = await this.prisma.notificationTemplate.update({
      where: { id: templateId },
      data: {
        titleTemplate: dto.titleTemplate?.trim() || template.titleTemplate,
        messageTemplate: dto.messageTemplate?.trim() || template.messageTemplate,
        status: dto.status || template.status,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'NOTIFICATION_TEMPLATE_UPDATED',
      resourceType: 'NotificationTemplate',
      resourceId: templateId,
      previousValue: template,
      newValue: updated,
    });

    return {
      success: true,
      data: updated,
      message: 'Notification template updated successfully',
    };
  }

  async retryNotification(
    adminUserId: string,
    notificationId: string,
  ): Promise<any> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { user: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    let deliveryStatus: NotificationDeliveryStatus = NotificationDeliveryStatus.DELIVERED;
    let failureReason: string | null = null;

    if (notification.channel === NotificationChannel.EMAIL || notification.user?.email) {
      try {
        await this.emailService.sendEmail({
          to: notification.user.email,
          subject: notification.title,
          text: notification.message,
          html: `<p>${notification.message}</p>`,
        });
      } catch (err: any) {
        deliveryStatus = NotificationDeliveryStatus.FAILED;
        failureReason = err?.message || 'Email delivery retry failed';
      }
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: deliveryStatus,
        deliveryAttempts: notification.deliveryAttempts + 1,
        failureReason,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'NOTIFICATION_RETRIED',
      resourceType: 'Notification',
      resourceId: notificationId,
      newValue: {
        status: deliveryStatus,
        attempts: updated.deliveryAttempts,
      },
    });

    return {
      success: true,
      data: updated,
      message:
        deliveryStatus === NotificationDeliveryStatus.DELIVERED
          ? 'Notification retried and delivered successfully'
          : 'Notification retry failed',
    };
  }

  // ================= 4. TEMPLATE HYDRATION HELPER =================

  hydrateTemplate(templateStr: string, data: Record<string, any>): string {
    if (!templateStr || !data) return templateStr;
    return templateStr.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
      return data[key] !== undefined ? String(data[key]) : `{{${key}}}`;
    });
  }

  // ================= 5. MASTER NOTIFICATION EVENTS (SRS FR-13, BR-13, AC-8) =================

  // 1. Seller registration approval or rejection
  async notifySellerRegistration(
    sellerUserId: string,
    approved: boolean,
    reason?: string,
  ): Promise<any> {
    const title = approved
      ? 'Seller Application Approved'
      : 'Seller Application Rejected';
    const message = approved
      ? 'Congratulations! Your seller application on Multi-Vendor Marketplace has been approved. You may now request clothing categories.'
      : `Your seller application has been rejected. Reason: ${reason || 'Document verification failed.'}`;

    return this.sendNotification({
      userId: sellerUserId,
      type: approved ? 'SELLER_APPROVED' : 'SELLER_REJECTED',
      title,
      message,
      channel: NotificationChannel.EMAIL,
      templateData: { approved, reason },
    });
  }

  // 2. Category permission approval, rejection, or revocation
  async notifyCategoryDecision(
    sellerUserId: string,
    categoryName: string,
    action: 'APPROVED' | 'REJECTED' | 'REVOKED',
    reason?: string,
  ): Promise<any> {
    const title = `Category Authorization ${action}`;
    let message = `Your request to list products in '${categoryName}' has been ${action.toLowerCase()}.`;
    if (reason) message += ` Reason: ${reason}`;

    return this.sendNotification({
      userId: sellerUserId,
      type: `CATEGORY_${action}`,
      title,
      message,
      channel: NotificationChannel.IN_APP,
      templateData: { categoryName, action, reason },
    });
  }

  // 3. Order placed (sent to customer and affected sellers)
  async notifyOrderPlaced(
    customerUserId: string,
    orderId: string,
    orderNumber: string,
    sellerUserIds: string[],
  ): Promise<any> {
    const customerPromise = this.sendNotification({
      userId: customerUserId,
      type: 'ORDER_PLACED',
      title: `Order Confirmed - #${orderNumber}`,
      message: `Your order #${orderNumber} has been successfully placed and paid.`,
      referenceType: 'Order',
      referenceId: orderId,
      channel: NotificationChannel.EMAIL,
      templateData: { orderNumber, orderId },
    });

    const sellerPromises = (sellerUserIds || []).map((sUserId) =>
      this.sendNotification({
        userId: sUserId,
        type: 'ORDER_PLACED_SELLER',
        title: `New Order Received - #${orderNumber}`,
        message: `You have new item(s) to fulfill for order #${orderNumber}.`,
        referenceType: 'Order',
        referenceId: orderId,
        channel: NotificationChannel.IN_APP,
        templateData: { orderNumber, orderId },
      }),
    );

    await Promise.allSettled([customerPromise, ...sellerPromises]);
  }

  // 4. Order cancelled (pre-shipment cancellation)
  async notifyOrderCancelled(
    customerUserId: string,
    sellerUserId: string | null,
    orderNumber: string,
    reason?: string,
  ): Promise<any> {
    const reasonText = reason ? ` Reason: ${reason}` : '';
    const customerPromise = this.sendNotification({
      userId: customerUserId,
      type: 'ORDER_CANCELLED',
      title: `Order Cancelled - #${orderNumber}`,
      message: `Your order #${orderNumber} has been cancelled.${reasonText}`,
      channel: NotificationChannel.EMAIL,
      templateData: { orderNumber, reason },
    });

    const sellerPromise = sellerUserId
      ? this.sendNotification({
          userId: sellerUserId,
          type: 'ORDER_CANCELLED_SELLER',
          title: `Order Cancelled - #${orderNumber}`,
          message: `Order #${orderNumber} was cancelled before shipment.${reasonText}`,
          channel: NotificationChannel.IN_APP,
          templateData: { orderNumber, reason },
        })
      : Promise.resolve();

    await Promise.allSettled([customerPromise, sellerPromise]);
  }

  // 5. Order shipped (with courier name and tracking number)
  async notifyOrderShipped(
    customerUserId: string,
    orderNumber: string,
    courierName: string,
    trackingNumber: string,
  ): Promise<any> {
    return this.sendNotification({
      userId: customerUserId,
      type: 'ORDER_SHIPPED',
      title: `Order Shipped - #${orderNumber}`,
      message: `Your package for order #${orderNumber} has been shipped via ${courierName}. Tracking: ${trackingNumber}`,
      channel: NotificationChannel.EMAIL,
      templateData: { orderNumber, courierName, trackingNumber },
    });
  }

  // 6. Order delivered (notifying customer and starting 5-day return window)
  async notifyOrderDelivered(
    customerUserId: string,
    orderNumber: string,
    productName: string,
  ): Promise<any> {
    return this.sendNotification({
      userId: customerUserId,
      type: 'ORDER_DELIVERED',
      title: `Order Delivered - #${orderNumber}`,
      message: `Your item '${productName}' from order #${orderNumber} was marked delivered. You have 5 days (120 hours) to request a return if needed.`,
      channel: NotificationChannel.EMAIL,
      templateData: { orderNumber, productName },
    });
  }

  // 7. Return requested, approved, or rejected
  async notifyReturnLifecycle(
    customerUserId: string,
    sellerUserId: string | null,
    returnId: string,
    status: string,
    remarks?: string,
  ): Promise<any> {
    const remarksText = remarks ? ` Remarks: ${remarks}` : '';
    const customerPromise = this.sendNotification({
      userId: customerUserId,
      type: `RETURN_${status}`,
      title: `Return Request ${status}`,
      message: `Your return request status is now '${status}'.${remarksText}`,
      referenceType: 'ReturnRequest',
      referenceId: returnId,
      channel: NotificationChannel.IN_APP,
      templateData: { returnId, status, remarks },
    });

    const sellerPromise = sellerUserId
      ? this.sendNotification({
          userId: sellerUserId,
          type: `RETURN_${status}_SELLER`,
          title: `Return Request ${status}`,
          message: `Return request #${returnId} status updated to '${status}'.${remarksText}`,
          referenceType: 'ReturnRequest',
          referenceId: returnId,
          channel: NotificationChannel.IN_APP,
          templateData: { returnId, status, remarks },
        })
      : Promise.resolve();

    await Promise.allSettled([customerPromise, sellerPromise]);
  }

  // 8. Refund completed (with gateway refund reference)
  async notifyRefundCompleted(
    customerUserId: string,
    refundAmount: number,
    providerRefundId: string,
  ): Promise<any> {
    return this.sendNotification({
      userId: customerUserId,
      type: 'REFUND_COMPLETED',
      title: `Refund Completed - ₹${refundAmount.toFixed(2)}`,
      message: `Your refund of ₹${refundAmount.toFixed(2)} has been successfully completed. Gateway Reference: ${providerRefundId}`,
      channel: NotificationChannel.EMAIL,
      templateData: { refundAmount, providerRefundId },
    });
  }

  // 9. Dispute raised ("Not received" claim submitted; sent to Super Admin and seller)
  async notifyDisputeRaised(
    adminUserId: string | null,
    sellerUserId: string,
    orderNumber: string,
    orderItemId: string,
    reason?: string,
  ): Promise<any> {
    const reasonText = reason ? ` Reason: ${reason}` : '';
    const promises: Promise<any>[] = [];

    if (adminUserId) {
      promises.push(
        this.sendNotification({
          userId: adminUserId,
          type: 'DISPUTE_RAISED_ADMIN',
          title: `Dispute Raised: Not Received - #${orderNumber}`,
          message: `A customer raised a "Not received" dispute for item in order #${orderNumber}.${reasonText}`,
          referenceType: 'OrderItem',
          referenceId: orderItemId,
          channel: NotificationChannel.IN_APP,
          templateData: { orderNumber, orderItemId, reason },
        }),
      );
    }

    if (sellerUserId) {
      promises.push(
        this.sendNotification({
          userId: sellerUserId,
          type: 'DISPUTE_RAISED_SELLER',
          title: `Delivery Dispute Raised - #${orderNumber}`,
          message: `A customer reported item in order #${orderNumber} as not received. Settlement for this item is frozen pending Super Admin arbitration.${reasonText}`,
          referenceType: 'OrderItem',
          referenceId: orderItemId,
          channel: NotificationChannel.IN_APP,
          templateData: { orderNumber, orderItemId, reason },
        }),
      );
    }

    await Promise.allSettled(promises);
  }

  // 10. Dispute resolved (arbitrated outcome; sent to customer and seller)
  async notifyDisputeResolved(
    customerUserId: string,
    sellerUserId: string,
    orderNumber: string,
    resolution: string,
    notes?: string,
  ): Promise<any> {
    const notesText = notes ? ` Notes: ${notes}` : '';
    const customerPromise = this.sendNotification({
      userId: customerUserId,
      type: 'DISPUTE_RESOLVED_CUSTOMER',
      title: `Dispute Resolved - #${orderNumber}`,
      message: `Your "Not received" claim for order #${orderNumber} was arbitrated: ${resolution}.${notesText}`,
      channel: NotificationChannel.EMAIL,
      templateData: { orderNumber, resolution, notes },
    });

    const sellerPromise = this.sendNotification({
      userId: sellerUserId,
      type: 'DISPUTE_RESOLVED_SELLER',
      title: `Dispute Resolved - #${orderNumber}`,
      message: `The delivery dispute for order #${orderNumber} was arbitrated: ${resolution}.${notesText}`,
      channel: NotificationChannel.IN_APP,
      templateData: { orderNumber, resolution, notes },
    });

    await Promise.allSettled([customerPromise, sellerPromise]);
  }

  // 11. Settlement completed (with external transaction reference number and itemized breakdown)
  async notifySettlementCompleted(
    sellerUserId: string,
    settlementNumber: string,
    netPayable: number,
    bankReference: string,
  ): Promise<any> {
    return this.sendNotification({
      userId: sellerUserId,
      type: 'SETTLEMENT_COMPLETED',
      title: `Settlement Completed - ${settlementNumber}`,
      message: `Your weekly settlement ${settlementNumber} for ₹${netPayable.toFixed(2)} has been completed. Bank Reference: ${bankReference}.`,
      channel: NotificationChannel.EMAIL,
      templateData: { settlementNumber, netPayable, bankReference },
    });
  }
}

