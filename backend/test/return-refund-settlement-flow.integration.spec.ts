import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { StockAdjustmentMode } from '../src/inventory/dto';
import { CustomerService } from '../src/customer/customer.service';
import { ReturnRefundService } from '../src/return-refund/return-refund.service';
import { SettlementService } from '../src/settlement/settlement.service';
import {
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  ReturnRequestStatus,
  RefundStatus,
  SettlementStatus,
  SettlementPayoutMethod,
  StockChangeType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('Return, Refund, and Settlement End-to-End Integration Flow', () => {
  let prismaService: PrismaService;
  let auditService: AuditService;
  let inventoryService: InventoryService;
  let customerService: CustomerService;
  let returnRefundService: ReturnRefundService;
  let settlementService: SettlementService;

  // In-memory relational state
  const db: any = {
    users: new Map(),
    customerProfiles: new Map(),
    sellerProfiles: new Map(),
    products: new Map(),
    inventories: new Map(),
    inventoryHistories: new Map(),
    orders: new Map(),
    orderItems: new Map(),
    orderItemHistories: new Map(),
    paymentTransactions: new Map(),
    returnRequests: new Map(),
    refunds: new Map(),
    settlements: new Map(),
    settlementItems: new Map(),
    auditLogs: new Map(),
  };

  beforeEach(async () => {
    // Clear in-memory databases
    for (const key of Object.keys(db)) {
      db[key].clear();
    }

    const mockPrisma: any = {
      user: {
        findUnique: jest.fn(async ({ where }: any) => db.users.get(where.id) || null),
      },
      customerProfile: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.userId) {
            for (const p of db.customerProfiles.values()) {
              if (p.userId === where.userId) return p;
            }
          }
          return db.customerProfiles.get(where.id) || null;
        }),
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
      },
      product: {
        findUnique: jest.fn(async ({ where }: any) => db.products.get(where.id) || null),
      },
      inventory: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          let inv: any = null;
          if (where.productId) {
            for (const item of db.inventories.values()) {
              if (item.productId === where.productId) {
                inv = item;
                break;
              }
            }
          } else if (where.id) {
            inv = db.inventories.get(where.id) || null;
          }
          if (inv && include?.product) {
            return { ...inv, product: db.products.get(inv.productId) };
          }
          return inv;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const inv = db.inventories.get(where.id);
          const updated = { ...inv, ...data, updatedAt: new Date() };
          db.inventories.set(where.id, updated);
          return updated;
        }),
      },
      inventoryHistory: {
        create: jest.fn(async ({ data }: any) => {
          const id = `invh-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date() };
          db.inventoryHistories.set(id, rec);
          return rec;
        }),
      },
      order: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          const o = db.orders.get(where.id);
          if (!o) return null;
          const res = { ...o };
          if (include?.paymentTransactions) {
            res.paymentTransactions = Array.from(db.paymentTransactions.values()).filter(
              (tx: any) => tx.orderId === o.id,
            );
          }
          if (include?.orderItems) {
            res.orderItems = Array.from(db.orderItems.values()).filter(
              (i: any) => i.orderId === o.id,
            );
          }
          if (include?.refunds) {
            res.refunds = Array.from(db.refunds.values()).filter(
              (r: any) => r.orderId === o.id,
            );
          }
          return res;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const o = db.orders.get(where.id);
          const updated = { ...o, ...data, updatedAt: new Date() };
          db.orders.set(where.id, updated);
          return updated;
        }),
      },
      orderItem: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          const item = db.orderItems.get(where.id);
          if (!item) return null;
          const res = { ...item };
          if (include?.order) {
            const ord = db.orders.get(item.orderId);
            if (ord) {
              const ordCopy = { ...ord };
              if (include.order.include?.paymentTransactions) {
                ordCopy.paymentTransactions = Array.from(
                  db.paymentTransactions.values(),
                ).filter((t: any) => t.orderId === ord.id);
              }
              if (include.order.include?.refunds) {
                ordCopy.refunds = Array.from(db.refunds.values()).filter(
                  (r: any) => r.orderId === ord.id,
                );
              }
              if (include.order.include?.orderItems) {
                ordCopy.orderItems = Array.from(db.orderItems.values()).filter(
                  (oi: any) => oi.orderId === ord.id,
                );
              }
              res.order = ordCopy;
            }
          }
          if (include?.seller) {
            res.seller = db.sellerProfiles.get(item.sellerId);
          }
          if (include?.returnRequests) {
            res.returnRequests = Array.from(db.returnRequests.values()).filter(
              (r: any) => r.orderItemId === item.id,
            );
          }
          if (include?.refunds) {
            res.refunds = Array.from(db.refunds.values()).filter(
              (rf: any) => rf.orderItemId === item.id,
            );
          }
          return res;
        }),
        findMany: jest.fn(async ({ where, include }: any) => {
          let list = Array.from(db.orderItems.values());
          if (where?.sellerId) list = list.filter((i: any) => i.sellerId === where.sellerId);
          if (where?.status) list = list.filter((i: any) => i.status === where.status);
          if (where?.settlementItem === null) {
            list = list.filter((i: any) => !db.settlementItems.has(i.id));
          }
          if (where?.createdAt?.gte) {
            list = list.filter((i: any) => new Date(i.createdAt) >= where.createdAt.gte);
          }
          if (where?.createdAt?.lte) {
            list = list.filter((i: any) => new Date(i.createdAt) <= where.createdAt.lte);
          }
          return list.map((item: any) => {
            const res = { ...item };
            if (include?.order) res.order = db.orders.get(item.orderId);
            if (include?.returnRequests) {
              res.returnRequests = Array.from(db.returnRequests.values()).filter(
                (r: any) => r.orderItemId === item.id,
              );
            }
            if (include?.refunds) {
              res.refunds = Array.from(db.refunds.values()).filter(
                (rf: any) => rf.orderItemId === item.id,
              );
            }
            return res;
          });
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const item = db.orderItems.get(where.id);
          const updated = { ...item, ...data, updatedAt: new Date() };
          db.orderItems.set(where.id, updated);
          return updated;
        }),
      },
      orderItemHistory: {
        create: jest.fn(async ({ data }: any) => {
          const id = `oih-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date() };
          db.orderItemHistories.set(id, rec);
          return rec;
        }),
      },
      returnRequest: {
        create: jest.fn(async ({ data }: any) => {
          const id = `ret-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.returnRequests.set(id, rec);
          return rec;
        }),
        findUnique: jest.fn(async ({ where, include }: any) => {
          const ret = db.returnRequests.get(where.id);
          if (!ret) return null;
          const res = { ...ret };
          if (include?.orderItem) {
            res.orderItem = db.orderItems.get(ret.orderItemId);
          }
          if (include?.order) {
            const ord = db.orders.get(ret.orderId);
            if (ord) {
              const ordCopy = { ...ord };
              if (include.order.include?.paymentTransactions) {
                ordCopy.paymentTransactions = Array.from(
                  db.paymentTransactions.values(),
                ).filter((t: any) => t.orderId === ord.id);
              }
              res.order = ordCopy;
            }
          }
          if (include?.customer) res.customer = db.customerProfiles.get(ret.customerId);
          if (include?.seller) res.seller = db.sellerProfiles.get(ret.sellerId);
          if (include?.refund) {
            res.refund = Array.from(db.refunds.values()).find(
              (rf: any) => rf.returnRequestId === ret.id,
            );
          }
          return res;
        }),
        findMany: jest.fn(async ({ where, include }: any) => {
          let list = Array.from(db.returnRequests.values());
          if (where?.customerId) list = list.filter((r: any) => r.customerId === where.customerId);
          if (where?.sellerId) list = list.filter((r: any) => r.sellerId === where.sellerId);
          if (where?.status) list = list.filter((r: any) => r.status === where.status);
          return list.map((r: any) => {
            const copy = { ...r };
            if (include?.orderItem) copy.orderItem = db.orderItems.get(r.orderItemId);
            if (include?.seller) copy.seller = db.sellerProfiles.get(r.sellerId);
            if (include?.customer) copy.customer = db.customerProfiles.get(r.customerId);
            return copy;
          });
        }),
        count: jest.fn(async () => db.returnRequests.size),
        update: jest.fn(async ({ where, data }: any) => {
          const r = db.returnRequests.get(where.id);
          const updated = { ...r, ...data, updatedAt: new Date() };
          db.returnRequests.set(where.id, updated);
          return updated;
        }),
      },
      refund: {
        create: jest.fn(async ({ data }: any) => {
          const id = `rfnd-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.refunds.set(id, rec);
          return rec;
        }),
        findUnique: jest.fn(async ({ where, include }: any) => {
          const rf = db.refunds.get(where.id);
          if (!rf) return null;
          const res = { ...rf };
          if (include?.order) {
            const ord = db.orders.get(rf.orderId);
            if (ord) {
              const ordCopy = { ...ord };
              if (include.order.include?.refunds) {
                ordCopy.refunds = Array.from(db.refunds.values()).filter(
                  (r: any) => r.orderId === ord.id,
                );
              }
              if (include.order.include?.orderItems) {
                ordCopy.orderItems = Array.from(db.orderItems.values()).filter(
                  (oi: any) => oi.orderId === ord.id,
                );
              }
              res.order = ordCopy;
            }
          }
          if (include?.orderItem) res.orderItem = db.orderItems.get(rf.orderItemId);
          if (include?.returnRequest) res.returnRequest = db.returnRequests.get(rf.returnRequestId);
          if (include?.customer) res.customer = db.customerProfiles.get(rf.customerId);
          return res;
        }),
        findMany: jest.fn(async () => Array.from(db.refunds.values())),
        count: jest.fn(async () => db.refunds.size),
        update: jest.fn(async ({ where, data }: any) => {
          const rf = db.refunds.get(where.id);
          const updated = { ...rf, ...data, updatedAt: new Date() };
          db.refunds.set(where.id, updated);
          return updated;
        }),
      },
      settlement: {
        create: jest.fn(async ({ data }: any) => {
          const id = `set-${Date.now()}-${Math.random()}`;
          const { items, ...props } = data;
          const settlementRec = {
            id,
            ...props,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          db.settlements.set(id, settlementRec);

          if (items?.create) {
            for (const itemData of items.create) {
              const itemId = `si-${Date.now()}-${Math.random()}`;
              const itemRec = {
                id: itemId,
                settlementId: id,
                ...itemData,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              db.settlementItems.set(itemData.orderItemId, itemRec);
            }
          }
          return {
            ...settlementRec,
            items: Array.from(db.settlementItems.values()).filter(
              (si: any) => si.settlementId === id,
            ),
          };
        }),
        findUnique: jest.fn(async ({ where, include }: any) => {
          const s = db.settlements.get(where.id);
          if (!s) return null;
          const res = { ...s };
          if (include?.seller) res.seller = db.sellerProfiles.get(s.sellerId);
          if (include?.items) {
            res.items = Array.from(db.settlementItems.values())
              .filter((si: any) => si.settlementId === s.id)
              .map((si: any) => {
                const siCopy = { ...si };
                if (include.items.include?.orderItem) {
                  const oi = db.orderItems.get(si.orderItemId);
                  if (oi) {
                    const oiCopy = { ...oi };
                    if (include.items.include.orderItem.include?.order) {
                      oiCopy.order = db.orders.get(oi.orderId);
                    }
                    siCopy.orderItem = oiCopy;
                  }
                }
                return siCopy;
              });
          }
          return res;
        }),
        findMany: jest.fn(async ({ where, include }: any) => {
          let list = Array.from(db.settlements.values());
          if (where?.sellerId) list = list.filter((s: any) => s.sellerId === where.sellerId);
          if (where?.status) list = list.filter((s: any) => s.status === where.status);
          return list.map((s: any) => {
            const copy = { ...s };
            if (include?.seller) copy.seller = db.sellerProfiles.get(s.sellerId);
            if (include?.items) {
              copy.items = Array.from(db.settlementItems.values()).filter(
                (si: any) => si.settlementId === s.id,
              );
            }
            return copy;
          });
        }),
        count: jest.fn(async () => db.settlements.size),
        update: jest.fn(async ({ where, data }: any) => {
          const s = db.settlements.get(where.id);
          const updated = { ...s, ...data, updatedAt: new Date() };
          db.settlements.set(where.id, updated);
          return {
            ...updated,
            items: Array.from(db.settlementItems.values()).filter(
              (si: any) => si.settlementId === s.id,
            ),
          };
        }),
      },
      paymentTransaction: {
        create: jest.fn(async ({ data }: any) => {
          const id = `ptx-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date() };
          db.paymentTransactions.set(id, rec);
          return rec;
        }),
      },
      auditLog: {
        create: jest.fn(async ({ data }: any) => {
          const id = `audit-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date() };
          db.auditLogs.set(id, rec);
          return rec;
        }),
      },
      $transaction: jest.fn(async (cb: any) => cb(mockPrisma)),
    };

    prismaService = mockPrisma;
    auditService = new AuditService(mockPrisma);
    inventoryService = new InventoryService(mockPrisma, auditService);
    customerService = new CustomerService(mockPrisma, auditService);
    returnRefundService = new ReturnRefundService(
      mockPrisma,
      auditService,
      inventoryService,
    );
    settlementService = new SettlementService(mockPrisma, auditService);
  });

  it('should execute full end-to-end return, physical restock, refund processing, settlement preview, creation, and manual payout flow', async () => {
    // 1. Setup Customer User & Profile
    const customerUser = {
      id: 'cust-usr-1',
      fullName: 'Vikram Mehta',
      email: 'vikram@example.com',
    };
    db.users.set(customerUser.id, customerUser);
    const custProfile = {
      id: 'prof-cust-1',
      userId: customerUser.id,
      firstName: 'Vikram',
      lastName: 'Mehta',
    };
    db.customerProfiles.set(custProfile.id, custProfile);

    // 2. Setup Seller A (Earphones) and Seller B (Powerbank)
    const sellerAUser = { id: 'usr-seller-a', email: 'sellerA@example.com' };
    const sellerBUser = { id: 'usr-seller-b', email: 'sellerB@example.com' };
    db.users.set(sellerAUser.id, sellerAUser);
    db.users.set(sellerBUser.id, sellerBUser);

    const sellerA = {
      id: 'seller-profile-a',
      userId: sellerAUser.id,
      displayName: 'SoundBeat Audio',
      payoutDetails: {
        accountNumber: '1122334455',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank',
      },
    };
    const sellerB = {
      id: 'seller-profile-b',
      userId: sellerBUser.id,
      displayName: 'VoltTech Powers',
      payoutDetails: {
        accountNumber: '9988776655',
        ifscCode: 'ICIC0005678',
        bankName: 'ICICI Bank',
      },
    };
    db.sellerProfiles.set(sellerA.id, sellerA);
    db.sellerProfiles.set(sellerB.id, sellerB);

    // 3. Setup Products & Inventories
    const prodA = {
      id: 'prod-earphones',
      name: 'Wireless Earbuds Pro',
      sku: 'EAR-PRO-1',
      sellerId: sellerA.id,
      price: new Decimal(2000.0),
    };
    const prodB = {
      id: 'prod-powerbank',
      name: '20000mAh Power Bank',
      sku: 'PWR-20K',
      sellerId: sellerB.id,
      price: new Decimal(1500.0),
    };
    db.products.set(prodA.id, prodA);
    db.products.set(prodB.id, prodB);

    const invA = {
      id: 'inv-a',
      productId: prodA.id,
      availableQuantity: 10,
      reservedQuantity: 0,
    };
    const invB = {
      id: 'inv-b',
      productId: prodB.id,
      availableQuantity: 15,
      reservedQuantity: 0,
    };
    db.inventories.set(invA.id, invA);
    db.inventories.set(invB.id, invB);

    // 4. Setup Multi-Seller Order with 2 items
    const orderId = 'order-multi-1';
    const order = {
      id: orderId,
      customerId: custProfile.id,
      orderNumber: 'ORD-2026-9001',
      orderStatus: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      currency: 'INR',
      subtotal: new Decimal(3500.0),
      totalAmount: new Decimal(3500.0),
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
    };
    db.orders.set(orderId, order);

    const paymentTxId = 'tx-paid-1';
    db.paymentTransactions.set(paymentTxId, {
      id: paymentTxId,
      orderId,
      customerId: custProfile.id,
      amount: new Decimal(3500.0),
      status: 'SUCCEEDED',
      transactionType: 'PAYMENT',
    });

    // Item A delivered 2 days ago (eligible for 5-day return window)
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const itemAId = 'item-a-1';
    const itemA = {
      id: itemAId,
      orderId,
      sellerId: sellerA.id,
      productId: prodA.id,
      productName: prodA.name,
      sku: prodA.sku,
      unitPrice: new Decimal(2000.0),
      quantity: 1,
      totalAmount: new Decimal(2000.0),
      commissionRate: new Decimal(10.0),
      commissionAmount: new Decimal(200.0),
      sellerEarnings: new Decimal(1800.0),
      status: OrderItemStatus.DELIVERED,
      deliveredAt: twoDaysAgo,
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
    };
    db.orderItems.set(itemAId, itemA);

    // Item B delivered 10 days ago (eligible for 7-day holding settlement period)
    const tenDaysAgo = new Date('2026-09-10T10:00:00.000Z');
    const itemBId = 'item-b-1';
    const itemB = {
      id: itemBId,
      orderId,
      sellerId: sellerB.id,
      productId: prodB.id,
      productName: prodB.name,
      sku: prodB.sku,
      unitPrice: new Decimal(1500.0),
      quantity: 1,
      totalAmount: new Decimal(1500.0),
      commissionRate: new Decimal(10.0),
      commissionAmount: new Decimal(150.0),
      sellerEarnings: new Decimal(1350.0),
      status: OrderItemStatus.DELIVERED,
      deliveredAt: tenDaysAgo,
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
    };
    db.orderItems.set(itemBId, itemB);

    // ================= STEP 5: CUSTOMER INITIATES RETURN FOR ITEM A =================
    const returnReqRes = await returnRefundService.createReturnRequest(
      customerUser.id,
      orderId,
      itemAId,
      {
        returnQuantity: 1,
        reason: 'Audio distortion in left earpiece',
        customerComments: 'Tested on two phones, issue persists',
      },
    );

    expect(returnReqRes.success).toBe(true);
    const returnRequestId = returnReqRes.data.id;
    expect(returnReqRes.data.status).toBe(ReturnRequestStatus.PENDING);
    expect(db.orderItems.get(itemAId).status).toBe(OrderItemStatus.RETURN_REQUESTED);

    // ================= STEP 6: ADMIN APPROVES RETURN & SCHEDULES PICKUP =================
    const adminUserId = 'super-admin-1';
    const approveRes = await returnRefundService.approveReturnRequest(
      adminUserId,
      returnRequestId,
      {
        pickupCarrier: 'Delhivery',
        pickupTrackingNumber: 'DEL-RET-7788',
        pickupScheduledAt: new Date(Date.now() + 86400000).toISOString(),
        adminRemarks: 'Approved for pickup and inspection',
      },
    );

    expect(approveRes.success).toBe(true);
    expect(approveRes.data.status).toBe(ReturnRequestStatus.PICKUP_SCHEDULED);
    expect(approveRes.data.pickupCarrier).toBe('Delhivery');

    // ================= STEP 7: ADMIN COMPLETES RETURN & RESTOCKS INVENTORY =================
    const completeRes = await returnRefundService.completeReturnRequest(
      adminUserId,
      returnRequestId,
      {
        restockInventory: true,
        adminRemarks: 'Inspection passed, product verified in warehouse',
      },
    );

    expect(completeRes.success).toBe(true);
    expect(completeRes.data.returnRequest.status).toBe(ReturnRequestStatus.COMPLETED);
    expect(db.orderItems.get(itemAId).status).toBe(OrderItemStatus.RETURNED);

    // Inventory for Product A is restocked from 10 -> 11
    expect(db.inventories.get(invA.id).availableQuantity).toBe(11);

    const pendingRefund = completeRes.data.refund;
    expect(pendingRefund.status).toBe(RefundStatus.PENDING);
    expect(Number(pendingRefund.refundAmount)).toBe(2000.0);

    // ================= STEP 8: ADMIN PROCESSES REFUND =================
    const processRefundRes = await returnRefundService.processRefund(
      adminUserId,
      pendingRefund.id,
      {
        providerRefundId: 'rfnd_razorpay_998811',
        payoutNotes: 'Processed via Razorpay gateway dashboard',
      },
    );

    expect(processRefundRes.success).toBe(true);
    expect(processRefundRes.data.status).toBe(RefundStatus.SUCCEEDED);
    expect(db.orderItems.get(itemAId).status).toBe(OrderItemStatus.REFUNDED);
    expect(db.orders.get(orderId).paymentStatus).toBe(PaymentStatus.PARTIALLY_REFUNDED);

    // Verify refund payment transaction was created
    const refundTx = Array.from(db.paymentTransactions.values()).find(
      (tx: any) => tx.providerTransactionId === 'rfnd_razorpay_998811',
    );
    expect(refundTx).toBeDefined();
    expect(Number((refundTx as any).amount)).toBe(2000.0);

    // ================= STEP 9: SELLER B SETTLEMENT WORKFLOW =================
    const periodFrom = '2026-09-01T00:00:00.000Z';
    const periodTo = '2026-09-30T23:59:59.000Z';

    // 9a. Preview Settlement for Seller B
    const previewRes = await settlementService.previewSettlement(adminUserId, {
      sellerId: sellerB.id,
      periodFrom,
      periodTo,
    });

    expect(previewRes.success).toBe(true);
    expect(previewRes.data.eligibleItemCount).toBe(1);
    expect(previewRes.data.summary.grossAmount).toBe(1500.0);
    expect(previewRes.data.summary.commissionAmount).toBe(150.0);
    expect(previewRes.data.summary.netSettlementAmount).toBe(1350.0);

    // 9b. Create Settlement for Seller B
    const createSetRes = await settlementService.createSettlement(adminUserId, {
      sellerId: sellerB.id,
      periodFrom,
      periodTo,
    });

    expect(createSetRes.success).toBe(true);
    const settlementId = createSetRes.data.id;
    expect(createSetRes.data.status).toBe(SettlementStatus.PENDING);
    expect(createSetRes.data.items).toHaveLength(1);
    expect(Number(createSetRes.data.netSettlementAmount)).toBe(1350.0);

    // 9c. Item B is now settled - a second settlement attempt should find 0 eligible items
    await expect(
      settlementService.createSettlement(adminUserId, {
        sellerId: sellerB.id,
        periodFrom,
        periodTo,
      }),
    ).rejects.toThrow('No eligible delivered order items found');

    // 9d. Admin processes manual payout to Seller B
    const payoutRes = await settlementService.processPayout(
      adminUserId,
      settlementId,
      {
        payoutMethod: SettlementPayoutMethod.BANK_TRANSFER,
        payoutReference: 'NEFT-ICICI-20260930-8899',
        payoutNotes: 'Transferred to ICICI Bank Account 9988776655',
      },
    );

    expect(payoutRes.success).toBe(true);
    expect(payoutRes.data.status).toBe(SettlementStatus.COMPLETED);
    expect(payoutRes.data.payoutReference).toBe('NEFT-ICICI-20260930-8899');

    // 9e. Seller B downloads their settlement report
    const reportRes = await settlementService.generateSettlementReport(
      sellerBUser.id,
      settlementId,
      'SELLER',
    );

    expect(reportRes.success).toBe(true);
    expect(reportRes.data.summary.netSettlementAmount).toBe(1350.0);
    expect(reportRes.data.items).toHaveLength(1);
    expect(reportRes.data.items[0].productName).toBe('20000mAh Power Bank');
  });
});
