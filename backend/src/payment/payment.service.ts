import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { ConfirmPaymentDto, ReconcilePaymentDto } from './dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly razorpayKeySecret =
    process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_12345';
  private readonly razorpayWebhookSecret =
    process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_12345';

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly audit: AuditService,
  ) {}

  async verifyClientPayment(userId: string, dto: ConfirmPaymentDto) {
    // 1. Verify Razorpay cryptographic signature
    const expectedSignature = crypto
      .createHmac('sha256', this.razorpayKeySecret)
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      this.logger.warn(
        `Invalid Razorpay signature for payment reference: ${dto.paymentReference}`,
      );
      throw new BadRequestException('Invalid Razorpay payment signature');
    }

    // 2. Fetch payment attempt and associated order
    const paymentPending = await this.prisma.paymentPending.findUnique({
      where: { paymentReference: dto.paymentReference },
      include: {
        order: {
          include: {
            orderItems: true,
          },
        },
      },
    });

    if (!paymentPending) {
      throw new NotFoundException('Payment record not found');
    }

    // Idempotency: if already confirmed, return success immediately
    if (paymentPending.status === PaymentStatus.PAID) {
      return {
        success: true,
        data: {
          paymentReference: paymentPending.paymentReference,
          orderId: paymentPending.orderId,
          orderNumber: paymentPending.order.orderNumber,
          status: 'PAID',
          amount: Number(paymentPending.amount),
          currency: paymentPending.currency,
        },
        message: 'Payment has already been confirmed',
      };
    }

    // Check expiration
    if (new Date() > paymentPending.expiresAt) {
      // Mark as expired and release reserved inventory
      await this.prisma.paymentPending.update({
        where: { id: paymentPending.id },
        data: { status: PaymentStatus.EXPIRED },
      });

      // Release reserved inventory in batch
      await this.inventoryService.releaseReservation({
        reservationId: paymentPending.order.orderNumber,
        items: paymentPending.order.orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      throw new BadRequestException(
        'Payment attempt has expired. Inventory reservation released.',
      );
    }

    // 3. Authoritative confirmation workflow
    // Confirm stock reservations in batch
    await this.inventoryService.confirmReservation({
      reservationId: paymentPending.order.orderNumber,
      items: paymentPending.order.orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });

    // Update PaymentPending to PAID
    await this.prisma.paymentPending.update({
      where: { id: paymentPending.id },
      data: { status: PaymentStatus.PAID },
    });

    // Record immutable PaymentTransaction
    const paymentTransaction = await this.prisma.paymentTransaction.create({
      data: {
        orderId: paymentPending.orderId,
        customerId: paymentPending.customerId,
        paymentReference: paymentPending.paymentReference,
        providerTransactionId: dto.razorpayPaymentId,
        amount: paymentPending.amount,
        currency: paymentPending.currency,
        paymentMethod: 'RAZORPAY',
        status: PaymentTransactionStatus.SUCCEEDED,
        transactionType: PaymentTransactionType.PAYMENT,
      },
    });

    // Update Order to CONFIRMED and PAID
    await this.prisma.order.update({
      where: { id: paymentPending.orderId },
      data: {
        orderStatus: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    // Update all OrderItems to CONFIRMED
    for (const item of paymentPending.order.orderItems) {
      await this.prisma.orderItem.update({
        where: { id: item.id },
        data: { status: OrderItemStatus.CONFIRMED },
      });

      await this.prisma.orderItemHistory.create({
        data: {
          orderItemId: item.id,
          previousStatus: item.status,
          newStatus: OrderItemStatus.CONFIRMED,
          eventType: 'Status Changed',
          reason: `Payment confirmed via Razorpay (Payment ID: ${dto.razorpayPaymentId})`,
          changedBy: userId,
        },
      });
    }

    await this.audit.logAction({
      userId,
      action: 'PAYMENT_CONFIRMED',
      resourceType: 'PaymentTransaction',
      resourceId: paymentTransaction.id,
      newValue: {
        paymentReference: paymentPending.paymentReference,
        providerTransactionId: dto.razorpayPaymentId,
        amount: Number(paymentPending.amount),
      },
    });

    return {
      success: true,
      data: {
        paymentReference: paymentPending.paymentReference,
        orderId: paymentPending.orderId,
        orderNumber: paymentPending.order.orderNumber,
        status: 'PAID',
        amount: Number(paymentPending.amount),
        currency: paymentPending.currency,
      },
      message: 'Payment confirmed and order placed successfully',
    };
  }

  async handleRazorpayWebhook(payload: any, signature: string) {
    const rawPayloadString =
      typeof payload === 'string' ? payload : JSON.stringify(payload);

    const expectedSignature = crypto
      .createHmac('sha256', this.razorpayWebhookSecret)
      .update(rawPayloadString)
      .digest('hex');

    if (expectedSignature !== signature) {
      this.logger.warn('Rejected Razorpay webhook with invalid signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const eventType = event.event;

    this.logger.log(`Received verified Razorpay webhook event: ${eventType}`);

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayPaymentId = paymentEntity?.id;
      const razorpayOrderId = paymentEntity?.order_id;
      const paymentReference =
        paymentEntity?.notes?.paymentReference ||
        paymentEntity?.description;

      if (razorpayPaymentId) {
        // Idempotency: check if transaction already recorded
        const existingTx = await this.prisma.paymentTransaction.findUnique({
          where: { providerTransactionId: razorpayPaymentId },
        });

        if (existingTx) {
          return { received: true, message: 'Already processed' };
        }

        if (paymentReference) {
          const paymentPending = await this.prisma.paymentPending.findUnique({
            where: { paymentReference },
            include: { order: { include: { orderItems: true } } },
          });

          if (paymentPending && paymentPending.status !== PaymentStatus.PAID) {
            // Confirm stock reservations in batch
            await this.inventoryService.confirmReservation({
              reservationId: paymentPending.order.orderNumber,
              items: paymentPending.order.orderItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            });

            await this.prisma.paymentPending.update({
              where: { id: paymentPending.id },
              data: { status: PaymentStatus.PAID },
            });

            await this.prisma.paymentTransaction.create({
              data: {
                orderId: paymentPending.orderId,
                customerId: paymentPending.customerId,
                paymentReference,
                providerTransactionId: razorpayPaymentId,
                amount: paymentPending.amount,
                currency: paymentPending.currency,
                paymentMethod: 'RAZORPAY',
                status: PaymentTransactionStatus.SUCCEEDED,
                transactionType: PaymentTransactionType.PAYMENT,
                rawWebhookPayload: event,
              },
            });

            await this.prisma.order.update({
              where: { id: paymentPending.orderId },
              data: {
                orderStatus: OrderStatus.CONFIRMED,
                paymentStatus: PaymentStatus.PAID,
              },
            });

            for (const item of paymentPending.order.orderItems) {
              await this.prisma.orderItem.update({
                where: { id: item.id },
                data: { status: OrderItemStatus.CONFIRMED },
              });
            }
          }
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const paymentReference =
        paymentEntity?.notes?.paymentReference ||
        paymentEntity?.description;

      if (paymentReference) {
        const paymentPending = await this.prisma.paymentPending.findUnique({
          where: { paymentReference },
          include: { order: { include: { orderItems: true } } },
        });

        if (paymentPending && paymentPending.status === PaymentStatus.PENDING) {
          await this.prisma.paymentPending.update({
            where: { id: paymentPending.id },
            data: { status: PaymentStatus.FAILED },
          });

          // Release reservations in batch
          await this.inventoryService.releaseReservation({
            reservationId: paymentPending.order.orderNumber,
            items: paymentPending.order.orderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          });
        }
      }
    }

    return { received: true };
  }

  async getPaymentStatus(userId: string, paymentReference: string) {
    const payment = await this.prisma.paymentPending.findUnique({
      where: { paymentReference },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderStatus: true,
            paymentStatus: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment attempt not found');
    }

    return {
      success: true,
      data: payment,
    };
  }

  async reconcilePayment(paymentReference: string, dto: ReconcilePaymentDto) {
    const payment = await this.prisma.paymentPending.findUnique({
      where: { paymentReference },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.audit.logAction({
      action: 'PAYMENT_RECONCILED',
      resourceType: 'PaymentPending',
      resourceId: payment.id,
      newValue: {
        notes: dto.notes,
        paymentReference,
      },
    });

    return {
      success: true,
      message: 'Payment reconciliation record created',
      data: payment,
    };
  }
}
