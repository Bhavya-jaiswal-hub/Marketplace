import { PrismaClient, ProductStatus, StockChangeType, SellerCategoryStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { InventoryService } from '../src/inventory/inventory.service';
import { AuditService } from '../src/audit/audit.service';

describe('Real PostgreSQL Integration & Constraints Suite (SRS v1.2)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    const dbUrl = process.env.DATABASE_URL || '';
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
    console.log(`🔌 Connecting to Real PostgreSQL for E2E constraints: ${maskedUrl}`);
    expect(dbUrl).toMatch(/localhost|127\.0\.0\.1/);

    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('1. Relational Integrity & Unique Constraints Enforcement', () => {
    it('should reject duplicate SKU on ProductVariant across different products', async () => {
      // Find existing seeded product
      const product = await prisma.product.findFirst({
        include: { variants: true },
      });
      expect(product).toBeDefined();
      expect(product?.variants.length).toBeGreaterThan(0);

      const existingSku = product!.variants[0].sku;

      // Attempt creating another variant with identical SKU
      await expect(
        prisma.productVariant.create({
          data: {
            productId: product!.id,
            sku: existingSku,
            size: 'UniqueSizeTest',
            color: 'UniqueColorTest',
            stockQuantity: 10,
          },
        }),
      ).rejects.toThrow();
    });

    it('should reject duplicate (size, color) on the same product via compound unique constraint', async () => {
      const product = await prisma.product.findFirst({
        include: { variants: true },
      });
      expect(product).toBeDefined();
      const variant = product!.variants[0];

      // Attempt creating another variant with exact same size and color on same product
      await expect(
        prisma.productVariant.create({
          data: {
            productId: product!.id,
            sku: `UNIQUE-SKU-${Date.now()}`,
            size: variant.size,
            color: variant.color,
            stockQuantity: 5,
          },
        }),
      ).rejects.toThrow();
    });

    it('should reject duplicate size set values within the same SizeSet', async () => {
      const sizeSet = await prisma.sizeSet.findFirst({
        where: { code: 'APPAREL_STD' },
        include: { values: true },
      });
      expect(sizeSet).toBeDefined();
      expect(sizeSet?.values.length).toBeGreaterThan(0);

      const existingValue = sizeSet!.values[0].value;

      await expect(
        prisma.sizeSetValue.create({
          data: {
            sizeSetId: sizeSet!.id,
            value: existingValue,
            displayName: 'Duplicate Attempt',
            sortOrder: 99,
          },
        }),
      ).rejects.toThrow();
    });

    it('should reject duplicate seller category permission requests via compound unique constraint', async () => {
      const existingSC = await prisma.sellerCategory.findFirst();
      expect(existingSC).toBeDefined();

      await expect(
        prisma.sellerCategory.create({
          data: {
            sellerId: existingSC!.sellerId,
            categoryId: existingSC!.categoryId,
            status: SellerCategoryStatus.REQUESTED,
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('2. Referential Integrity & Deletion Rules', () => {
    it('should enforce Restrict on Category deletion when active products exist', async () => {
      const product = await prisma.product.findFirst();
      expect(product).toBeDefined();

      // Deleting category with active products must fail with Foreign Key restriction
      await expect(
        prisma.category.delete({
          where: { id: product!.categoryId },
        }),
      ).rejects.toThrow();
    });
  });

  describe('3. Real Database Concurrency: Atomic Stock Reservation Race Test', () => {
    it('should prevent overselling under high concurrency on limited inventory', async () => {
      // 1. Setup isolated test product, variant, and inventory with exactly 5 units
      const seller = await prisma.sellerProfile.findFirst();
      const category = await prisma.category.findFirst();

      const testProduct = await prisma.product.create({
        data: {
          sellerId: seller!.id,
          categoryId: category!.id,
          name: `Concurrent Flash Item ${Date.now()}`,
          price: new Decimal(999.0),
          status: ProductStatus.ACTIVE,
        },
      });

      const testVariant = await prisma.productVariant.create({
        data: {
          productId: testProduct.id,
          sku: `FLASH-SKU-${Date.now()}`,
          size: 'M',
          color: 'Crimson',
          stockQuantity: 5,
          lowStockThreshold: 2,
        },
      });

      const testInventory = await prisma.inventory.create({
        data: {
          variantId: testVariant.id,
          availableQuantity: 5,
          reservedQuantity: 0,
          lowStockThreshold: 2,
        },
      });

      // 2. Launch 10 simultaneous reservation requests of 1 unit each (5 should succeed, 5 should fail)
      const auditService = new AuditService(prisma as any);
      const inventoryService = new InventoryService(prisma as any, auditService);

      const attempts = Array.from({ length: 10 }, (_, i) => i + 1);

      const reservationResults = await Promise.allSettled(
        attempts.map(async (attemptId) => {
          return inventoryService.reserveStock({
            reservationId: `res-concurrent-${attemptId}`,
            items: [{ variantId: testVariant.id, quantity: 1 }],
          });
        }),
      );

      const successes = reservationResults.filter((r) => r.status === 'fulfilled');
      const failures = reservationResults.filter((r) => r.status === 'rejected');

      expect(successes).toHaveLength(5);
      expect(failures).toHaveLength(5);

      // Verify final database state has exactly 0 available and 5 reserved
      const finalInventory = await prisma.inventory.findUnique({
        where: { id: testInventory.id },
      });
      expect(finalInventory?.availableQuantity).toBe(0);
      expect(finalInventory?.reservedQuantity).toBe(5);

      // Cleanup test product
      await prisma.product.delete({ where: { id: testProduct.id } });
    });
  });

  describe('4. Master Notification Lifecycle & Template Integration', () => {
    it('should read seeded notification templates correctly', async () => {
      const templates = await prisma.notificationTemplate.findMany();
      expect(templates.length).toBeGreaterThanOrEqual(4);
      expect(templates.some((t) => t.templateName === 'ORDER_CONFIRMED')).toBe(true);
    });
  });
});
