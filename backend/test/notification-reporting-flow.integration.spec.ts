import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { EmailService } from '../src/email/email.service';
import { NotificationService } from '../src/notification/notification.service';
import { ReportingService } from '../src/reporting/reporting.service';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  TemplateStatus,
  OrderStatus,
  PaymentStatus,
  SellerStatus,
  ProductStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('Notification, Reporting, and Administration End-to-End Integration Flow', () => {
  let prismaService: PrismaService;
  let auditService: AuditService;
  let emailService: EmailService;
  let notificationService: NotificationService;
  let reportingService: ReportingService;

  // In-memory relational database
  const db: any = {
    users: new Map(),
    customerProfiles: new Map(),
    sellerProfiles: new Map(),
    categories: new Map(),
    products: new Map(),
    inventories: new Map(),
    orders: new Map(),
    orderItems: new Map(),
    refunds: new Map(),
    settlements: new Map(),
    notifications: new Map(),
    notificationTemplates: new Map(),
    sellerVerifications: new Map(),
    verificationDocuments: new Map(),
    auditLogs: new Map(),
    activityLogs: new Map(),
  };

  beforeEach(async () => {
    for (const key of Object.keys(db)) {
      db[key].clear();
    }

    const mockPrisma: any = {
      user: {
        findUnique: jest.fn(async ({ where }: any) => db.users.get(where.id) || null),
      },
      sellerProfile: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.userId) {
            for (const s of db.sellerProfiles.values()) {
              if (s.userId === where.userId) return s;
            }
          }
          return db.sellerProfiles.get(where.id) || null;
        }),
        findMany: jest.fn(async () =>
          Array.from(db.sellerProfiles.values()).map((s: any) => ({
            ...s,
            orderItems: Array.from(db.orderItems.values()).filter(
              (i: any) => i.sellerId === s.id,
            ),
          })),
        ),
      },
      product: {
        findMany: jest.fn(async ({ where }: any) => {
          let list = Array.from(db.products.values());
          if (where?.status?.not) {
            list = list.filter((p: any) => p.status !== where.status.not);
          }
          return list.map((p: any) => ({
            ...p,
            category: db.categories.get(p.categoryId),
            seller: db.sellerProfiles.get(p.sellerId),
            inventory: Array.from(db.inventories.values()).find(
              (inv: any) => inv.productId === p.id,
            ),
          }));
        }),
      },
      inventory: {
        findMany: jest.fn(async () =>
          Array.from(db.inventories.values()).map((inv: any) => ({
            ...inv,
            product: {
              ...db.products.get(inv.productId),
              seller: db.sellerProfiles.get(
                db.products.get(inv.productId)?.sellerId,
              ),
              category: db.categories.get(
                db.products.get(inv.productId)?.categoryId,
              ),
            },
          })),
        ),
      },
      order: {
        findMany: jest.fn(async ({ where, include }: any) => {
          let list = Array.from(db.orders.values());
          if (where?.orderStatus) {
            list = list.filter((o: any) => o.orderStatus === where.orderStatus);
          }
          if (where?.paymentStatus?.in) {
            list = list.filter((o: any) =>
              where.paymentStatus.in.includes(o.paymentStatus),
            );
          }
          return list.map((o: any) => ({
            ...o,
            orderItems: Array.from(db.orderItems.values())
              .filter((i: any) => i.orderId === o.id)
              .map((i: any) => ({
                ...i,
                seller: db.sellerProfiles.get(i.sellerId),
              })),
          }));
        }),
      },
      orderItem: {
        findMany: jest.fn(async ({ where, include }: any) => {
          let list = Array.from(db.orderItems.values());
          if (where?.sellerId) {
            list = list.filter((i: any) => i.sellerId === where.sellerId);
          }
          return list.map((item: any) => {
            const res = { ...item };
            if (include?.seller) res.seller = db.sellerProfiles.get(item.sellerId);
            if (include?.product) {
              const prod = db.products.get(item.productId);
              res.product = {
                ...prod,
                category: db.categories.get(prod?.categoryId),
              };
            }
            if (include?.order) res.order = db.orders.get(item.orderId);
            return res;
          });
        }),
      },
      refund: {
        findMany: jest.fn(async () => Array.from(db.refunds.values())),
      },
      settlement: {
        findMany: jest.fn(async ({ where, include }: any) => {
          let list = Array.from(db.settlements.values());
          if (where?.sellerId) {
            list = list.filter((s: any) => s.sellerId === where.sellerId);
          }
          return list.map((s: any) => ({
            ...s,
            seller: db.sellerProfiles.get(s.sellerId),
          }));
        }),
      },
      sellerVerification: {
        findMany: jest.fn(async () =>
          Array.from(db.sellerVerifications.values()).map((v: any) => ({
            ...v,
            seller: db.sellerProfiles.get(v.sellerId),
            verificationDocuments: Array.from(
              db.verificationDocuments.values(),
            ).filter((d: any) => d.verificationId === v.id),
          })),
        ),
      },
      notification: {
        create: jest.fn(async ({ data }: any) => {
          const id = `notif-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.notifications.set(id, rec);
          return rec;
        }),
        findUnique: jest.fn(async ({ where }: any) => db.notifications.get(where.id) || null),
        findMany: jest.fn(async ({ where }: any) => {
          let list = Array.from(db.notifications.values());
          if (where?.userId) list = list.filter((n: any) => n.userId === where.userId);
          if (where?.isRead !== undefined) list = list.filter((n: any) => n.isRead === where.isRead);
          return list;
        }),
        count: jest.fn(async ({ where }: any) => {
          let list = Array.from(db.notifications.values());
          if (where?.userId) list = list.filter((n: any) => n.userId === where.userId);
          if (where?.isRead !== undefined) list = list.filter((n: any) => n.isRead === where.isRead);
          return list.length;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const n = db.notifications.get(where.id);
          const updated = { ...n, ...data, updatedAt: new Date() };
          db.notifications.set(where.id, updated);
          return updated;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const [id, notif] of db.notifications.entries()) {
            if (notif.userId === where.userId && notif.isRead === where.isRead) {
              db.notifications.set(id, { ...notif, ...data, updatedAt: new Date() });
              count++;
            }
          }
          return { count };
        }),
      },
      notificationTemplate: {
        create: jest.fn(async ({ data }: any) => {
          const id = `tmpl-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.notificationTemplates.set(id, rec);
          return rec;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.templateName) {
            for (const t of db.notificationTemplates.values()) {
              if (t.templateName === where.templateName) return t;
            }
          }
          return db.notificationTemplates.get(where.id) || null;
        }),
        findMany: jest.fn(async () => Array.from(db.notificationTemplates.values())),
        count: jest.fn(async () => db.notificationTemplates.size),
        update: jest.fn(async ({ where, data }: any) => {
          const t = db.notificationTemplates.get(where.id);
          const updated = { ...t, ...data, updatedAt: new Date() };
          db.notificationTemplates.set(where.id, updated);
          return updated;
        }),
      },
      auditLog: {
        create: jest.fn(async ({ data }: any) => {
          const id = `audit-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date() };
          db.auditLogs.set(id, rec);
          return rec;
        }),
        findMany: jest.fn(async () =>
          Array.from(db.auditLogs.values()).map((a: any) => ({
            ...a,
            user: db.users.get(a.userId),
          })),
        ),
        count: jest.fn(async () => db.auditLogs.size),
      },
      activityLog: {
        create: jest.fn(async ({ data }: any) => {
          const id = `act-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date() };
          db.activityLogs.set(id, rec);
          return rec;
        }),
        findMany: jest.fn(async () =>
          Array.from(db.activityLogs.values()).map((act: any) => ({
            ...act,
            user: db.users.get(act.userId),
          })),
        ),
        count: jest.fn(async () => db.activityLogs.size),
      },
    };

    prismaService = mockPrisma;
    auditService = new AuditService(mockPrisma);
    emailService = new EmailService(new ConfigService());
    notificationService = new NotificationService(
      mockPrisma,
      emailService,
      auditService,
    );
    reportingService = new ReportingService(mockPrisma);
  });

  it('should execute full end-to-end notification lifecycle, template management, activity logging, and reporting', async () => {
    // 1. Setup Super Admin, Customer, and Seller Users
    const adminUser = { id: 'usr-admin-1', fullName: 'Super Admin', email: 'admin@marketplace.com' };
    const customerUser = { id: 'usr-cust-1', fullName: 'Rohan Sharma', email: 'rohan@example.com' };
    const sellerUser = { id: 'usr-seller-1', fullName: 'Ananya Roy', email: 'ananya@audiohub.com' };

    db.users.set(adminUser.id, adminUser);
    db.users.set(customerUser.id, customerUser);
    db.users.set(sellerUser.id, sellerUser);

    const sellerProfile = {
      id: 'seller-prof-1',
      userId: sellerUser.id,
      displayName: 'AudioHub Electronics',
      sellerType: 'BUSINESS',
      status: SellerStatus.APPROVED,
    };
    db.sellerProfiles.set(sellerProfile.id, sellerProfile);

    // Setup Category & Products
    const category = { id: 'cat-audio', name: 'Audio & Sound', slug: 'audio' };
    db.categories.set(category.id, category);

    const product1 = {
      id: 'prod-headphones',
      sellerId: sellerProfile.id,
      categoryId: category.id,
      name: 'Wireless Noise-Canceling Headphones',
      sku: 'NC-HEAD-100',
      price: new Decimal(5000.0),
      status: ProductStatus.ACTIVE,
    };
    db.products.set(product1.id, product1);

    const inv1 = {
      id: 'inv-headphones',
      productId: product1.id,
      availableQuantity: 4, // Below lowStockThreshold (5)
      reservedQuantity: 1,
      lowStockThreshold: 5,
    };
    db.inventories.set(inv1.id, inv1);

    // Setup Order
    const order1 = {
      id: 'ord-101',
      customerId: 'cust-prof-1',
      orderNumber: 'ORD-2026-8800',
      orderStatus: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      subtotal: new Decimal(5000.0),
      discountAmount: new Decimal(0.0),
      taxAmount: new Decimal(900.0),
      totalAmount: new Decimal(5900.0),
      currency: 'INR',
      createdAt: new Date(),
    };
    db.orders.set(order1.id, order1);

    const orderItem1 = {
      id: 'item-101',
      orderId: order1.id,
      sellerId: sellerProfile.id,
      productId: product1.id,
      productName: product1.name,
      sku: product1.sku,
      unitPrice: new Decimal(5000.0),
      quantity: 1,
      totalAmount: new Decimal(5000.0),
      commissionRate: new Decimal(10.0),
      commissionAmount: new Decimal(500.0),
      sellerEarnings: new Decimal(4500.0),
      status: 'DELIVERED',
      createdAt: new Date(),
    };
    db.orderItems.set(orderItem1.id, orderItem1);

    // ================= STEP 2: NOTIFICATION DISPATCH & SAFE DELIVERY =================
    const notifRes = await notificationService.sendNotification({
      userId: customerUser.id,
      type: 'ORDER_CONFIRMED',
      title: 'Order Confirmed - #ORD-2026-8800',
      message: 'Your order for Wireless Noise-Canceling Headphones has been confirmed.',
      referenceType: 'Order',
      referenceId: order1.id,
      channel: NotificationChannel.EMAIL,
    });

    expect(notifRes.success).toBe(true);
    expect(notifRes.data.status).toBe(NotificationDeliveryStatus.DELIVERED);
    expect(notifRes.data.isRead).toBe(false);

    // Customer retrieves their unread notifications
    const custNotifs = await notificationService.getUserNotifications(
      customerUser.id,
      { isRead: false },
    );
    expect(custNotifs.success).toBe(true);
    expect(custNotifs.data.unreadCount).toBe(1);
    expect(custNotifs.data.items).toHaveLength(1);

    // Customer marks notification as read
    const readRes = await notificationService.markAsRead(
      customerUser.id,
      notifRes.data.id,
    );
    expect(readRes.success).toBe(true);
    expect(readRes.data.isRead).toBe(true);
    expect(readRes.data.readAt).toBeDefined();

    // ================= STEP 3: SUPER ADMIN NOTIFICATION TEMPLATES =================
    const templateRes = await notificationService.createTemplate(adminUser.id, {
      templateName: 'RETURN_APPROVED_IN_APP',
      notificationType: 'RETURN_APPROVED',
      titleTemplate: 'Return Approved for Order {{orderNumber}}',
      messageTemplate: 'Your return for {{productName}} was approved. Pickup scheduled.',
      channel: NotificationChannel.IN_APP,
    });

    expect(templateRes.success).toBe(true);
    expect(templateRes.data.status).toBe(TemplateStatus.ACTIVE);

    const templateList = await notificationService.getTemplates({});
    expect(templateList.success).toBe(true);
    expect(templateList.data.items).toHaveLength(1);

    // ================= STEP 4: ACTIVITY LOGGING =================
    await reportingService.recordActivity({
      userId: customerUser.id,
      activityType: 'VIEW_PRODUCT',
      description: 'Customer viewed product NC-HEAD-100',
      resourceType: 'Product',
      resourceId: product1.id,
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
    });

    const actLogs = await reportingService.getActivityLogs({});
    expect(actLogs.success).toBe(true);
    expect(actLogs.data.items).toHaveLength(1);
    expect(actLogs.data.items[0].activityType).toBe('VIEW_PRODUCT');

    // ================= STEP 5: SUPER ADMIN OPERATIONAL REPORTS =================
    // 5a. Sales Report
    const salesReport = await reportingService.getSalesReport({});
    expect(salesReport.success).toBe(true);
    expect(salesReport.data.summary.totalOrders).toBe(1);
    expect(salesReport.data.summary.totalGrossSales).toBe(5000.0);
    expect(salesReport.data.summary.totalNetSales).toBe(5900.0);

    // 5b. Revenue Report
    const revReport = await reportingService.getRevenueReport({});
    expect(revReport.success).toBe(true);
    expect(revReport.data.summary.grossMerchandiseValue).toBe(5900.0);
    expect(revReport.data.summary.totalMarketplaceCommission).toBe(500.0);
    expect(revReport.data.summary.totalSellerPayoutLiability).toBe(4500.0);

    // 5c. Commission Report
    const commReport = await reportingService.getCommissionReport({});
    expect(commReport.success).toBe(true);
    expect(commReport.data.summary.totalCommissionEarned).toBe(500.0);
    expect(commReport.data.summary.effectiveAverageCommissionRate).toBe(10.0);

    // 5d. Inventory Low-Stock Report
    const invReport = await reportingService.getInventoryReport({});
    expect(invReport.success).toBe(true);
    expect(invReport.data.summary.totalProductsTracked).toBe(1);
    expect(invReport.data.summary.lowStockItemCount).toBe(1);
    expect(invReport.data.lowStockAlerts[0].productName).toBe('Wireless Noise-Canceling Headphones');

    // 5e. Sellers Report
    const sellersReport = await reportingService.getSellersReport({});
    expect(sellersReport.success).toBe(true);
    expect(sellersReport.data.distribution.APPROVED).toBe(1);
    expect(sellersReport.data.sellers[0].totalRevenue).toBe(4500.0);

    // ================= STEP 6: SELLER ANALYTICS =================
    const sellerAnalytics = await reportingService.getSellerAnalytics(
      sellerUser.id,
      {},
    );
    expect(sellerAnalytics.success).toBe(true);
    expect(sellerAnalytics.data.summary.totalOrdersCount).toBe(1);
    expect(sellerAnalytics.data.summary.totalGrossSales).toBe(5000.0);
    expect(sellerAnalytics.data.summary.totalSellerEarnings).toBe(4500.0);
    expect(sellerAnalytics.data.topPerformingProducts[0].name).toBe('Wireless Noise-Canceling Headphones');
  });
});
