import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { CustomerService } from '../src/customer/customer.service';
import { ReturnRefundService } from '../src/return-refund/return-refund.service';
import { SettlementService } from '../src/settlement/settlement.service';
import {
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
  ReturnRequestStatus,
  RefundStatus,
  SettlementBatchStatus,
  SettlementItemStatus,
  SettlementPayoutMethod,
  AdjustmentType,
  LedgerDirection,
  AdjustmentStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('Return, Refund, Seller Adjustment, and Settlement End-to-End Integration Flow', () => {
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
    productVariants: new Map(),
    inventories: new Map(),
    inventoryHistories: new Map(),
    orders: new Map(),
    orderItems: new Map(),
    orderItemHistories: new Map(),
    paymentTransactions: new Map(),
    returnRequests: new Map(),
    refunds: new Map(),
    sellerAdjustments: new Map(),
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
        findMany: jest.fn(async ({ where }: any) => {
          let list = Array.from(db.sellerProfiles.values());
          if (where?.user?.role?.name?.not === 'SUPER_ADMIN') {
            list = list.filter((s: any) => {
              const u = db.users.get(s.userId);
              return u?.role?.name !== 'SUPER_ADMIN';
            });
          }
          return list;
        }),
      },
      product: {
        findUnique: jest.fn(async ({ where }: any) => db.products.get(where.id) || null),
      },
      productVariant: {
        findUnique: jest.fn(async ({ where }: any) => db.productVariants.get(where.id) || null),
        update: jest.fn(async ({ where, data }: any) => {
          const v = db.productVariants.get(where.id);
          const updated = { ...v, ...data, updatedAt: new Date() };
          db.productVariants.set(where.id, updated);
          return updated;
        }),
      },
      inventory: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.variantId) {
            for (const item of db.inventories.values()) {
              if (item.variantId === where.variantId) return item;
            }
          }
          if (where.id) return db.inventories.get(where.id) || null;
          return null;
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
          if (include?.settlementItem) {
            res.settlementItem = db.settlementItems.get(item.id) || null;
          }
          return res;
        }),
        findMany: jest.fn(async ({ where, include }: any) => {
          let list = Array.from(db.orderItems.values());
          if (where?.sellerId) list = list.filter((i: any) => i.sellerId === where.sellerId);
          if (where?.status) list = list.filter((i: any) => i.status === where.status);
          if (where?.createdAt?.gte) {
            list = list.filter((i: any) => new Date(i.createdAt) >= where.createdAt.gte);
          }
          if (where?.createdAt?.lte) {
            list = list.filter((i: any) => new Date(i.createdAt) <= where.createdAt.lte);
          }
          return list.map((item: any) => {
            const res = { ...item };
            if (include?.order) res.order = db.orders.get(item.orderId);
            if (include?.seller) {
              const s = db.sellerProfiles.get(item.sellerId);
              if (s && include.seller.include?.user) {
                s.user = db.users.get(s.userId);
              }
              res.seller = s;
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
            if (include?.settlementItem) {
              const si = db.settlementItems.get(item.id);
              if (si) {
                const siCopy = { ...si };
                if (include.settlementItem.include?.settlement) {
                  siCopy.settlement = db.settlements.get(si.settlementId);
                }
                res.settlementItem = siCopy;
              } else {
                res.settlementItem = null;
              }
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
          if (include?.customer) res.customer = db.customerProfiles.get(ret.customerId);
          if (include?.seller) res.seller = db.sellerProfiles.get(ret.sellerId);
          if (include?.refund) {
            res.refund = Array.from(db.refunds.values()).find(
              (rf: any) => rf.returnRequestId === ret.id,
            );
          }
          if (include?.adjustments) {
            res.adjustments = Array.from(db.sellerAdjustments.values()).filter(
              (a: any) => a.returnRequestId === ret.id,
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
          let rf: any = null;
          if (where.id) rf = db.refunds.get(where.id);
          if (where.returnRequestId) {
            rf = Array.from(db.refunds.values()).find(
              (r: any) => r.returnRequestId === where.returnRequestId,
            );
          }
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
      sellerAdjustment: {
        create: jest.fn(async ({ data }: any) => {
          const id = `adj-${Date.now()}-${Math.random()}`;
          const rec = {
            id,
            isWrittenOff: false,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          db.sellerAdjustments.set(id, rec);
          return rec;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          let list = Array.from(db.sellerAdjustments.values());
          if (where?.sellerId) list = list.filter((a: any) => a.sellerId === where.sellerId);
          if (where?.status) list = list.filter((a: any) => a.status === where.status);
          if (where?.isWrittenOff !== undefined) {
            list = list.filter((a: any) => a.isWrittenOff === where.isWrittenOff);
          }
          return list;
        }),
        findUnique: jest.fn(async ({ where }: any) => db.sellerAdjustments.get(where.id) || null),
        update: jest.fn(async ({ where, data }: any) => {
          const adj = db.sellerAdjustments.get(where.id);
          const updated = { ...adj, ...data, updatedAt: new Date() };
          db.sellerAdjustments.set(where.id, updated);
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
          if (include?.appliedAdjustments) {
            res.appliedAdjustments = Array.from(db.sellerAdjustments.values()).filter(
              (a: any) => a.appliedInSettlementId === s.id,
            );
          }
          if (include?.originatingAdjustments) {
            res.originatingAdjustments = Array.from(db.sellerAdjustments.values()).filter(
              (a: any) => a.originatingSettlementId === s.id,
            );
          }
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
      settlementItem: {
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const [k, v] of db.settlementItems.entries()) {
            if (where.settlementId && v.settlementId === where.settlementId) {
              db.settlementItems.set(k, { ...v, ...data, updatedAt: new Date() });
              count++;
            }
          }
          return { count };
        }),
        deleteMany: jest.fn(async ({ where }: any) => {
          let count = 0;
          for (const [k, v] of db.settlementItems.entries()) {
            if (where.settlementId && v.settlementId === where.settlementId) {
              db.settlementItems.delete(k);
              count++;
            }
          }
          return { count };
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

  it('should execute full end-to-end 8-stage return workflow, refund processing, seller fault debit ledger, and settlement engine', async () => {
    // 1. Setup Customer User & Profile
    const customerUser = {
      id: 'cust-usr-1',
      fullName: 'Vikram Mehta',
      email: 'vikram@example.com',
      role: { name: 'CUSTOMER' },
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
    const sellerAUser = { id: 'usr-seller-a', email: 'sellerA@example.com', role: { name: 'SELLER' } };
    const sellerBUser = { id: 'usr-seller-b', email: 'sellerB@example.com', role: { name: 'SELLER' } };
    db.users.set(sellerAUser.id, sellerAUser);
    db.users.set(sellerBUser.id, sellerBUser);

    const sellerA = {
      id: 'seller-profile-a',
      userId: sellerAUser.id,
      displayName: 'SoundBeat Audio',
      businessName: 'SoundBeat Audio Pvt Ltd',
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
      businessName: 'VoltTech Powers LLP',
      payoutDetails: {
        accountNumber: '9988776655',
        ifscCode: 'ICIC0005678',
        bankName: 'ICICI Bank',
      },
    };
    db.sellerProfiles.set(sellerA.id, sellerA);
    db.sellerProfiles.set(sellerB.id, sellerB);

    // 3. Setup Products, Variants, & Inventories
    const prodA = {
      id: 'prod-earphones',
      name: 'Wireless Earbuds Pro',
      sellerId: sellerA.id,
    };
    const prodB = {
      id: 'prod-powerbank',
      name: '20000mAh Power Bank',
      sellerId: sellerB.id,
    };
    db.products.set(prodA.id, prodA);
    db.products.set(prodB.id, prodB);

    const variantA = {
      id: 'var-earphones-black',
      productId: prodA.id,
      sku: 'EAR-PRO-BLK',
      price: new Decimal(2000.0),
      stockQuantity: 10,
    };
    const variantB = {
      id: 'var-powerbank-silver',
      productId: prodB.id,
      sku: 'PWR-20K-SLV',
      price: new Decimal(1500.0),
      stockQuantity: 15,
    };
    db.productVariants.set(variantA.id, variantA);
    db.productVariants.set(variantB.id, variantB);

    const invA = {
      id: 'inv-a',
      variantId: variantA.id,
      availableQuantity: 10,
      reservedQuantity: 0,
      lowStockThreshold: 2,
    };
    const invB = {
      id: 'inv-b',
      variantId: variantB.id,
      availableQuantity: 15,
      reservedQuantity: 0,
      lowStockThreshold: 3,
    };
    db.inventories.set(invA.id, invA);
    db.inventories.set(invB.id, invB);

    // 4. Setup Multi-Seller Order with 2 items
    const orderId = 'order-multi-1';
    const order = {
      id: orderId,
      customerId: custProfile.id,
      orderNumber: 'ORD-2026-9001',
      orderStatus: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      currency: 'INR',
      shippingAmount: new Decimal(100.0),
      subtotal: new Decimal(3500.0),
      totalAmount: new Decimal(3600.0),
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
    };
    db.orders.set(orderId, order);

    const paymentTxId = 'tx-paid-1';
    db.paymentTransactions.set(paymentTxId, {
      id: paymentTxId,
      orderId,
      customerId: custProfile.id,
      amount: new Decimal(3600.0),
      status: PaymentTransactionStatus.SUCCEEDED,
      transactionType: PaymentTransactionType.PAYMENT,
    });

    // Item A (Seller A) delivered 2 days ago (eligible for 5-day return window)
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const itemAId = 'item-a-1';
    const itemA = {
      id: itemAId,
      orderId,
      sellerId: sellerA.id,
      variantId: variantA.id,
      productName: prodA.name,
      sku: variantA.sku,
      unitPrice: new Decimal(2000.0),
      quantity: 1,
      totalAmount: new Decimal(2000.0),
      commissionRate: new Decimal(10.0),
      commissionAmount: new Decimal(200.0),
      shippingFeeShare: new Decimal(50.0),
      sellerEarnings: new Decimal(1850.0),
      status: OrderItemStatus.DELIVERED,
      deliveredAt: twoDaysAgo,
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
    };
    db.orderItems.set(itemAId, itemA);

    // Item B (Seller B) delivered 10 days ago (eligible for 7-day holding settlement period)
    const tenDaysAgo = new Date('2026-09-10T10:00:00.000Z');
    const itemBId = 'item-b-1';
    const itemB = {
      id: itemBId,
      orderId,
      sellerId: sellerB.id,
      variantId: variantB.id,
      productName: prodB.name,
      sku: variantB.sku,
      unitPrice: new Decimal(1500.0),
      quantity: 1,
      totalAmount: new Decimal(1500.0),
      commissionRate: new Decimal(10.0),
      commissionAmount: new Decimal(150.0),
      shippingFeeShare: new Decimal(0.0),
      sellerEarnings: new Decimal(1350.0),
      status: OrderItemStatus.DELIVERED,
      deliveredAt: tenDaysAgo,
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
    };
    db.orderItems.set(itemBId, itemB);

    // ================= STAGE 1: CUSTOMER INITIATES RETURN FOR ITEM A =================
    const returnReqRes = await returnRefundService.createReturnRequest(
      customerUser.id,
      orderId,
      itemAId,
      {
        returnQuantity: 1,
        reason: 'Defective audio distortion in left earpiece',
        faultClassification: 'SELLER_FAULT',
        customerComments: 'Tested on two devices, issue persists',
      },
    );

    expect(returnReqRes.success).toBe(true);
    const returnRequestId = returnReqRes.data.id;
    expect(returnReqRes.data.status).toBe(ReturnRequestStatus.REQUESTED);

    // ================= STAGE 2: SUPER ADMIN APPROVES RETURN REQUEST =================
    const adminUserId = 'super-admin-1';
    const approveRes = await returnRefundService.approveReturnRequest(
      adminUserId,
      returnRequestId,
      {
        pickupCarrier: 'Delhivery',
        pickupTrackingNumber: 'DEL-RET-7788',
        pickupScheduledAt: new Date(Date.now() + 86400000).toISOString(),
        adminRemarks: 'Approved for return pickup and inspection',
      },
    );

    expect(approveRes.success).toBe(true);
    expect(approveRes.data.status).toBe(ReturnRequestStatus.APPROVED);

    // ================= STAGE 3: CUSTOMER SHIPS RETURN ITEM =================
    const shipRes = await returnRefundService.customerShipReturn(
      customerUser.id,
      returnRequestId,
      {
        courierName: 'Delhivery',
        trackingNumber: 'DEL-RET-7788',
      },
    );

    expect(shipRes.success).toBe(true);
    expect(shipRes.data.status).toBe(ReturnRequestStatus.IN_TRANSIT);

    // ================= STAGE 4: SELLER CONFIRMS RECEIPT =================
    const receiptRes = await returnRefundService.sellerConfirmReceipt(
      sellerAUser.id,
      returnRequestId,
    );

    expect(receiptRes.success).toBe(true);
    expect(receiptRes.data.status).toBe(ReturnRequestStatus.RECEIVED);

    // ================= STAGE 5: SELLER VERIFIES RETURN & RESTOCKS VARIANT =================
    const verifyRes = await returnRefundService.sellerVerifyReturn(
      sellerAUser.id,
      returnRequestId,
      'Inspection verified at warehouse; accepted for restock',
    );

    expect(verifyRes.success).toBe(true);
    expect(verifyRes.data.status).toBe(ReturnRequestStatus.VERIFIED);

    // Variant inventory for Product A is automatically restocked: 10 -> 11
    expect(db.inventories.get(invA.id).availableQuantity).toBe(11);
    expect(db.productVariants.get(variantA.id).stockQuantity).toBe(11);

    // ================= STAGE 7 & 8: SUPER ADMIN PROCESSES SELLER-FAULT REFUND =================
    const refundRes = await returnRefundService.processReturnRefund(
      adminUserId,
      returnRequestId,
      {
        faultClassification: 'SELLER_FAULT',
        returnShippingFee: 79.0,
        providerRefundId: 'rfnd_razorpay_998811',
        payoutNotes: 'Refunded via Razorpay gateway dashboard',
      },
    );

    expect(refundRes.success).toBe(true);
    expect(refundRes.data.returnRequest.status).toBe(ReturnRequestStatus.REFUNDED);
    expect(db.orders.get(orderId).paymentStatus).toBe(PaymentStatus.PARTIALLY_REFUNDED);

    // Verify refund payment transaction was created
    const refundTx = Array.from(db.paymentTransactions.values()).find(
      (tx: any) => tx.providerTransactionId === 'rfnd_razorpay_998811',
    );
    expect(refundTx).toBeDefined();

    // Verify SELLER_FAULT_RETURN_SHIPPING_DEBIT was created in SellerAdjustment ledger
    const sellerAdjustments: any[] = Array.from(db.sellerAdjustments.values()).filter(
      (a: any) => a.sellerId === sellerA.id,
    );
    expect(sellerAdjustments).toHaveLength(1);
    expect(sellerAdjustments[0].type).toBe(AdjustmentType.SELLER_FAULT_RETURN_SHIPPING_DEBIT);
    expect(Number(sellerAdjustments[0].amount)).toBe(79.0);
    expect(sellerAdjustments[0].direction).toBe(LedgerDirection.DEBIT);
    expect(sellerAdjustments[0].status).toBe(AdjustmentStatus.PENDING);

    // ================= STEP 9: SELLER B SETTLEMENT WORKFLOW =================
    const periodFrom = '2026-09-01T00:00:00.000Z';
    const periodTo = '2026-09-30T23:59:59.000Z';

    // 9a. Preview Settlement for Seller B (1 eligible item past 7-day holding period)
    const previewResB = await settlementService.previewSettlement(adminUserId, {
      sellerId: sellerB.id,
      periodFrom,
      periodTo,
    });

    expect(previewResB.success).toBe(true);
    expect(previewResB.data.eligibleItemCount).toBe(1);
    expect(previewResB.data.summary.grossAmount).toBe(1500.0);
    expect(previewResB.data.summary.commissionAmount).toBe(150.0);
    expect(previewResB.data.summary.netSettlementAmount).toBe(1350.0);

    // 9b. Create Settlement Batch for Seller B
    const createSetResB = await settlementService.createSettlement(adminUserId, {
      sellerId: sellerB.id,
      periodFrom,
      periodTo,
    });

    expect(createSetResB.success).toBe(true);
    const settlementIdB = createSetResB.data.id;
    expect(createSetResB.data.status).toBe(SettlementBatchStatus.GENERATED);
    expect(createSetResB.data.items).toHaveLength(1);
    expect(Number(createSetResB.data.netSettlementAmount)).toBe(1350.0);

    // 9c. Re-run settlement attempt should fail with zero eligible items
    await expect(
      settlementService.createSettlement(adminUserId, {
        sellerId: sellerB.id,
        periodFrom,
        periodTo,
      }),
    ).rejects.toThrow('No eligible delivered order items found');

    // 9d. Confirm Payout with external bank transaction reference
    const payoutResB = await settlementService.confirmPayout(
      adminUserId,
      settlementIdB,
      {
        bankTransactionReference: 'NEFT-ICICI-20260930-8899',
        payoutMethod: SettlementPayoutMethod.BANK_TRANSFER,
        payoutNotes: 'Transferred to ICICI Bank Account 9988776655',
      },
    );

    expect(payoutResB.success).toBe(true);
    expect(payoutResB.data.status).toBe(SettlementBatchStatus.SETTLED);
    expect(payoutResB.data.payoutReference).toBe('NEFT-ICICI-20260930-8899');

    // 9e. Seller B downloads their settlement report
    const reportResB = await settlementService.generateSettlementReport(
      sellerBUser.id,
      settlementIdB,
      'SELLER',
    );

    expect(reportResB.success).toBe(true);
    expect(reportResB.data.summary.netSettlementAmount).toBe(1350.0);
    expect(reportResB.data.items).toHaveLength(1);
    expect(reportResB.data.items[0].productName).toBe('20000mAh Power Bank');

    // ================= STEP 10: SELLER A ADJUSTMENT LEDGER & ADMIN WRITE-OFF =================
    // 10a. Verify Seller A's live debit balance reflects the ₹79 return shipping charge
    const sellerALedger = await settlementService.getSellerAdjustments(sellerA.id);
    expect(sellerALedger.success).toBe(true);
    expect(sellerALedger.data.currentDebitBalance).toBe(79.0);
    expect(sellerALedger.data.adjustments).toHaveLength(1);

    const adjustmentId = sellerALedger.data.adjustments[0].id;

    // 10b. Admin writes off the debit with mandatory justification
    const writeOffRes = await settlementService.writeOffAdjustment(
      adminUserId,
      adjustmentId,
      { reason: 'Customer logistics damage was courier responsibility; fee waived for seller' },
    );

    expect(writeOffRes.success).toBe(true);
    expect(writeOffRes.data.status).toBe(AdjustmentStatus.WRITTEN_OFF);
    expect(writeOffRes.data.isWrittenOff).toBe(true);

    // 10c. Verify Seller A's live debit balance is cleared to ₹0.00
    const clearedLedger = await settlementService.getSellerAdjustments(sellerA.id);
    expect(clearedLedger.data.currentDebitBalance).toBe(0.0);
  });
});
