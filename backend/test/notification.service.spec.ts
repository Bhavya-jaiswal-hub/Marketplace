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
        findFirst: jest.fn(),
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
    it('should hydrate dynamic template parameters when an active template matches', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
      });

      mockPrisma.notificationTemplate.findFirst.mockResolvedValue({
        id: 'tmpl-active-1',
        notificationType: 'ORDER_PLACED',
        channel: NotificationChannel.EMAIL,
        titleTemplate: 'Order Confirmed: #{{orderNumber}}',
        messageTemplate: 'Hello {{customerName}}, your total is ₹{{amount}}.',
        status: TemplateStatus.ACTIVE,
      });

      mockPrisma.notification.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'notif-hydrated', ...data }),
      );

      mockPrisma.notification.update.mockResolvedValue({
        id: 'notif-hydrated',
        status: NotificationDeliveryStatus.DELIVERED,
      });

      const res = await service.sendNotification({
        userId,
        type: 'ORDER_PLACED',
        title: 'Fallback Title',
        message: 'Fallback Message',
        channel: NotificationChannel.EMAIL,
        templateData: {
          orderNumber: 'ORD-999',
          customerName: 'Ananya',
          amount: '1499.00',
        },
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Order Confirmed: #ORD-999',
          message: 'Hello Ananya, your total is ₹1499.00.',
        }),
      });
      expect(mockEmail.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Order Confirmed: #ORD-999',
          text: 'Hello Ananya, your total is ₹1499.00.',
        }),
      );
    });
  });

  describe('Master Lifecycle Notification Helpers (SRS FR-13, BR-13, AC-8)', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve({ id: where.id, email: `${where.id}@example.com` }),
      );
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue(null);
      mockPrisma.notification.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: `notif-${Date.now()}`, ...data }),
      );
      mockPrisma.notification.update.mockImplementation(({ where, data }: any) =>
        Promise.resolve({ id: where.id, ...data }),
      );
    });

    it('1. notifySellerRegistration: should dispatch approved and rejected notifications', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotification');

      await service.notifySellerRegistration('seller-1', true);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'seller-1',
          type: 'SELLER_APPROVED',
          channel: NotificationChannel.EMAIL,
        }),
      );

      await service.notifySellerRegistration('seller-2', false, 'GST verification failed');
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'seller-2',
          type: 'SELLER_REJECTED',
          message: expect.stringContaining('GST verification failed'),
          channel: NotificationChannel.EMAIL,
        }),
      );
    });

    it('2. notifyCategoryDecision: should dispatch in-app category decisions', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotification');

      await service.notifyCategoryDecision('seller-1', 'Men Ethnic Wear', 'APPROVED');
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'seller-1',
          type: 'CATEGORY_APPROVED',
          channel: NotificationChannel.IN_APP,
        }),
      );

      await service.notifyCategoryDecision('seller-1', 'Kids Clothing', 'REJECTED', 'Quality threshold');
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'seller-1',
          type: 'CATEGORY_REJECTED',
          message: expect.stringContaining('Quality threshold'),
          channel: NotificationChannel.IN_APP,
        }),
      );
    });

    it('3. notifyOrderPlaced: should dispatch email to customer and in-app alerts to sellers', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotification');

      await service.notifyOrderPlaced('cust-1', 'ord-101', 'ORD-2026-001', ['seller-1', 'seller-2']);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'cust-1',
          type: 'ORDER_PLACED',
          channel: NotificationChannel.EMAIL,
        }),
      );
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'seller-1',
          type: 'ORDER_PLACED_SELLER',
          channel: NotificationChannel.IN_APP,
        }),
      );
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'seller-2',
          type: 'ORDER_PLACED_SELLER',
          channel: NotificationChannel.IN_APP,
        }),
      );
    });

    it('4. notifyOrderCancelled: should notify customer and seller', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotification');

      await service.notifyOrderCancelled('cust-1', 'seller-1', 'ORD-2026-001', 'Customer requested');
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'cust-1',
          type: 'ORDER_CANCELLED',
          message: expect.stringContaining('Customer requested'),
          channel: NotificationChannel.EMAIL,
        }),
      );
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'seller-1',
          type: 'ORDER_CANCELLED_SELLER',
          channel: NotificationChannel.IN_APP,
        }),
      );
    });

    it('5. notifyOrderShipped: should send customer email with courier tracking details', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotification');

      await service.notifyOrderShipped('cust-1', 'ORD-2026-001', 'BlueDart', 'BD-998877');
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'cust-1',
          type: 'ORDER_SHIPPED',
          message: expect.stringContaining('BlueDart. Tracking: BD-998877'),
          channel: NotificationChannel.EMAIL,
        }),
      );
    });

    it('6. notifyOrderDelivered: should send delivery notice stating 5-day return window', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotification');

      await service.notifyOrderDelivered('cust-1', 'ORD-2026-001', 'Cotton Kurta');
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'cust-1',
          type: 'ORDER_DELIVERED',
          message: expect.stringContaining('5 days (120 hours) to request a return'),
          channel: NotificationChannel.EMAIL,
        }),
      );
    });

    it('7. notifyReturnLifecycle: should notify customer and seller of return status', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotification');

      await service.notifyReturnLifecycle('cust-1', 'seller-1', 'ret-101', 'APPROVED', 'Pickup scheduled');
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'cust-1',
          type: 'RETURN_APPROVED',
          message: expect.stringContaining('Pickup scheduled'),
          channel: NotificationChannel.IN_APP,
        }),
      );
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'seller-1',
          type: 'RETURN_APPROVED_SELLER',
          channel: NotificationChannel.IN_APP,
        }),
      );
    });

    it('8. notifyRefundCompleted: should send refund confirmation with gateway reference', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotification');

      await service.notifyRefundCompleted('cust-1', 1299.5, 'rfnd_razorpay_9988');
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'cust-1',
          type: 'REFUND_COMPLETED',
          message: expect.stringContaining('Gateway Reference: rfnd_razorpay_9988'),
          channel: NotificationChannel.EMAIL,
        }),
      );
    });

    it('9. notifyDisputeRaised: should alert Super Admin and freeze notification to seller', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotification');

      await service.notifyDisputeRaised('admin-1', 'seller-1', 'ORD-2026-001', 'item-1', 'Package empty');
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          type: 'DISPUTE_RAISED_ADMIN',
          channel: NotificationChannel.IN_APP,
        }),
      );
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'seller-1',
          type: 'DISPUTE_RAISED_SELLER',
          message: expect.stringContaining('Settlement for this item is frozen pending Super Admin arbitration'),
          channel: NotificationChannel.IN_APP,
        }),
      );
    });

    it('10. notifyDisputeResolved: should notify customer via email and seller in-app with resolution', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotification');

      await service.notifyDisputeResolved('cust-1', 'seller-1', 'ORD-2026-001', 'REFUND_APPROVED', 'Arbitration in customer favor');
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'cust-1',
          type: 'DISPUTE_RESOLVED_CUSTOMER',
          channel: NotificationChannel.EMAIL,
        }),
      );
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'seller-1',
          type: 'DISPUTE_RESOLVED_SELLER',
          channel: NotificationChannel.IN_APP,
        }),
      );
    });

    it('11. notifySettlementCompleted: should notify seller with net payable and bank reference', async () => {
      const sendSpy = jest.spyOn(service, 'sendNotification');

      await service.notifySettlementCompleted('seller-1', 'SETTLE-2026-W42', 45000.0, 'UTR_HDFC_991823');
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'seller-1',
          type: 'SETTLEMENT_COMPLETED',
          message: expect.stringContaining('Bank Reference: UTR_HDFC_991823'),
          channel: NotificationChannel.EMAIL,
        }),
      );
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
