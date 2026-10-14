import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaService } from '../src/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { ProductStatus, StockChangeType } from '@prisma/client';
import { StockAdjustmentMode } from '../src/inventory/dto';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;
  let auditService: { logAction: jest.Mock };

  beforeEach(() => {
    prisma = {
      sellerProfile: {
        findUnique: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
      productVariant: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      inventory: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      inventoryHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $executeRaw: jest.fn(),
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    auditService = {
      logAction: jest.fn().mockResolvedValue({ id: 'audit-inv-1' }),
    };

    service = new InventoryService(
      prisma as unknown as PrismaService,
      auditService as unknown as AuditService,
    );
  });

  describe('Variant Stock Adjustment (FR-6, BR-5)', () => {
    const mockVariant = {
      id: 'var-1',
      productId: 'prod-1',
      sku: 'SHIRT-M-BLK',
      size: 'M',
      color: 'Black',
      stockQuantity: 10,
      lowStockThreshold: 5,
      product: {
        id: 'prod-1',
        sellerId: 'seller-1',
        status: ProductStatus.ACTIVE,
      },
      inventory: {
        id: 'inv-1',
        variantId: 'var-1',
        availableQuantity: 10,
        reservedQuantity: 0,
        lowStockThreshold: 5,
      },
    };

    it('sets variant stock and records inventory history with delta', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-1', userId: 'user-1' });
      prisma.productVariant.findUnique.mockResolvedValue(mockVariant);
      prisma.inventory.update.mockResolvedValue({
        id: 'inv-1',
        variantId: 'var-1',
        availableQuantity: 25,
        reservedQuantity: 0,
      });

      const res = await service.adjustVariantStock('user-1', 'var-1', {
        quantity: 25,
        mode: StockAdjustmentMode.SET,
        reason: 'Restocking new shipment from warehouse',
      });

      expect(res.success).toBe(true);
      expect(res.data.inventory.availableQuantity).toBe(25);
      expect(res.data.inventory.previousQuantity).toBe(10);
      expect(res.data.inventory.quantityChange).toBe(15);
      expect(prisma.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'var-1' },
          data: expect.objectContaining({ stockQuantity: 25 }),
        }),
      );
      expect(prisma.inventoryHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeType: StockChangeType.STOCK_ADDED,
            previousQuantity: 10,
            newQuantity: 25,
            quantityChange: 15,
            reason: 'Restocking new shipment from warehouse',
          }),
        }),
      );
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'INVENTORY_ADJUSTED' }),
      );
    });

    it('rejects reduction that would cause negative inventory', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-1', userId: 'user-1' });
      prisma.productVariant.findUnique.mockResolvedValue({
        ...mockVariant,
        inventory: {
          id: 'inv-1',
          availableQuantity: 5,
        },
      });

      await expect(
        service.adjustVariantStock('user-1', 'var-1', {
          quantity: 10,
          mode: StockAdjustmentMode.REMOVE,
          reason: 'Damaged stock deduction',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects adjustment if seller is not authorized', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-unauthorized', userId: 'user-2' });
      prisma.productVariant.findUnique.mockResolvedValue(mockVariant);

      await expect(
        service.adjustVariantStock('user-2', 'var-1', {
          quantity: 20,
          reason: 'Unauthorized attempt',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Reservation, Confirmation & Release Workflows', () => {
    it('validates stock availability across variant items', async () => {
      prisma.productVariant.findUnique
        .mockResolvedValueOnce({
          id: 'var-1',
          sku: 'SHIRT-M-BLK',
          isActive: true,
          product: { id: 'prod-1', name: 'Cotton Shirt', status: ProductStatus.ACTIVE, deletedAt: null },
          inventory: { availableQuantity: 10 },
        })
        .mockResolvedValueOnce({
          id: 'var-2',
          sku: 'SHIRT-L-BLK',
          isActive: true,
          product: { id: 'prod-1', name: 'Cotton Shirt', status: ProductStatus.ACTIVE, deletedAt: null },
          inventory: { availableQuantity: 1 },
        });

      const res = await service.validateStock({
        items: [
          { variantId: 'var-1', quantity: 2 },
          { variantId: 'var-2', quantity: 5 }, // Insufficient
        ],
      });

      expect(res.data.valid).toBe(false);
      expect(res.data.items[0].sufficient).toBe(true);
      expect(res.data.items[1].sufficient).toBe(false);
    });

    it('atomically reserves stock by transferring from available to reserved quantity', async () => {
      prisma.productVariant.findUnique
        .mockResolvedValue({
          id: 'var-1',
          sku: 'SHIRT-M-BLK',
          size: 'M',
          color: 'Black',
          isActive: true,
          product: { status: ProductStatus.ACTIVE, deletedAt: null },
          inventory: { availableQuantity: 20 },
        });
      prisma.$executeRaw.mockResolvedValue(1); // 1 row updated atomically
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        variantId: 'var-1',
        availableQuantity: 18,
        reservedQuantity: 2,
      });

      const res = await service.reserveStock({
        reservationId: 'res-chk-100',
        items: [{ variantId: 'var-1', quantity: 2 }],
      });

      expect(res.success).toBe(true);
      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(prisma.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'var-1' },
          data: { stockQuantity: 18 },
        }),
      );
      expect(prisma.inventoryHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeType: StockChangeType.RESERVATION_CREATED,
            quantityChange: -2,
            reason: 'Reserved for checkout reference res-chk-100',
          }),
        }),
      );
    });

    it('rejects reservation with 400 when atomic update affects 0 rows (concurrency conflict)', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        sku: 'SHIRT-M-BLK',
        size: 'M',
        color: 'Black',
        isActive: true,
        product: { status: ProductStatus.ACTIVE, deletedAt: null },
        inventory: { availableQuantity: 1 },
      });
      prisma.$executeRaw.mockResolvedValue(0); // 0 rows affected due to concurrent reservation

      await expect(
        service.reserveStock({
          reservationId: 'res-chk-101',
          items: [{ variantId: 'var-1', quantity: 2 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('confirms reservation and deducts reserved quantity on successful payment', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        variantId: 'var-1',
        availableQuantity: 18,
        reservedQuantity: 2,
      });

      const res = await service.confirmReservation({
        reservationId: 'res-chk-100',
        items: [{ variantId: 'var-1', quantity: 2 }],
      });

      expect(res.success).toBe(true);
      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { reservedQuantity: 0 },
        }),
      );
      expect(prisma.inventoryHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeType: StockChangeType.RESERVATION_CONFIRMED,
          }),
        }),
      );
    });

    it('releases reservation and restores available stock on checkout expiry or abandonment', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        variantId: 'var-1',
        availableQuantity: 18,
        reservedQuantity: 2,
      });

      const res = await service.releaseReservation({
        reservationId: 'res-chk-100',
        items: [{ variantId: 'var-1', quantity: 2 }],
      });

      expect(res.success).toBe(true);
      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { availableQuantity: 20, reservedQuantity: 0 },
        }),
      );
      expect(prisma.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'var-1' },
          data: { stockQuantity: 20 },
        }),
      );
      expect(prisma.inventoryHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeType: StockChangeType.RESERVATION_RELEASED,
            quantityChange: 2,
          }),
        }),
      );
    });

    it('restocks accepted return into variant inventory', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        variantId: 'var-1',
        availableQuantity: 20,
      });
      prisma.inventory.update.mockResolvedValue({
        id: 'inv-1',
        variantId: 'var-1',
        availableQuantity: 21,
      });

      const res = await service.restockReturnedProduct('var-1', 1, 'ret-req-1', 'admin-1');
      expect(res.success).toBe(true);
      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { availableQuantity: 21 },
        }),
      );
      expect(prisma.inventoryHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeType: StockChangeType.RETURN_RESTOCK,
            quantityChange: 1,
            newQuantity: 21,
          }),
        }),
      );
    });
  });
});
