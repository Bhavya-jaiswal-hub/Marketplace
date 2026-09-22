import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AdjustStockDto,
  ConfirmReservationDto,
  ReleaseReservationDto,
  ReserveStockDto,
  StockAdjustmentMode,
  ValidateStockDto,
} from './dto';
import { ProductStatus, StockChangeType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getSellerInventory(userId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const inventoryList = await this.prisma.inventory.findMany({
      where: {
        product: {
          sellerId: seller.id,
          status: { not: ProductStatus.DELETED },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            status: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = inventoryList.map((inv) => ({
      id: inv.id,
      productId: inv.productId,
      productName: inv.product.name,
      sku: inv.product.sku,
      categoryName: inv.product.category.name,
      price: inv.product.price,
      productStatus: inv.product.status,
      availableQuantity: inv.availableQuantity,
      reservedQuantity: inv.reservedQuantity,
      lowStockThreshold: inv.lowStockThreshold,
      isLowStock:
        inv.availableQuantity <= inv.lowStockThreshold && inv.availableQuantity > 0,
      isOutOfStock: inv.availableQuantity === 0,
      updatedAt: inv.updatedAt,
    }));

    return {
      success: true,
      data: { items },
      message: 'Seller inventory retrieved successfully',
    };
  }

  async getProductInventory(userId: string, productId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true },
    });

    if (!product || product.status === ProductStatus.DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to view inventory for this product');
    }

    const inv = product.inventory;
    if (!inv) {
      throw new NotFoundException('Inventory record not found for this product');
    }

    return {
      success: true,
      data: {
        inventory: {
          id: inv.id,
          productId: inv.productId,
          availableQuantity: inv.availableQuantity,
          reservedQuantity: inv.reservedQuantity,
          lowStockThreshold: inv.lowStockThreshold,
          isLowStock:
            inv.availableQuantity <= inv.lowStockThreshold && inv.availableQuantity > 0,
          isOutOfStock: inv.availableQuantity === 0,
          updatedAt: inv.updatedAt,
        },
      },
      message: 'Product inventory retrieved successfully',
    };
  }

  async adjustStock(userId: string, productId: string, dto: AdjustStockDto): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true },
    });

    if (!product || product.status === ProductStatus.DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to adjust inventory for this product');
    }

    const inv = product.inventory;
    if (!inv) {
      throw new NotFoundException('Inventory record not found for this product');
    }

    const previousQuantity = inv.availableQuantity;
    let newQuantity: number;
    let changeType: StockChangeType = StockChangeType.MANUAL_ADJUSTMENT;

    const mode = dto.mode || StockAdjustmentMode.SET;
    if (mode === StockAdjustmentMode.SET) {
      newQuantity = dto.quantity;
      changeType =
        newQuantity >= previousQuantity
          ? StockChangeType.STOCK_ADDED
          : StockChangeType.STOCK_REMOVED;
    } else if (mode === StockAdjustmentMode.ADD) {
      newQuantity = previousQuantity + dto.quantity;
      changeType = StockChangeType.STOCK_ADDED;
    } else if (mode === StockAdjustmentMode.REMOVE) {
      newQuantity = previousQuantity - dto.quantity;
      changeType = StockChangeType.STOCK_REMOVED;
    } else {
      throw new BadRequestException('Invalid adjustment mode');
    }

    if (newQuantity < 0) {
      throw new BadRequestException(
        `Insufficient stock for adjustment. Current available: ${previousQuantity}, Requested reduction: ${dto.quantity}`,
      );
    }

    const quantityChange = newQuantity - previousQuantity;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedInv = await tx.inventory.update({
        where: { id: inv.id },
        data: { availableQuantity: newQuantity },
      });

      await tx.inventoryHistory.create({
        data: {
          inventoryId: inv.id,
          productId,
          changeType,
          quantityChange,
          previousQuantity,
          newQuantity,
          reason: dto.reason.trim(),
          referenceId: dto.referenceId?.trim() || null,
        },
      });

      return updatedInv;
    });

    await this.auditService.logAction({
      userId,
      action: 'INVENTORY_ADJUSTED',
      resourceType: 'Inventory',
      resourceId: updated.id,
      previousValue: { availableQuantity: previousQuantity },
      newValue: {
        availableQuantity: newQuantity,
        reason: dto.reason,
        mode,
      },
    });

    return {
      success: true,
      data: {
        inventory: {
          id: updated.id,
          productId: updated.productId,
          availableQuantity: updated.availableQuantity,
          reservedQuantity: updated.reservedQuantity,
          previousQuantity,
          quantityChange,
        },
      },
      message: 'Product stock adjusted successfully',
    };
  }

  async getInventoryHistory(userId: string, productId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.status === ProductStatus.DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to view inventory history for this product');
    }

    const history = await this.prisma.inventoryHistory.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: { history },
      message: 'Inventory history retrieved successfully',
    };
  }

  // ================= INTERNAL CHECKOUT/ORDER WORKFLOW INTERFACES =================

  async validateStock(dto: ValidateStockDto): Promise<any> {
    const results = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          include: { inventory: true },
        });

        if (!product || product.status !== ProductStatus.ACTIVE) {
          return {
            productId: item.productId,
            available: 0,
            requested: item.quantity,
            sufficient: false,
            reason: 'Product is not active or does not exist',
          };
        }

        const available = product.inventory?.availableQuantity || 0;
        return {
          productId: item.productId,
          productName: product.name,
          available,
          requested: item.quantity,
          sufficient: available >= item.quantity,
        };
      }),
    );

    const allSufficient = results.every((r) => r.sufficient);

    return {
      success: true,
      data: {
        valid: allSufficient,
        items: results,
      },
      message: allSufficient ? 'Stock validation passed' : 'Some items have insufficient stock',
    };
  }

  async reserveStock(dto: ReserveStockDto): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify all items first
      for (const item of dto.items) {
        const inv = await tx.inventory.findUnique({
          where: { productId: item.productId },
          include: { product: true },
        });

        if (!inv || inv.product.status !== ProductStatus.ACTIVE) {
          throw new BadRequestException(
            `Product ${item.productId} is not available for purchase`,
          );
        }

        if (inv.availableQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product '${inv.product.name}'. Available: ${inv.availableQuantity}, Requested: ${item.quantity}`,
          );
        }
      }

      // 2. Atomically reserve each item
      const updatedList = [];
      for (const item of dto.items) {
        const inv = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });
        if (!inv) continue;

        const previousQuantity = inv.availableQuantity;
        const newAvailable = inv.availableQuantity - item.quantity;
        const newReserved = inv.reservedQuantity + item.quantity;

        const updated = await tx.inventory.update({
          where: { id: inv.id },
          data: {
            availableQuantity: newAvailable,
            reservedQuantity: newReserved,
          },
        });

        await tx.inventoryHistory.create({
          data: {
            inventoryId: inv.id,
            productId: item.productId,
            changeType: StockChangeType.RESERVATION_CREATED,
            quantityChange: -item.quantity,
            previousQuantity,
            newQuantity: newAvailable,
            reason: `Reserved for checkout reference ${dto.reservationId}`,
            referenceId: dto.reservationId,
          },
        });

        updatedList.push(updated);
      }

      return {
        success: true,
        data: {
          reservationId: dto.reservationId,
          items: updatedList,
        },
        message: 'Stock reserved successfully',
      };
    });
  }

  async confirmReservation(dto: ConfirmReservationDto): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const inv = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });
        if (!inv) continue;

        const newReserved = Math.max(0, inv.reservedQuantity - item.quantity);

        await tx.inventory.update({
          where: { id: inv.id },
          data: { reservedQuantity: newReserved },
        });

        await tx.inventoryHistory.create({
          data: {
            inventoryId: inv.id,
            productId: item.productId,
            changeType: StockChangeType.RESERVATION_CONFIRMED,
            quantityChange: -item.quantity,
            previousQuantity: inv.availableQuantity,
            newQuantity: inv.availableQuantity,
            reason: `Confirmed order reservation ${dto.reservationId}`,
            referenceId: dto.reservationId,
          },
        });
      }

      return {
        success: true,
        data: { reservationId: dto.reservationId },
        message: 'Stock reservation confirmed and deducted successfully',
      };
    });
  }

  async releaseReservation(dto: ReleaseReservationDto): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const inv = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });
        if (!inv) continue;

        const previousAvailable = inv.availableQuantity;
        const newAvailable = inv.availableQuantity + item.quantity;
        const newReserved = Math.max(0, inv.reservedQuantity - item.quantity);

        await tx.inventory.update({
          where: { id: inv.id },
          data: {
            availableQuantity: newAvailable,
            reservedQuantity: newReserved,
          },
        });

        await tx.inventoryHistory.create({
          data: {
            inventoryId: inv.id,
            productId: item.productId,
            changeType: StockChangeType.RESERVATION_RELEASED,
            quantityChange: item.quantity,
            previousQuantity: previousAvailable,
            newQuantity: newAvailable,
            reason: `Released reservation ${dto.reservationId}`,
            referenceId: dto.reservationId,
          },
        });
      }

      return {
        success: true,
        data: { reservationId: dto.reservationId },
        message: 'Stock reservation released successfully',
      };
    });
  }
}
