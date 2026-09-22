import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../src/notification/notification.service';
import { PrismaService } from '../src/prisma.service';
import { EmailService } from '../src/email/email.service';
import { AuditService } from '../src/audit/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  TemplateStatus,
} from '@prisma/client';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockPrisma: any;
  let mockEmail: any;
  let mockAudit: any;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
      notification: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      notificationTemplate: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    mockEmail = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };

    mockAudit = {
      logAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('sendNotification', () => {
    const userId = 'user-1';

    it('should create in-app notification and deliver email successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
      });

      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        userId,
        type: 'ORDER_CONFIRMED',
        title: 'Order Confirmed',
        message: 'Your order #ORD-123 is confirmed',
      });

      mockPrisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        status: NotificationDeliveryStatus.DELIVERED,
      });

      const res = await service.sendNotification({
        userId,
        type: 'ORDER_CONFIRMED',
        title: 'Order Confirmed',
        message: 'Your order #ORD-123 is confirmed',
        channel: NotificationChannel.EMAIL,
      });

      expect(res.success).toBe(true);
      expect(mockEmail.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Order Confirmed',
        }),
      );
    });

    it('should catch email failure safely without rolling back or failing notification creation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
      });

      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-2',
        userId,
        type: 'ORDER_CONFIRMED',
        title: 'Order Confirmed',
        message: 'Your order is confirmed',
      });

      mockEmail.sendEmail.mockRejectedValue(new Error('SES network timeout'));

      mockPrisma.notification.update.mockResolvedValue({
        id: 'notif-2',
        status: NotificationDeliveryStatus.FAILED,
        failureReason: 'SES network timeout',
      });

      const res = await service.sendNotification({
        userId,
        type: 'ORDER_CONFIRMED',
        title: 'Order Confirmed',
        message: 'Your order is confirmed',
        channel: NotificationChannel.EMAIL,
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-2' },
        data: expect.objectContaining({
          status: NotificationDeliveryStatus.FAILED,
          failureReason: 'SES network timeout',
        }),
      });
    });
  });

  describe('markAsRead & markAllAsRead', () => {
    const userId = 'user-1';

    it('should mark single notification as read', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId,
        isRead: false,
      });

      mockPrisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        isRead: true,
      });

      const res = await service.markAsRead(userId, 'notif-1');
      expect(res.success).toBe(true);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: expect.objectContaining({ isRead: true }),
      });
    });

    it('should mark all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({
        count: 5,
      });

      const res = await service.markAllAsRead(userId);
      expect(res.success).toBe(true);
      expect(res.data.updatedCount).toBe(5);
    });
  });

  describe('createTemplate & updateTemplate', () => {
    const adminUserId = 'admin-1';

    it('should create a notification template', async () => {
      mockPrisma.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrisma.notificationTemplate.create.mockResolvedValue({
        id: 'tmpl-1',
        templateName: 'ORDER_PLACED_EMAIL',
        notificationType: 'ORDER_PLACED',
        titleTemplate: 'Order Placed: {{orderNumber}}',
        messageTemplate: 'Hello {{customerName}}, your order {{orderNumber}} has been placed.',
        status: TemplateStatus.ACTIVE,
      });

      const res = await service.createTemplate(adminUserId, {
        templateName: 'ORDER_PLACED_EMAIL',
        notificationType: 'ORDER_PLACED',
        titleTemplate: 'Order Placed: {{orderNumber}}',
        messageTemplate: 'Hello {{customerName}}, your order {{orderNumber}} has been placed.',
      });

      expect(res.success).toBe(true);
      expect(res.data.id).toBe('tmpl-1');
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'NOTIFICATION_TEMPLATE_CREATED' }),
      );
    });
  });
});
