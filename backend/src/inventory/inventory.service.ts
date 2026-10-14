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

  // ================= SELLER INVENTORY QUERIES & ADJUSTMENTS =================

  async getSellerInventory(userId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const variants = await this.prisma.productVariant.findMany({
      where: {
        product: {
          sellerId: seller.id,
          status: { not: ProductStatus.SOFT_DELETED },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
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
        inventory: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = variants.map((v) => {
      const available = v.inventory?.availableQuantity ?? v.stockQuantity;
      const reserved = v.inventory?.reservedQuantity ?? 0;
      const lowStockThreshold = v.inventory?.lowStockThreshold ?? v.lowStockThreshold;

      return {
        id: v.inventory?.id || v.id,
        variantId: v.id,
        productId: v.product.id,
        productName: v.product.name,
        sku: v.sku,
        size: v.size,
        color: v.color,
        categoryName: v.product.category.name,
        price: v.product.price,
        productStatus: v.product.status,
        isActive: v.isActive,
        availableQuantity: available,
        reservedQuantity: reserved,
        lowStockThreshold,
        isLowStock: available <= lowStockThreshold && available > 0,
        isOutOfStock: available === 0,
        updatedAt: v.inventory?.updatedAt || v.updatedAt,
      };
    });

    return {
      success: true,
      data: { items },
      message: 'Seller inventory retrieved successfully',
    };
  }

  async getVariantInventory(userId: string, variantId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
        inventory: true,
      },
    });

    if (!variant || variant.product.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Product variant not found');
    }

    if (variant.product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to view inventory for this variant');
    }

    const inv = variant.inventory;
    const available = inv?.availableQuantity ?? variant.stockQuantity;
    const reserved = inv?.reservedQuantity ?? 0;
    const lowStockThreshold = inv?.lowStockThreshold ?? variant.lowStockThreshold;

    return {
      success: true,
      data: {
        inventory: {
          id: inv?.id || null,
          variantId: variant.id,
          productId: variant.productId,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          availableQuantity: available,
          reservedQuantity: reserved,
          lowStockThreshold,
          isLowStock: available <= lowStockThreshold && available > 0,
          isOutOfStock: available === 0,
          updatedAt: inv?.updatedAt || variant.updatedAt,
        },
      },
      message: 'Variant inventory retrieved successfully',
    };
  }

  async adjustVariantStock(
    userId: string,
    variantId: string,
    dto: AdjustStockDto,
  ): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
        inventory: true,
      },
    });

    if (!variant || variant.product.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Product variant not found');
    }

    if (variant.product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to adjust inventory for this variant');
    }

    const previousQuantity = variant.inventory?.availableQuantity ?? variant.stockQuantity;
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
    const lowStockThreshold = dto.lowStockThreshold ?? variant.lowStockThreshold;

    const updated = await this.prisma.$transaction(async (tx) => {
      let inv = variant.inventory;
      if (!inv) {
        inv = await tx.inventory.create({
          data: {
            variantId,
            availableQuantity: newQuantity,
            reservedQuantity: 0,
            lowStockThreshold,
          },
        });
      } else {
        inv = await tx.inventory.update({
          where: { id: inv.id },
          data: {
            availableQuantity: newQuantity,
            lowStockThreshold,
          },
        });
      }

      await tx.productVariant.update({
        where: { id: variantId },
        data: {
          stockQuantity: newQuantity,
          lowStockThreshold,
        },
      });

      await tx.inventoryHistory.create({
        data: {
          inventoryId: inv.id,
          variantId,
          changeType,
          quantityChange,
          previousQuantity,
          newQuantity,
          reason: dto.reason.trim(),
          referenceId: dto.referenceId?.trim() || null,
        },
      });

      return inv;
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
          variantId,
          productId: variant.productId,
          sku: variant.sku,
          availableQuantity: updated.availableQuantity,
          reservedQuantity: updated.reservedQuantity,
          previousQuantity,
          quantityChange,
        },
      },
      message: 'Product variant stock adjusted successfully',
    };
  }

  async getVariantInventoryHistory(userId: string, variantId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant || variant.product.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Product variant not found');
    }

    if (variant.product.sellerId !== seller.id) {
      throw new ForbiddenException(
        'You are not authorized to view inventory history for this variant',
      );
    }

    const history = await this.prisma.inventoryHistory.findMany({
      where: { variantId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: { history },
      message: 'Variant inventory history retrieved successfully',
    };
  }

  async getProductInventory(userId: string, productId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          include: { inventory: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!product || product.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to view inventory for this product');
    }

    const variants = product.variants.map((v) => {
      const available = v.inventory?.availableQuantity ?? v.stockQuantity;
      return {
        variantId: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        availableQuantity: available,
        reservedQuantity: v.inventory?.reservedQuantity ?? 0,
        lowStockThreshold: v.inventory?.lowStockThreshold ?? v.lowStockThreshold,
        isLowStock:
          available <= (v.inventory?.lowStockThreshold ?? v.lowStockThreshold) && available > 0,
        isOutOfStock: available === 0,
      };
    });

    const totalAvailable = variants.reduce((sum, v) => sum + v.availableQuantity, 0);

    return {
      success: true,
      data: {
        productId: product.id,
        productName: product.name,
        totalAvailableQuantity: totalAvailable,
        isOutOfStock: totalAvailable === 0,
        variants,
      },
      message: 'Product variant inventory retrieved successfully',
    };
  }

  async adjustStock(userId: string, productId: string, dto: AdjustStockDto): Promise<any> {
    // If called at product level, adjust the first variant of the product
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!product || product.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to adjust inventory for this product');
    }

    const primaryVariant = product.variants[0];
    if (!primaryVariant) {
      throw new NotFoundException('Product has no variants to adjust');
    }

    return this.adjustVariantStock(userId, primaryVariant.id, dto);
  }

  // ================= INTERNAL CHECKOUT/ORDER WORKFLOW INTERFACES =================

  async validateStock(dto: ValidateStockDto): Promise<any> {
    const results = await Promise.all(
      dto.items.map(async (item) => {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: {
            product: true,
            inventory: true,
          },
        });

        if (
          !variant ||
          !variant.isActive ||
          variant.product.status !== ProductStatus.ACTIVE ||
          variant.product.deletedAt !== null
        ) {
          return {
            variantId: item.variantId,
            productId: variant?.productId || null,
            available: 0,
            requested: item.quantity,
            sufficient: false,
            reason: 'Variant is inactive or product is not available for purchase',
          };
        }

        const available = variant.inventory?.availableQuantity ?? variant.stockQuantity ?? 0;
        return {
          variantId: item.variantId,
          productId: variant.productId,
          productName: variant.product.name,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
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
      // 1. Verify variant availability first
      for (const item of dto.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true, inventory: true },
        });

        if (
          !variant ||
          !variant.isActive ||
          variant.product.status !== ProductStatus.ACTIVE ||
          variant.product.deletedAt !== null
        ) {
          throw new BadRequestException(`Variant ${item.variantId} is not available for purchase`);
        }
      }

      // 2. Atomically reserve stock using conditional update
      const updatedList: any[] = [];
      for (const item of dto.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true, inventory: true },
        });
        if (!variant) continue;

        let affected = 0;
        if (typeof tx.$executeRaw === 'function') {
          affected = await tx.$executeRaw`
            UPDATE "Inventory" 
            SET "availableQuantity" = "availableQuantity" - ${item.quantity}, 
                "reservedQuantity" = "reservedQuantity" + ${item.quantity} 
            WHERE "variantId" = ${item.variantId}::uuid AND "availableQuantity" >= ${item.quantity}
          `;
        } else {
          // Fallback for mock environments without raw SQL execution
          const inv = await tx.inventory.findUnique({ where: { variantId: item.variantId } });
          if (inv && inv.availableQuantity >= item.quantity) {
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                availableQuantity: inv.availableQuantity - item.quantity,
                reservedQuantity: inv.reservedQuantity + item.quantity,
              },
            });
            affected = 1;
          }
        }

        if (affected === 0) {
          const currentAvailable = variant.inventory?.availableQuantity ?? variant.stockQuantity;
          throw new BadRequestException(
            `Insufficient stock for variant '${variant.sku}' (${variant.size} / ${variant.color}). Available: ${currentAvailable}, Requested: ${item.quantity}`,
          );
        }

        const updatedInv = await tx.inventory.findUnique({
          where: { variantId: item.variantId },
        });

        if (updatedInv) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: updatedInv.availableQuantity },
          });

          await tx.inventoryHistory.create({
            data: {
              inventoryId: updatedInv.id,
              variantId: item.variantId,
              changeType: StockChangeType.RESERVATION_CREATED,
              quantityChange: -item.quantity,
              previousQuantity: updatedInv.availableQuantity + item.quantity,
              newQuantity: updatedInv.availableQuantity,
              reason: `Reserved for checkout reference ${dto.reservationId}`,
              referenceId: dto.reservationId,
            },
          });

          updatedList.push(updatedInv);
        }
      }

      return {
        success: true,
        data: {
          reservationId: dto.reservationId,
          items: updatedList,
        },
        message: 'Stock reserved atomically successfully',
      };
    });
  }

  async confirmReservation(dto: ConfirmReservationDto): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const inv = await tx.inventory.findUnique({
          where: { variantId: item.variantId },
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
            variantId: item.variantId,
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
          where: { variantId: item.variantId },
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

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: newAvailable },
        });

        await tx.inventoryHistory.create({
          data: {
            inventoryId: inv.id,
            variantId: item.variantId,
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

  async restockReturnedProduct(
    variantId: string,
    quantity: number,
    returnRequestId: string,
    changedBy: string,
  ): Promise<any> {
    const inv = await this.prisma.inventory.findUnique({
      where: { variantId },
    });
    if (!inv) {
      throw new NotFoundException(`Inventory record not found for variant ${variantId}`);
    }

    const previousQuantity = inv.availableQuantity;
    const newQuantity = previousQuantity + quantity;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedInv = await tx.inventory.update({
        where: { id: inv.id },
        data: { availableQuantity: newQuantity },
      });

      await tx.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity: newQuantity },
      });

      await tx.inventoryHistory.create({
        data: {
          inventoryId: inv.id,
          variantId,
          changeType: StockChangeType.RETURN_RESTOCK,
          quantityChange: quantity,
          previousQuantity,
          newQuantity,
          reason: `Restocked from accepted return request ${returnRequestId}`,
          referenceId: returnRequestId,
        },
      });

      return updatedInv;
    });

    await this.auditService.logAction({
      userId: changedBy,
      action: 'INVENTORY_RETURN_RESTOCK',
      resourceType: 'Inventory',
      resourceId: updated.id,
      previousValue: { availableQuantity: previousQuantity },
      newValue: {
        availableQuantity: newQuantity,
        returnRequestId,
      },
    });

    return {
      success: true,
      data: updated,
      message: 'Product variant stock restocked from return successfully',
    };
  }
}
