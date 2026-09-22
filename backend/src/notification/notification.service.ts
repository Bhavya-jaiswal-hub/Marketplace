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

    // Create database notification record
    const notification = await this.prisma.notification.create({
      data: {
        userId: user.id,
        type: dto.type,
        title: dto.title.trim(),
        message: dto.message.trim(),
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
          subject: dto.title,
          text: dto.message,
          html: `<div style="font-family: Arial, sans-serif; padding: 15px;">
            <h2>${dto.title}</h2>
            <p>${dto.message}</p>
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
}
