import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentService } from '../src/payment/payment.service';
import {
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from '@prisma/client';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: any;
  let inventoryService: any;
  let audit: any;

  const razorpayKeySecret = 'rzp_test_secret_12345';
  const razorpayWebhookSecret = 'rzp_webhook_secret_12345';

  const mockPaymentPending = {
    id: 'pay-1',
    orderId: 'ord-1',
    customerId: 'cust-1',
    paymentReference: 'PAY-123',
    providerOrderReference: 'order_123',
    amount: 5000.0,
    currency: 'INR',
    status: PaymentStatus.PENDING,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins in future
    order: {
      id: 'ord-1',
      orderNumber: 'ORD-123',
      orderItems: [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 2,
          status: OrderItemStatus.PENDING,
        },
      ],
    },
  };

  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = razorpayKeySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = razorpayWebhookSecret;

    prisma = {
      paymentPending: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      paymentTransaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      order: {
        update: jest.fn(),
      },
      orderItem: {
        update: jest.fn(),
      },
      orderItemHistory: {
        create: jest.fn(),
      },
    };

    inventoryService = {
      confirmReservation: jest.fn().mockResolvedValue(true),
      releaseReservation: jest.fn().mockResolvedValue(true),
    };

    audit = {
      logAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    service = new PaymentService(prisma, inventoryService, audit);
  });

  describe('verifyClientPayment', () => {
    it('should confirm payment, record transaction, and confirm inventory with valid signature', async () => {
      const razorpayOrderId = 'order_123';
      const razorpayPaymentId = 'pay_abc123';
      const validSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      prisma.paymentPending.findUnique.mockResolvedValue(mockPaymentPending);
      prisma.paymentTransaction.create.mockResolvedValue({
        id: 'tx-1',
        providerTransactionId: razorpayPaymentId,
      });

      const res = await service.verifyClientPayment('user-cust-1', {
        paymentReference: 'PAY-123',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe('PAID');
      expect(inventoryService.confirmReservation).toHaveBeenCalledWith({
        reservationId: 'ORD-123',
        items: [{ productId: 'prod-1', quantity: 2 }],
      });
      expect(prisma.paymentPending.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { status: PaymentStatus.PAID },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        data: {
          orderStatus: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
        },
      });
    });

    it('should reject payment confirmation when signature is invalid/tampered', async () => {
      await expect(
        service.verifyClientPayment('user-cust-1', {
          paymentReference: 'PAY-123',
          razorpayOrderId: 'order_123',
          razorpayPaymentId: 'pay_abc123',
          razorpaySignature: 'invalid_tampered_signature',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle idempotency when payment is already marked as PAID', async () => {
      const razorpayOrderId = 'order_123';
      const razorpayPaymentId = 'pay_abc123';
      const validSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      prisma.paymentPending.findUnique.mockResolvedValue({
        ...mockPaymentPending,
        status: PaymentStatus.PAID,
      });

      const res = await service.verifyClientPayment('user-cust-1', {
        paymentReference: 'PAY-123',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe('PAID');
      expect(inventoryService.confirmReservation).not.toHaveBeenCalled();
    });

    it('should release inventory reservation if payment attempt has expired', async () => {
      const razorpayOrderId = 'order_123';
      const razorpayPaymentId = 'pay_abc123';
      const validSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      prisma.paymentPending.findUnique.mockResolvedValue({
        ...mockPaymentPending,
        expiresAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins in past
      });

      await expect(
        service.verifyClientPayment('user-cust-1', {
          paymentReference: 'PAY-123',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: validSignature,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(inventoryService.releaseReservation).toHaveBeenCalledWith({
        reservationId: 'ORD-123',
        items: [{ productId: 'prod-1', quantity: 2 }],
      });
    });
  });

  describe('handleRazorpayWebhook', () => {
    it('should process payment.captured event and confirm order', async () => {
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_hook_123',
              order_id: 'order_123',
              notes: { paymentReference: 'PAY-123' },
            },
          },
        },
      };
      const rawPayload = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', razorpayWebhookSecret)
        .update(rawPayload)
        .digest('hex');

      prisma.paymentTransaction.findUnique.mockResolvedValue(null);
      prisma.paymentPending.findUnique.mockResolvedValue(mockPaymentPending);

      const res = await service.handleRazorpayWebhook(payload, signature);
      expect(res.received).toBe(true);
      expect(inventoryService.confirmReservation).toHaveBeenCalledWith({
        reservationId: 'ORD-123',
        items: [{ productId: 'prod-1', quantity: 2 }],
      });
      expect(prisma.paymentPending.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { status: PaymentStatus.PAID },
      });
    });

    it('should reject webhook with invalid signature', async () => {
      await expect(
        service.handleRazorpayWebhook({ event: 'payment.captured' }, 'bad_sig'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
