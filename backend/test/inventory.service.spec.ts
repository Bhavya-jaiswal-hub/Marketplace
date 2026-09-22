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
      inventory: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      inventoryHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
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

  describe('Stock Adjustment', () => {
    it('sets product stock and records inventory history with delta', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-1', userId: 'user-1' });
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sellerId: 'seller-1',
        status: ProductStatus.ACTIVE,
        inventory: {
          id: 'inv-1',
          availableQuantity: 10,
          reservedQuantity: 0,
        },
      });
      prisma.inventory.update.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        availableQuantity: 25,
        reservedQuantity: 0,
      });

      const res = await service.adjustStock('user-1', 'prod-1', {
        quantity: 25,
        mode: StockAdjustmentMode.SET,
        reason: 'Restocking new shipment from warehouse',
      });

      expect(res.success).toBe(true);
      expect(res.data.inventory.availableQuantity).toBe(25);
      expect(res.data.inventory.previousQuantity).toBe(10);
      expect(res.data.inventory.quantityChange).toBe(15);
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
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sellerId: 'seller-1',
        status: ProductStatus.ACTIVE,
        inventory: {
          id: 'inv-1',
          availableQuantity: 5,
        },
      });

      await expect(
        service.adjustStock('user-1', 'prod-1', {
          quantity: 10,
          mode: StockAdjustmentMode.REMOVE,
          reason: 'Damaged stock deduction',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Reservation, Confirmation & Release Workflows', () => {
    it('validates stock availability across items', async () => {
      prisma.product.findUnique
        .mockResolvedValueOnce({
          id: 'prod-1',
          name: 'Item 1',
          status: ProductStatus.ACTIVE,
          inventory: { availableQuantity: 10 },
        })
        .mockResolvedValueOnce({
          id: 'prod-2',
          name: 'Item 2',
          status: ProductStatus.ACTIVE,
          inventory: { availableQuantity: 1 },
        });

      const res = await service.validateStock({
        items: [
          { productId: 'prod-1', quantity: 2 },
          { productId: 'prod-2', quantity: 5 }, // Insufficient
        ],
      });

      expect(res.data.valid).toBe(false);
      expect(res.data.items[0].sufficient).toBe(true);
      expect(res.data.items[1].sufficient).toBe(false);
    });

    it('atomically reserves stock by transferring from available to reserved quantity', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        availableQuantity: 20,
        reservedQuantity: 0,
        product: { name: 'Item 1', status: ProductStatus.ACTIVE },
      });
      prisma.inventory.update.mockResolvedValue({
        id: 'inv-1',
        availableQuantity: 18,
        reservedQuantity: 2,
      });

      const res = await service.reserveStock({
        reservationId: 'res-order-123',
        items: [{ productId: 'prod-1', quantity: 2 }],
      });

      expect(res.success).toBe(true);
      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: { availableQuantity: 18, reservedQuantity: 2 },
        }),
      );
      expect(prisma.inventoryHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeType: StockChangeType.RESERVATION_CREATED,
            quantityChange: -2,
            referenceId: 'res-order-123',
          }),
        }),
      );
    });

    it('confirms reservation and deducts reserved quantity', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        availableQuantity: 18,
        reservedQuantity: 2,
      });

      const res = await service.confirmReservation({
        reservationId: 'res-order-123',
        items: [{ productId: 'prod-1', quantity: 2 }],
      });

      expect(res.success).toBe(true);
      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: { reservedQuantity: 0 },
        }),
      );
      expect(prisma.inventoryHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeType: StockChangeType.RESERVATION_CONFIRMED,
            referenceId: 'res-order-123',
          }),
        }),
      );
    });

    it('releases reservation and restores stock to available quantity on payment failure', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        availableQuantity: 18,
        reservedQuantity: 2,
      });

      const res = await service.releaseReservation({
        reservationId: 'res-order-123',
        items: [{ productId: 'prod-1', quantity: 2 }],
      });

      expect(res.success).toBe(true);
      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: { availableQuantity: 20, reservedQuantity: 0 },
        }),
      );
      expect(prisma.inventoryHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeType: StockChangeType.RESERVATION_RELEASED,
            quantityChange: 2,
            referenceId: 'res-order-123',
          }),
        }),
      );
    });
  });
});
