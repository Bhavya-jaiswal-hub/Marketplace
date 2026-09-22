import {
  ProductStatus,
  StockChangeType,
} from '@prisma/client';
import { InventoryService } from '../src/inventory/inventory.service';
import { AuditService } from '../src/audit/audit.service';
import { StockAdjustmentMode } from '../src/inventory/dto';
import { BadRequestException } from '@nestjs/common';

describe('Inventory & Reservation Concurrency Lifecycle Integration', () => {
  let inventoryService: InventoryService;
  let auditService: AuditService;

  const db = {
    sellerProfiles: new Map<string, any>(),
    products: new Map<string, any>(),
    inventories: new Map<string, any>(),
    inventoryHistories: new Map<string, any>(),
    auditLogs: new Map<string, any>(),
  };

  beforeEach(() => {
    db.sellerProfiles.clear();
    db.products.clear();
    db.inventories.clear();
    db.inventoryHistories.clear();
    db.auditLogs.clear();

    const mockPrisma: any = {
      sellerProfile: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.userId) {
            for (const p of db.sellerProfiles.values()) {
              if (p.userId === where.userId) return p;
            }
          }
          if (where.id) return db.sellerProfiles.get(where.id) || null;
          return null;
        }),
      },
      product: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          const prod = db.products.get(where.id);
          if (!prod) return null;
          const res = { ...prod };
          if (include?.inventory) {
            for (const inv of db.inventories.values()) {
              if (inv.productId === prod.id) {
                res.inventory = inv;
                break;
              }
            }
          }
          return res;
        }),
      },
      inventory: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          let inv = null;
          if (where.productId) {
            for (const i of db.inventories.values()) {
              if (i.productId === where.productId) {
                inv = i;
                break;
              }
            }
          } else if (where.id) {
            inv = db.inventories.get(where.id) || null;
          }

          if (!inv) return null;
          const res = { ...inv };
          if (include?.product) {
            res.product = db.products.get(inv.productId);
          }
          return res;
        }),
        findMany: jest.fn(async () => Array.from(db.inventories.values())),
        update: jest.fn(async ({ where, data }: any) => {
          const inv = db.inventories.get(where.id);
          if (!inv) return null;
          Object.assign(inv, data, { updatedAt: new Date() });
          return inv;
        }),
      },
      inventoryHistory: {
        create: jest.fn(async ({ data }: any) => {
          const id = `hist-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, createdAt: new Date() };
          db.inventoryHistories.set(id, record);
          return record;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          let list = Array.from(db.inventoryHistories.values());
          if (where?.productId) {
            list = list.filter((h) => h.productId === where.productId);
          }
          return list;
        }),
      },
      auditLog: {
        create: jest.fn(async ({ data }: any) => {
          const id = `audit-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, createdAt: new Date() };
          db.auditLogs.set(id, record);
          return record;
        }),
      },
      $transaction: jest.fn(async (cb: any) => cb(mockPrisma)),
    };

    auditService = new AuditService(mockPrisma);
    inventoryService = new InventoryService(mockPrisma, auditService);
  });

  it('runs complete stock adjustment, reservation, rejection on insufficient stock, release, and confirmation', async () => {
    const sellerUserId = 'seller-user-1';
    const sellerId = 'seller-profile-1';
    db.sellerProfiles.set(sellerId, {
      id: sellerId,
      userId: sellerUserId,
    });

    const productId = 'prod-smartwatch-1';
    db.products.set(productId, {
      id: productId,
      sellerId,
      name: 'Ultra GPS Smartwatch',
      status: ProductStatus.ACTIVE,
    });

    const inventoryId = 'inv-smartwatch-1';
    db.inventories.set(inventoryId, {
      id: inventoryId,
      productId,
      availableQuantity: 10,
      reservedQuantity: 0,
      lowStockThreshold: 5,
    });

    // 1. Seller adjusts stock from 10 to 15
    const adjustRes = await inventoryService.adjustStock(sellerUserId, productId, {
      quantity: 15,
      mode: StockAdjustmentMode.SET,
      reason: 'Warehouse restock batch #45',
    });
    expect(adjustRes.success).toBe(true);
    expect(adjustRes.data.inventory.availableQuantity).toBe(15);

    // 2. Checkout validates stock for 5 units
    const validRes = await inventoryService.validateStock({
      items: [{ productId, quantity: 5 }],
    });
    expect(validRes.data.valid).toBe(true);

    // 3. Checkout reserves 5 units for Customer A
    const resA = await inventoryService.reserveStock({
      reservationId: 'order-checkout-cust-A',
      items: [{ productId, quantity: 5 }],
    });
    expect(resA.success).toBe(true);
    const invAfterA = db.inventories.get(inventoryId);
    expect(invAfterA.availableQuantity).toBe(10);
    expect(invAfterA.reservedQuantity).toBe(5);

    // 4. Customer B tries to reserve 12 units (only 10 available) -> should fail
    await expect(
      inventoryService.reserveStock({
        reservationId: 'order-checkout-cust-B',
        items: [{ productId, quantity: 12 }],
      }),
    ).rejects.toThrow(BadRequestException);

    // 5. Customer A cancels payment -> release reservation
    const relRes = await inventoryService.releaseReservation({
      reservationId: 'order-checkout-cust-A',
      items: [{ productId, quantity: 5 }],
    });
    expect(relRes.success).toBe(true);
    const invAfterRel = db.inventories.get(inventoryId);
    expect(invAfterRel.availableQuantity).toBe(15);
    expect(invAfterRel.reservedQuantity).toBe(0);

    // 6. Customer C reserves 4 units
    await inventoryService.reserveStock({
      reservationId: 'order-checkout-cust-C',
      items: [{ productId, quantity: 4 }],
    });
    const invAfterC = db.inventories.get(inventoryId);
    expect(invAfterC.availableQuantity).toBe(11);
    expect(invAfterC.reservedQuantity).toBe(4);

    // 7. Customer C payment succeeds -> confirm reservation
    const confRes = await inventoryService.confirmReservation({
      reservationId: 'order-checkout-cust-C',
      items: [{ productId, quantity: 4 }],
    });
    expect(confRes.success).toBe(true);
    const invAfterConf = db.inventories.get(inventoryId);
    expect(invAfterConf.availableQuantity).toBe(11);
    expect(invAfterConf.reservedQuantity).toBe(0);

    // 8. Verify complete InventoryHistory records
    const historyRes = await inventoryService.getInventoryHistory(sellerUserId, productId);
    expect(historyRes.data.history).toHaveLength(5);
    const changeTypes = historyRes.data.history.map((h: any) => h.changeType);
    expect(changeTypes).toContain(StockChangeType.STOCK_ADDED);
    expect(changeTypes).toContain(StockChangeType.RESERVATION_CREATED);
    expect(changeTypes).toContain(StockChangeType.RESERVATION_RELEASED);
    expect(changeTypes).toContain(StockChangeType.RESERVATION_CONFIRMED);
  });
});
