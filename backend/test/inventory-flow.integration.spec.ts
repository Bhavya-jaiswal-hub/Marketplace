import {
  ProductStatus,
  StockChangeType,
} from '@prisma/client';
import { InventoryService } from '../src/inventory/inventory.service';
import { AuditService } from '../src/audit/audit.service';
import { StockAdjustmentMode } from '../src/inventory/dto';
import { BadRequestException } from '@nestjs/common';

describe('Inventory & Atomic Reservation Concurrency Lifecycle Integration (FR-6, BR-5)', () => {
  let inventoryService: InventoryService;
  let auditService: AuditService;

  const db = {
    sellerProfiles: new Map<string, any>(),
    categories: new Map<string, any>(),
    products: new Map<string, any>(),
    productVariants: new Map<string, any>(),
    inventories: new Map<string, any>(),
    inventoryHistories: new Map<string, any>(),
    auditLogs: new Map<string, any>(),
  };

  beforeEach(() => {
    db.sellerProfiles.clear();
    db.categories.clear();
    db.products.clear();
    db.productVariants.clear();
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
          if (include?.variants) {
            const vars = Array.from(db.productVariants.values()).filter(
              (v) => v.productId === prod.id,
            );
            res.variants = vars.map((v) => {
              const resV = { ...v };
              if (include.variants.include?.inventory) {
                for (const inv of db.inventories.values()) {
                  if (inv.variantId === v.id) {
                    resV.inventory = inv;
                    break;
                  }
                }
              }
              return resV;
            });
          }
          return res;
        }),
      },
      productVariant: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          const v = db.productVariants.get(where.id);
          if (!v) return null;
          const res = { ...v };
          if (include?.product) {
            res.product = db.products.get(v.productId);
          }
          if (include?.inventory) {
            for (const inv of db.inventories.values()) {
              if (inv.variantId === v.id) {
                res.inventory = inv;
                break;
              }
            }
          }
          return res;
        }),
        findMany: jest.fn(async ({ where, include }: any) => {
          let list = Array.from(db.productVariants.values());
          if (where?.product?.sellerId) {
            list = list.filter((v) => {
              const p = db.products.get(v.productId);
              return p && p.sellerId === where.product.sellerId;
            });
          }
          if (where?.productId) {
            list = list.filter((v) => v.productId === where.productId);
          }
          return list.map((v) => {
            const res = { ...v };
            if (include?.product) {
              const p = db.products.get(v.productId);
              res.product = {
                ...p,
                category: db.categories.get(p.categoryId) || { id: 'cat-1', name: 'Clothing' },
              };
            }
            if (include?.inventory) {
              for (const inv of db.inventories.values()) {
                if (inv.variantId === v.id) {
                  res.inventory = inv;
                  break;
                }
              }
            }
            return res;
          });
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const v = db.productVariants.get(where.id);
          if (!v) return null;
          Object.assign(v, data, { updatedAt: new Date() });
          return v;
        }),
      },
      inventory: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          let inv = null;
          if (where.variantId) {
            for (const i of db.inventories.values()) {
              if (i.variantId === where.variantId) {
                inv = i;
                break;
              }
            }
          } else if (where.id) {
            inv = db.inventories.get(where.id) || null;
          }

          if (!inv) return null;
          const res = { ...inv };
          if (include?.variant) {
            res.variant = db.productVariants.get(inv.variantId);
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
          if (where?.variantId) {
            list = list.filter((h) => h.variantId === where.variantId);
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
      $executeRaw: jest.fn(async (strings: TemplateStringsArray, ...values: any[]) => {
        // Atomic SQL update simulation:
        // UPDATE "Inventory" SET availableQuantity = availableQuantity - qty, reservedQuantity = reservedQuantity + qty WHERE variantId = :varId AND availableQuantity >= qty
        const qty = values[0];
        const variantId = values[2];
        let targetInv: any = null;
        for (const inv of db.inventories.values()) {
          if (inv.variantId === variantId) {
            targetInv = inv;
            break;
          }
        }
        if (targetInv && targetInv.availableQuantity >= qty) {
          targetInv.availableQuantity -= qty;
          targetInv.reservedQuantity += qty;
          targetInv.updatedAt = new Date();
          return 1; // 1 row updated atomically
        }
        return 0; // 0 rows updated
      }),
      $transaction: jest.fn(async (cb: any) => cb(mockPrisma)),
    };

    auditService = new AuditService(mockPrisma);
    inventoryService = new InventoryService(mockPrisma, auditService);
  });

  it('runs complete variant stock adjustment, atomic concurrency reservation test, and release flow', async () => {
    // 1. Setup Seller, Product, and Variants
    const sellerUserId = 'seller-user-1';
    const sellerId = 'seller-profile-1';
    db.sellerProfiles.set(sellerId, {
      id: sellerId,
      userId: sellerUserId,
    });

    const categoryId = 'cat-clothing-1';
    db.categories.set(categoryId, { id: categoryId, name: 'Mens Clothing' });

    const productId = 'prod-oxford-1';
    db.products.set(productId, {
      id: productId,
      sellerId,
      categoryId,
      name: 'Oxford Button-Down Shirt',
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    });

    const variantIdM = 'var-oxf-m';
    db.productVariants.set(variantIdM, {
      id: variantIdM,
      productId,
      sku: 'OXF-M-BLK',
      size: 'M',
      color: 'Black',
      stockQuantity: 5,
      lowStockThreshold: 3,
      isActive: true,
    });

    const invIdM = 'inv-oxf-m';
    db.inventories.set(invIdM, {
      id: invIdM,
      variantId: variantIdM,
      availableQuantity: 5,
      reservedQuantity: 0,
      lowStockThreshold: 3,
    });

    // 2. Seller adjusts stock on variant from 5 to 7
    const adjustRes = await inventoryService.adjustVariantStock(sellerUserId, variantIdM, {
      quantity: 7,
      mode: StockAdjustmentMode.SET,
      reason: 'Physical inventory recount',
    });
    expect(adjustRes.success).toBe(true);
    expect(adjustRes.data.inventory.availableQuantity).toBe(7);

    // Set stock to exactly 5 for concurrency test
    await inventoryService.adjustVariantStock(sellerUserId, variantIdM, {
      quantity: 5,
      mode: StockAdjustmentMode.SET,
      reason: 'Reset to 5 for race condition test',
    });

    // 3. Concurrency Simulation Test:
    // Two shoppers attempt to checkout 4 units simultaneously when available stock is 5.
    // Exactly ONE must succeed (leaving 1 available and 4 reserved).
    // The other must be rejected with BadRequestException.
    const checkoutA = inventoryService.reserveStock({
      reservationId: 'order-res-A',
      items: [{ variantId: variantIdM, quantity: 4 }],
    });

    const checkoutB = inventoryService.reserveStock({
      reservationId: 'order-res-B',
      items: [{ variantId: variantIdM, quantity: 4 }],
    });

    const results = await Promise.allSettled([checkoutA, checkoutB]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(BadRequestException);

    // Verify inventory state after race: 5 - 4 = 1 available, 4 reserved
    const invAfterRace = db.inventories.get(invIdM);
    expect(invAfterRace.availableQuantity).toBe(1);
    expect(invAfterRace.reservedQuantity).toBe(4);

    // 4. Winning checkout confirms payment: reserved stock is deducted
    await inventoryService.confirmReservation({
      reservationId: 'order-res-winning',
      items: [{ variantId: variantIdM, quantity: 4 }],
    });

    expect(invAfterRace.reservedQuantity).toBe(0);
    expect(invAfterRace.availableQuantity).toBe(1);

    // 5. Test out-of-stock dynamics
    // Adjust remaining 1 unit to 0
    await inventoryService.adjustVariantStock(sellerUserId, variantIdM, {
      quantity: 0,
      mode: StockAdjustmentMode.SET,
      reason: 'Final unit purchased in store',
    });

    const sellerInv = await inventoryService.getSellerInventory(sellerUserId);
    const varItem = sellerInv.data.items.find((i: any) => i.variantId === variantIdM);
    expect(varItem.isOutOfStock).toBe(true);
    expect(varItem.availableQuantity).toBe(0);

    // Check product inventory status
    const prodInv = await inventoryService.getProductInventory(sellerUserId, productId);
    expect(prodInv.data.isOutOfStock).toBe(true);

    // 6. Restock returned product
    await inventoryService.restockReturnedProduct(variantIdM, 1, 'return-req-404', 'admin-user');
    expect(db.inventories.get(invIdM).availableQuantity).toBe(1);

    // Verify audit logs
    const auditActions = Array.from(db.auditLogs.values()).map((a) => a.action);
    expect(auditActions).toContain('INVENTORY_ADJUSTED');
    expect(auditActions).toContain('INVENTORY_RETURN_RESTOCK');
  });
});
