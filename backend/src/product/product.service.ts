import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CategoryService } from '../category/category.service';
import {
  CreateProductDto,
  CreateProductVariantDto,
  DuplicateProductDto,
  ProductImageDto,
  ProductQueryDto,
  SetSpecificationsDto,
  UpdateProductDto,
  UpdateProductVariantDto,
  AdminTakedownDto,
} from './dto';
import { Prisma, ProductStatus, SellerStatus, StockChangeType } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly categoryService: CategoryService,
  ) {}

  // ================= SELLER PRODUCT CRUD =================

  async createProduct(userId: string, dto: CreateProductDto): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    if (seller.status !== SellerStatus.APPROVED) {
      throw new ForbiddenException(
        `Seller is not approved to list products. Current status: ${seller.status}`,
      );
    }

    // Verify category exists and seller has approved category permission
    const hasCategoryPermission = await this.categoryService.hasSellerApprovedCategory(
      seller.id,
      dto.categoryId,
    );

    if (!hasCategoryPermission) {
      throw new ForbiddenException(
        'You do not have approved permission to sell products under this category',
      );
    }

    // Fetch category with size set
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      include: {
        sizeSet: {
          include: {
            values: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Prepare variant payload
    let variantsToCreate: Array<{
      sku: string;
      size: string;
      color: string;
      stockQuantity: number;
      lowStockThreshold: number;
      priceOverride?: number;
      sizeSetValueId?: string | null;
    }> = [];

    if (dto.variants && dto.variants.length > 0) {
      // Validate variants against Category SizeSet if defined
      if (category.sizeSet && category.sizeSet.values?.length > 0) {
        const allowedSizes = new Map(
          category.sizeSet.values.map((v) => [v.value.toUpperCase(), v.id]),
        );

        for (const v of dto.variants) {
          const matchedValId = allowedSizes.get(v.size.trim().toUpperCase());
          if (!matchedValId) {
            throw new BadRequestException(
              `Size '${v.size}' is not valid for category size set '${category.sizeSet.name}'`,
            );
          }
        }
      }

      // Check duplicate size x color combination and duplicate SKUs within request
      const seenCombos = new Set<string>();
      const seenSkus = new Set<string>();

      for (const v of dto.variants) {
        const comboKey = `${v.size.trim().toUpperCase()}__${v.color.trim().toUpperCase()}`;
        if (seenCombos.has(comboKey)) {
          throw new BadRequestException(
            `Duplicate variant combination (size: '${v.size}', color: '${v.color}') in request`,
          );
        }
        seenCombos.add(comboKey);

        const normalizedSku = v.sku.trim().toUpperCase();
        if (seenSkus.has(normalizedSku)) {
          throw new ConflictException(`Duplicate SKU '${normalizedSku}' in request payload`);
        }
        seenSkus.add(normalizedSku);
      }

      // Check global SKU uniqueness in database
      const skus = Array.from(seenSkus);
      const existingVariants = await this.prisma.productVariant.findMany({
        where: { sku: { in: skus } },
      });

      if (existingVariants.length > 0) {
        throw new ConflictException(
          `Product variant with SKU '${existingVariants[0].sku}' already exists`,
        );
      }

      variantsToCreate = dto.variants.map((v) => {
        const matchedVal = category.sizeSet?.values?.find(
          (sv) => sv.value.toUpperCase() === v.size.trim().toUpperCase(),
        );
        return {
          sku: v.sku.trim().toUpperCase(),
          size: v.size.trim(),
          color: v.color.trim(),
          stockQuantity: v.stockQuantity ?? 0,
          lowStockThreshold: v.lowStockThreshold ?? 5,
          priceOverride: v.priceOverride,
          sizeSetValueId: matchedVal?.id || null,
        };
      });
    } else if (dto.sku) {
      // Legacy or single product creation fallback
      const normalizedSku = dto.sku.trim().toUpperCase();
      const existingVariant = await this.prisma.productVariant.findUnique({
        where: { sku: normalizedSku },
      });

      if (existingVariant) {
        throw new ConflictException(`Product variant with SKU '${normalizedSku}' already exists`);
      }

      const defaultSize = category.sizeSet?.values?.[0]?.value || 'FREE_SIZE';
      const defaultSizeValId = category.sizeSet?.values?.[0]?.id || null;

      variantsToCreate = [
        {
          sku: normalizedSku,
          size: defaultSize,
          color: 'Standard',
          stockQuantity: dto.initialStock ?? 0,
          lowStockThreshold: dto.lowStockThreshold ?? 5,
          sizeSetValueId: defaultSizeValId,
        },
      ];
    } else {
      throw new BadRequestException(
        'Product must contain at least one size-color variant or a base SKU',
      );
    }

    const initialTotalStock = variantsToCreate.reduce((sum, v) => sum + v.stockQuantity, 0);

    const product = await this.prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          sellerId: seller.id,
          categoryId: dto.categoryId,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          price: new Prisma.Decimal(dto.price),
          compareAtPrice: dto.compareAtPrice ? new Prisma.Decimal(dto.compareAtPrice) : null,
          status: ProductStatus.ACTIVE,
        },
      });

      // Add images
      if (dto.images && dto.images.length > 0) {
        await tx.productImage.createMany({
          data: dto.images.map((img, idx) => ({
            productId: createdProduct.id,
            variantId: img.variantId || null,
            imageUrl: img.imageUrl,
            isPrimary: img.isPrimary ?? (idx === 0),
            displayOrder: img.displayOrder ?? idx,
          })),
        });
      }

      // Add specifications
      if (dto.specifications && dto.specifications.length > 0) {
        await tx.productSpecification.createMany({
          data: dto.specifications.map((spec, idx) => ({
            productId: createdProduct.id,
            name: spec.name.trim(),
            value: spec.value.trim(),
            displayOrder: spec.displayOrder ?? idx,
          })),
        });
      }

      // Add variants and initialize inventory per variant
      const createdVariants: any[] = [];
      for (const vData of variantsToCreate) {
        const createdVariant = await tx.productVariant.create({
          data: {
            productId: createdProduct.id,
            sizeSetValueId: vData.sizeSetValueId,
            sku: vData.sku,
            size: vData.size,
            color: vData.color,
            stockQuantity: vData.stockQuantity,
            lowStockThreshold: vData.lowStockThreshold,
            priceOverride: vData.priceOverride ? new Prisma.Decimal(vData.priceOverride) : null,
            isActive: true,
          },
        });

        const createdInventory = await tx.inventory.create({
          data: {
            variantId: createdVariant.id,
            availableQuantity: vData.stockQuantity,
            reservedQuantity: 0,
            lowStockThreshold: vData.lowStockThreshold,
          },
        });

        if (vData.stockQuantity > 0) {
          await tx.inventoryHistory.create({
            data: {
              inventoryId: createdInventory.id,
              variantId: createdVariant.id,
              changeType: StockChangeType.STOCK_ADDED,
              quantityChange: vData.stockQuantity,
              previousQuantity: 0,
              newQuantity: vData.stockQuantity,
              reason: 'Initial stock on product variant creation',
            },
          });
        }

        createdVariants.push({
          ...createdVariant,
          inventory: createdInventory,
        });
      }

      return {
        ...createdProduct,
        variants: createdVariants,
      };
    });

    await this.auditService.logAction({
      userId,
      action: 'PRODUCT_CREATED',
      resourceType: 'Product',
      resourceId: product.id,
      newValue: {
        sellerId: seller.id,
        categoryId: dto.categoryId,
        name: product.name,
        price: product.price.toNumber(),
        variantCount: product.variants.length,
        initialTotalStock,
      },
    });

    return {
      success: true,
      data: {
        product: {
          id: product.id,
          sellerId: product.sellerId,
          categoryId: product.categoryId,
          name: product.name,
          sku: product.variants[0]?.sku || null,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          status: product.status,
          initialStock: initialTotalStock,
          variants: product.variants,
          createdAt: product.createdAt,
        },
      },
      message: 'Product created successfully',
    };
  }

  async updateProduct(userId: string, productId: string, dto: UpdateProductDto): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to update this product');
    }

    // If category changed, verify permission for new category
    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      const hasPermission = await this.categoryService.hasSellerApprovedCategory(
        seller.id,
        dto.categoryId,
      );
      if (!hasPermission) {
        throw new ForbiddenException(
          'You do not have approved permission for the requested category',
        );
      }
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        name: dto.name?.trim() ?? product.name,
        description: dto.description !== undefined ? dto.description?.trim() : product.description,
        price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : product.price,
        compareAtPrice:
          dto.compareAtPrice !== undefined
            ? dto.compareAtPrice
              ? new Prisma.Decimal(dto.compareAtPrice)
              : null
            : product.compareAtPrice,
        categoryId: dto.categoryId ?? product.categoryId,
        status: dto.status ?? product.status,
      },
      include: {
        category: true,
        variants: {
          include: { inventory: true },
        },
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'PRODUCT_UPDATED',
      resourceType: 'Product',
      resourceId: productId,
      previousValue: {
        name: product.name,
        price: product.price.toNumber(),
        categoryId: product.categoryId,
        status: product.status,
      },
      newValue: {
        name: updated.name,
        price: updated.price.toNumber(),
        categoryId: updated.categoryId,
        status: updated.status,
      },
    });

    return {
      success: true,
      data: { product: updated },
      message: 'Product updated successfully',
    };
  }

  async duplicateProduct(userId: string, productId: string, dto: DuplicateProductDto): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const original = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: true,
        specifications: true,
        variants: {
          include: { inventory: true },
        },
      },
    });

    if (!original || original.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Source product not found');
    }

    if (original.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to duplicate this product');
    }

    const normalizedSku = dto.newSku.trim().toUpperCase();
    const existingSku = await this.prisma.productVariant.findUnique({
      where: { sku: normalizedSku },
    });

    if (existingSku) {
      throw new ConflictException(`Product variant with SKU '${normalizedSku}' already exists`);
    }

    const initialStock = dto.initialStock ?? 0;

    const duplicated = await this.prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          sellerId: seller.id,
          categoryId: original.categoryId,
          name: dto.name?.trim() || `${original.name} (Copy)`,
          description: original.description,
          price: original.price,
          compareAtPrice: original.compareAtPrice,
          status: ProductStatus.ACTIVE,
        },
      });

      if (original.images.length > 0) {
        await tx.productImage.createMany({
          data: original.images.map((img) => ({
            productId: newProduct.id,
            imageUrl: img.imageUrl,
            isPrimary: img.isPrimary,
            displayOrder: img.displayOrder,
          })),
        });
      }

      if (original.specifications.length > 0) {
        await tx.productSpecification.createMany({
          data: original.specifications.map((spec) => ({
            productId: newProduct.id,
            name: spec.name,
            value: spec.value,
            displayOrder: spec.displayOrder,
          })),
        });
      }

      // Duplicate variant
      const primaryVariant = original.variants[0];
      const newVariant = await tx.productVariant.create({
        data: {
          productId: newProduct.id,
          sizeSetValueId: primaryVariant?.sizeSetValueId || null,
          sku: normalizedSku,
          size: primaryVariant?.size || 'FREE_SIZE',
          color: primaryVariant?.color || 'Standard',
          stockQuantity: initialStock,
          lowStockThreshold: primaryVariant?.lowStockThreshold || 5,
          isActive: true,
        },
      });

      const newInv = await tx.inventory.create({
        data: {
          variantId: newVariant.id,
          availableQuantity: initialStock,
          reservedQuantity: 0,
          lowStockThreshold: primaryVariant?.lowStockThreshold || 5,
        },
      });

      if (initialStock > 0) {
        await tx.inventoryHistory.create({
          data: {
            inventoryId: newInv.id,
            variantId: newVariant.id,
            changeType: StockChangeType.STOCK_ADDED,
            quantityChange: initialStock,
            previousQuantity: 0,
            newQuantity: initialStock,
            reason: `Duplicated from product ${productId}`,
          },
        });
      }

      return {
        ...newProduct,
        sku: normalizedSku,
        variants: [{ ...newVariant, inventory: newInv }],
      };
    });

    await this.auditService.logAction({
      userId,
      action: 'PRODUCT_DUPLICATED',
      resourceType: 'Product',
      resourceId: duplicated.id,
      newValue: {
        originalProductId: productId,
        newSku: duplicated.sku,
        name: duplicated.name,
      },
    });

    return {
      success: true,
      data: { product: duplicated },
      message: 'Product duplicated successfully',
    };
  }

  // ================= STATUS LIFECYCLE & SOFT DELETION =================

  async pauseProduct(userId: string, productId: string): Promise<any> {
    return this.updateProductStatus(userId, productId, ProductStatus.PAUSED, 'PRODUCT_PAUSED');
  }

  async activateProduct(userId: string, productId: string): Promise<any> {
    return this.updateProductStatus(userId, productId, ProductStatus.ACTIVE, 'PRODUCT_ACTIVATED');
  }

  async hideProduct(userId: string, productId: string): Promise<any> {
    return this.updateProductStatus(userId, productId, ProductStatus.HIDDEN, 'PRODUCT_HIDDEN');
  }

  async deleteProduct(userId: string, productId: string): Promise<any> {
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
      throw new ForbiddenException('You are not authorized to delete this product');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          status: ProductStatus.SOFT_DELETED,
          deletedAt: new Date(),
        },
      });

      // Clear inventory available stock across all variants
      const variantIds = product.variants.map((v) => v.id);
      if (variantIds.length > 0) {
        await tx.inventory.updateMany({
          where: { variantId: { in: variantIds } },
          data: { availableQuantity: 0 },
        });

        await tx.productVariant.updateMany({
          where: { id: { in: variantIds } },
          data: { stockQuantity: 0, isActive: false },
        });
      }
    });

    await this.auditService.logAction({
      userId,
      action: 'PRODUCT_DELETED',
      resourceType: 'Product',
      resourceId: productId,
      previousValue: { status: product.status },
      newValue: { status: ProductStatus.SOFT_DELETED, deletedAt: new Date() },
    });

    return {
      success: true,
      data: null,
      message: 'Product deleted successfully',
    };
  }

  private async updateProductStatus(
    userId: string,
    productId: string,
    status: ProductStatus,
    actionName: string,
  ): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to modify this product');
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status },
    });

    await this.auditService.logAction({
      userId,
      action: actionName,
      resourceType: 'Product',
      resourceId: productId,
      previousValue: { status: product.status },
      newValue: { status },
    });

    return {
      success: true,
      data: { product: updated },
      message: `Product status updated to ${status}`,
    };
  }

  // ================= SELLER PRODUCT QUERIES =================

  async getOwnProducts(userId: string, query: ProductQueryDto): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      sellerId: seller.id,
      status: query.status ? query.status : { not: ProductStatus.SOFT_DELETED },
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [items, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: true,
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          variants: {
            include: { inventory: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: items.map((p) => {
          const totalAvailable = p.variants.reduce(
            (sum, v) => sum + (v.inventory?.availableQuantity ?? v.stockQuantity ?? 0),
            0,
          );
          const totalReserved = p.variants.reduce(
            (sum, v) => sum + (v.inventory?.reservedQuantity ?? 0),
            0,
          );
          const primarySku = p.variants[0]?.sku || null;

          return {
            id: p.id,
            name: p.name,
            sku: primarySku,
            price: p.price,
            compareAtPrice: p.compareAtPrice,
            status: p.status,
            category: {
              id: p.category.id,
              name: p.category.name,
            },
            primaryImage: p.images[0]?.imageUrl || null,
            availableQuantity: totalAvailable,
            reservedQuantity: totalReserved,
            variantCount: p.variants.length,
            isLowStock: totalAvailable > 0 && totalAvailable <= 5,
            isOutOfStock: totalAvailable === 0,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          };
        }),
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
        },
      },
      message: 'Seller products retrieved successfully',
    };
  }

  async getOwnProduct(userId: string, productId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        images: { orderBy: { displayOrder: 'asc' } },
        specifications: { orderBy: { displayOrder: 'asc' } },
        variants: {
          include: {
            inventory: true,
            images: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!product || product.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to view this product');
    }

    const totalAvailable = product.variants.reduce(
      (sum, v) => sum + (v.inventory?.availableQuantity ?? v.stockQuantity ?? 0),
      0,
    );

    return {
      success: true,
      data: {
        product: {
          ...product,
          sku: product.variants[0]?.sku || null,
          availableQuantity: totalAvailable,
          inStock: totalAvailable > 0,
        },
      },
      message: 'Product details retrieved successfully',
    };
  }

  // ================= PUBLIC MARKETPLACE BROWSING =================

  async listPublicProducts(query: ProductQueryDto): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      deletedAt: null,
      seller: {
        status: SellerStatus.APPROVED,
      },
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.sellerId) {
      where.sellerId = query.sellerId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) {
        where.price.gte = new Prisma.Decimal(query.minPrice);
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = new Prisma.Decimal(query.maxPrice);
      }
    }

    if (query.inStockOnly) {
      where.variants = {
        some: {
          isActive: true,
          inventory: {
            availableQuantity: { gt: 0 },
          },
        },
      };
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [items, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          seller: {
            select: {
              id: true,
              displayName: true,
              businessName: true,
            },
          },
          images: {
            orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
          },
          variants: {
            where: { isActive: true },
            include: {
              inventory: {
                select: {
                  availableQuantity: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: items.map((p) => {
          const totalStock = p.variants.reduce(
            (sum, v) => sum + (v.inventory?.availableQuantity ?? v.stockQuantity ?? 0),
            0,
          );
          return {
            id: p.id,
            name: p.name,
            sku: p.variants[0]?.sku || null,
            price: p.price,
            compareAtPrice: p.compareAtPrice,
            description: p.description,
            category: p.category,
            seller: p.seller,
            primaryImage:
              p.images.find((img) => img.isPrimary)?.imageUrl || p.images[0]?.imageUrl || null,
            images: p.images.map((img) => img.imageUrl),
            inStock: totalStock > 0,
            availableQuantity: totalStock,
            variants: p.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              size: v.size,
              color: v.color,
              stockQuantity: v.inventory?.availableQuantity ?? v.stockQuantity,
              inStock: (v.inventory?.availableQuantity ?? v.stockQuantity) > 0,
            })),
            createdAt: p.createdAt,
          };
        }),
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
        },
      },
      message: 'Products retrieved successfully',
    };
  }

  async getPublicProduct(productId: string): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        seller: {
          select: {
            id: true,
            displayName: true,
            businessName: true,
            status: true,
          },
        },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
        },
        specifications: {
          orderBy: { displayOrder: 'asc' },
        },
        variants: {
          where: { isActive: true },
          include: {
            inventory: {
              select: {
                availableQuantity: true,
              },
            },
            images: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (
      !product ||
      product.status !== ProductStatus.ACTIVE ||
      product.deletedAt !== null ||
      product.seller.status !== SellerStatus.APPROVED
    ) {
      throw new NotFoundException('Product not found or unavailable');
    }

    const totalAvailable = product.variants.reduce(
      (sum, v) => sum + (v.inventory?.availableQuantity ?? v.stockQuantity ?? 0),
      0,
    );

    return {
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          sku: product.variants[0]?.sku || null,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          description: product.description,
          category: product.category,
          seller: product.seller,
          images: product.images,
          specifications: product.specifications,
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            size: v.size,
            color: v.color,
            priceOverride: v.priceOverride,
            inStock: (v.inventory?.availableQuantity ?? v.stockQuantity) > 0,
            availableQuantity: v.inventory?.availableQuantity ?? v.stockQuantity,
            images: v.images,
          })),
          inStock: totalAvailable > 0,
          availableQuantity: totalAvailable,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },
      },
      message: 'Product details retrieved successfully',
    };
  }

  // ================= IMAGES & SPECIFICATIONS =================

  async getProductImages(userId: string, productId: string): Promise<any> {
    const product = await this.getOwnProduct(userId, productId);
    return {
      success: true,
      data: { images: product.data.product.images },
      message: 'Product images retrieved successfully',
    };
  }

  async addProductImage(userId: string, productId: string, dto: ProductImageDto): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to modify this product');
    }

    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: dto.variantId },
      });
      if (!variant || variant.productId !== productId) {
        throw new BadRequestException('Variant does not belong to this product');
      }
    }

    const imageCount = await this.prisma.productImage.count({ where: { productId } });
    const isPrimary = imageCount === 0 || dto.isPrimary === true;

    const image = await this.prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      }

      return tx.productImage.create({
        data: {
          productId,
          variantId: dto.variantId || null,
          imageUrl: dto.imageUrl,
          isPrimary,
          displayOrder: dto.displayOrder ?? imageCount,
        },
      });
    });

    return {
      success: true,
      data: { image },
      message: 'Product image added successfully',
    };
  }

  async removeProductImage(userId: string, productId: string, imageId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
      include: { product: true },
    });

    if (!image || image.productId !== productId) {
      throw new NotFoundException('Product image not found');
    }

    if (image.product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to modify this product');
    }

    await this.prisma.productImage.delete({ where: { id: imageId } });

    return {
      success: true,
      data: null,
      message: 'Product image removed successfully',
    };
  }

  async getProductSpecifications(userId: string, productId: string): Promise<any> {
    const product = await this.getOwnProduct(userId, productId);
    return {
      success: true,
      data: { specifications: product.data.product.specifications },
      message: 'Product specifications retrieved successfully',
    };
  }

  async setProductSpecifications(
    userId: string,
    productId: string,
    dto: SetSpecificationsDto,
  ): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to modify this product');
    }

    const specifications = await this.prisma.$transaction(async (tx) => {
      await tx.productSpecification.deleteMany({ where: { productId } });

      return tx.productSpecification.createManyAndReturn({
        data: dto.specifications.map((s, idx) => ({
          productId,
          name: s.name.trim(),
          value: s.value.trim(),
          displayOrder: s.displayOrder ?? idx,
        })),
      });
    });

    return {
      success: true,
      data: { specifications },
      message: 'Product specifications updated successfully',
    };
  }

  // ================= PRODUCT VARIANTS (SIZE X COLOR) =================

  async createProductVariant(
    userId: string,
    productId: string,
    dto: CreateProductVariantDto,
  ): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    if (seller.status !== SellerStatus.APPROVED) {
      throw new ForbiddenException('Seller is not approved to manage products');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: {
          include: {
            sizeSet: {
              include: {
                values: { where: { isActive: true } },
              },
            },
          },
        },
      },
    });

    if (!product || product.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to modify this product');
    }

    // Validate size against category size set
    let sizeSetValueId: string | null = null;
    if (product.category?.sizeSet && product.category.sizeSet.values?.length > 0) {
      const matched = product.category.sizeSet.values.find(
        (v) => v.value.toUpperCase() === dto.size.trim().toUpperCase(),
      );
      if (!matched) {
        throw new BadRequestException(
          `Size '${dto.size}' is not valid for category size set '${product.category.sizeSet.name}'`,
        );
      }
      sizeSetValueId = matched.id;
    }

    // Validate global SKU uniqueness
    const normalizedSku = dto.sku.trim().toUpperCase();
    const existingSku = await this.prisma.productVariant.findUnique({
      where: { sku: normalizedSku },
    });
    if (existingSku) {
      throw new ConflictException(`Product variant with SKU '${normalizedSku}' already exists`);
    }

    // Validate compound uniqueness (productId, size, color)
    const existingCombo = await this.prisma.productVariant.findFirst({
      where: {
        productId,
        size: { equals: dto.size.trim(), mode: 'insensitive' },
        color: { equals: dto.color.trim(), mode: 'insensitive' },
      },
    });
    if (existingCombo) {
      throw new ConflictException(
        `Variant with size '${dto.size}' and color '${dto.color}' already exists on this product`,
      );
    }

    const stockQuantity = dto.stockQuantity ?? 0;
    const lowStockThreshold = dto.lowStockThreshold ?? 5;

    const variant = await this.prisma.$transaction(async (tx) => {
      const createdVariant = await tx.productVariant.create({
        data: {
          productId,
          sizeSetValueId,
          sku: normalizedSku,
          size: dto.size.trim(),
          color: dto.color.trim(),
          stockQuantity,
          lowStockThreshold,
          priceOverride: dto.priceOverride ? new Prisma.Decimal(dto.priceOverride) : null,
          isActive: true,
        },
      });

      const inv = await tx.inventory.create({
        data: {
          variantId: createdVariant.id,
          availableQuantity: stockQuantity,
          reservedQuantity: 0,
          lowStockThreshold,
        },
      });

      if (stockQuantity > 0) {
        await tx.inventoryHistory.create({
          data: {
            inventoryId: inv.id,
            variantId: createdVariant.id,
            changeType: StockChangeType.STOCK_ADDED,
            quantityChange: stockQuantity,
            previousQuantity: 0,
            newQuantity: stockQuantity,
            reason: 'Initial variant creation stock',
          },
        });
      }

      return {
        ...createdVariant,
        inventory: inv,
      };
    });

    await this.auditService.logAction({
      userId,
      action: 'PRODUCT_VARIANT_CREATED',
      resourceType: 'ProductVariant',
      resourceId: variant.id,
      newValue: {
        productId,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        stockQuantity,
      },
    });

    return {
      success: true,
      data: { variant },
      message: 'Product variant created successfully',
    };
  }

  async getProductVariants(userId: string, productId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to view this product');
    }

    const variants = await this.prisma.productVariant.findMany({
      where: { productId },
      include: {
        inventory: true,
        images: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      data: { variants },
      message: 'Product variants retrieved successfully',
    };
  }

  async updateProductVariant(
    userId: string,
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
  ): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: {
          include: {
            sizeSet: {
              include: { values: { where: { isActive: true } } },
            },
          },
        },
      },
    });
    if (!product || product.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to modify this product');
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { inventory: true },
    });
    if (!variant || variant.productId !== productId) {
      throw new NotFoundException('Product variant not found');
    }

    let sizeSetValueId = variant.sizeSetValueId;
    if (dto.size && dto.size !== variant.size) {
      if (product.category?.sizeSet && product.category.sizeSet.values?.length > 0) {
        const matched = product.category.sizeSet.values.find(
          (v) => v.value.toUpperCase() === dto.size!.trim().toUpperCase(),
        );
        if (!matched) {
          throw new BadRequestException(
            `Size '${dto.size}' is not valid for category size set '${product.category.sizeSet.name}'`,
          );
        }
        sizeSetValueId = matched.id;
      }
    }

    if (dto.sku && dto.sku.trim().toUpperCase() !== variant.sku) {
      const normalizedSku = dto.sku.trim().toUpperCase();
      const existing = await this.prisma.productVariant.findUnique({
        where: { sku: normalizedSku },
      });
      if (existing) {
        throw new ConflictException(`Product variant with SKU '${normalizedSku}' already exists`);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedVariant = await tx.productVariant.update({
        where: { id: variantId },
        data: {
          size: dto.size ? dto.size.trim() : variant.size,
          sizeSetValueId,
          color: dto.color ? dto.color.trim() : variant.color,
          sku: dto.sku ? dto.sku.trim().toUpperCase() : variant.sku,
          stockQuantity: dto.stockQuantity ?? variant.stockQuantity,
          lowStockThreshold: dto.lowStockThreshold ?? variant.lowStockThreshold,
          priceOverride:
            dto.priceOverride !== undefined
              ? dto.priceOverride
                ? new Prisma.Decimal(dto.priceOverride)
                : null
              : variant.priceOverride,
          isActive: dto.isActive !== undefined ? dto.isActive : variant.isActive,
        },
      });

      if (dto.stockQuantity !== undefined && variant.inventory) {
        const diff = dto.stockQuantity - variant.inventory.availableQuantity;
        if (diff !== 0) {
          await tx.inventory.update({
            where: { id: variant.inventory.id },
            data: {
              availableQuantity: dto.stockQuantity,
              lowStockThreshold: dto.lowStockThreshold ?? variant.inventory.lowStockThreshold,
            },
          });

          await tx.inventoryHistory.create({
            data: {
              inventoryId: variant.inventory.id,
              variantId,
              changeType:
                diff > 0 ? StockChangeType.STOCK_ADDED : StockChangeType.STOCK_REMOVED,
              quantityChange: diff,
              previousQuantity: variant.inventory.availableQuantity,
              newQuantity: dto.stockQuantity,
              reason: 'Manual seller stock adjustment',
            },
          });
        }
      }

      return updatedVariant;
    });

    await this.auditService.logAction({
      userId,
      action: 'PRODUCT_VARIANT_UPDATED',
      resourceType: 'ProductVariant',
      resourceId: variantId,
      previousValue: {
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        stockQuantity: variant.stockQuantity,
      },
      newValue: {
        sku: updated.sku,
        size: updated.size,
        color: updated.color,
        stockQuantity: updated.stockQuantity,
      },
    });

    return {
      success: true,
      data: { variant: updated },
      message: 'Product variant updated successfully',
    };
  }

  async deleteProductVariant(userId: string, productId: string, variantId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status === ProductStatus.SOFT_DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to modify this product');
    }

    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.productId !== productId) {
      throw new NotFoundException('Product variant not found');
    }

    // Check if variant has order items
    const orderItemCount = await this.prisma.orderItem.count({ where: { variantId } });

    await this.prisma.$transaction(async (tx) => {
      if (orderItemCount > 0) {
        // Soft delete variant to preserve order history
        await tx.productVariant.update({
          where: { id: variantId },
          data: { isActive: false, stockQuantity: 0 },
        });

        await tx.inventory.updateMany({
          where: { variantId },
          data: { availableQuantity: 0 },
        });
      } else {
        await tx.productVariant.delete({ where: { id: variantId } });
      }
    });

    await this.auditService.logAction({
      userId,
      action: 'PRODUCT_VARIANT_DELETED',
      resourceType: 'ProductVariant',
      resourceId: variantId,
      previousValue: { sku: variant.sku, orderItemCount },
      newValue: { deleted: orderItemCount === 0, deactivated: orderItemCount > 0 },
    });

    return {
      success: true,
      data: null,
      message:
        orderItemCount > 0
          ? 'Variant has order history and was deactivated'
          : 'Product variant deleted successfully',
    };
  }

  // ================= ADMIN PRODUCT MODERATION TAKEDOWN =================

  async takedownProduct(
    adminUserId: string,
    productId: string,
    dto: AdminTakedownDto,
  ): Promise<any> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.REMOVED_BY_ADMIN,
        takedownReason: dto.takedownReason.trim(),
        takedownByAdminId: adminUserId,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'PRODUCT_TAKEDOWN_BY_ADMIN',
      resourceType: 'Product',
      resourceId: productId,
      previousValue: { status: product.status },
      newValue: {
        status: ProductStatus.REMOVED_BY_ADMIN,
        takedownReason: dto.takedownReason.trim(),
      },
    });

    return {
      success: true,
      data: { product: updated },
      message: 'Product has been taken down by administrator',
    };
  }
}
