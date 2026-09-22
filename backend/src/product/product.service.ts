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
  DuplicateProductDto,
  ProductImageDto,
  ProductQueryDto,
  SetSpecificationsDto,
  UpdateProductDto,
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

    // Verify SKU uniqueness
    const normalizedSku = dto.sku.trim().toUpperCase();
    const existingSku = await this.prisma.product.findUnique({
      where: { sku: normalizedSku },
    });

    if (existingSku) {
      throw new ConflictException(`Product with SKU '${normalizedSku}' already exists`);
    }

    const initialStock = dto.initialStock ?? 0;
    const lowStockThreshold = dto.lowStockThreshold ?? 5;

    const product = await this.prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          sellerId: seller.id,
          categoryId: dto.categoryId,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          sku: normalizedSku,
          price: new Prisma.Decimal(dto.price),
          status: ProductStatus.ACTIVE,
        },
      });

      // Add images
      if (dto.images && dto.images.length > 0) {
        await tx.productImage.createMany({
          data: dto.images.map((img, idx) => ({
            productId: createdProduct.id,
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

      // Initialize Inventory
      const createdInventory = await tx.inventory.create({
        data: {
          productId: createdProduct.id,
          availableQuantity: initialStock,
          reservedQuantity: 0,
          lowStockThreshold,
        },
      });

      if (initialStock > 0) {
        await tx.inventoryHistory.create({
          data: {
            inventoryId: createdInventory.id,
            productId: createdProduct.id,
            changeType: StockChangeType.STOCK_ADDED,
            quantityChange: initialStock,
            previousQuantity: 0,
            newQuantity: initialStock,
            reason: 'Initial stock on product creation',
          },
        });
      }

      return createdProduct;
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
        sku: product.sku,
        price: product.price.toNumber(),
        initialStock,
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
          sku: product.sku,
          price: product.price,
          status: product.status,
          initialStock,
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
    if (!product || product.status === ProductStatus.DELETED) {
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
        categoryId: dto.categoryId ?? product.categoryId,
        status: dto.status ?? product.status,
      },
      include: {
        category: true,
        inventory: true,
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
        inventory: true,
      },
    });

    if (!original || original.status === ProductStatus.DELETED) {
      throw new NotFoundException('Source product not found');
    }

    if (original.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to duplicate this product');
    }

    const normalizedSku = dto.newSku.trim().toUpperCase();
    const existingSku = await this.prisma.product.findUnique({
      where: { sku: normalizedSku },
    });

    if (existingSku) {
      throw new ConflictException(`Product with SKU '${normalizedSku}' already exists`);
    }

    const initialStock = dto.initialStock ?? 0;
    const lowStockThreshold = original.inventory?.lowStockThreshold ?? 5;

    const duplicated = await this.prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          sellerId: seller.id,
          categoryId: original.categoryId,
          name: dto.name?.trim() || `${original.name} (Copy)`,
          description: original.description,
          sku: normalizedSku,
          price: original.price,
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

      const newInv = await tx.inventory.create({
        data: {
          productId: newProduct.id,
          availableQuantity: initialStock,
          reservedQuantity: 0,
          lowStockThreshold,
        },
      });

      if (initialStock > 0) {
        await tx.inventoryHistory.create({
          data: {
            inventoryId: newInv.id,
            productId: newProduct.id,
            changeType: StockChangeType.STOCK_ADDED,
            quantityChange: initialStock,
            previousQuantity: 0,
            newQuantity: initialStock,
            reason: `Duplicated from product ${productId}`,
          },
        });
      }

      return newProduct;
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

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status === ProductStatus.DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to delete this product');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          status: ProductStatus.DELETED,
          deletedAt: new Date(),
        },
      });

      // Clear inventory available stock to prevent purchases
      await tx.inventory.updateMany({
        where: { productId },
        data: { availableQuantity: 0 },
      });
    });

    await this.auditService.logAction({
      userId,
      action: 'PRODUCT_DELETED',
      resourceType: 'Product',
      resourceId: productId,
      previousValue: { status: product.status },
      newValue: { status: ProductStatus.DELETED, deletedAt: new Date() },
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
    if (!product || product.status === ProductStatus.DELETED) {
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
      status: query.status ? query.status : { not: ProductStatus.DELETED },
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
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
          inventory: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: items.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          status: p.status,
          category: {
            id: p.category.id,
            name: p.category.name,
          },
          primaryImage: p.images[0]?.imageUrl || null,
          availableQuantity: p.inventory?.availableQuantity || 0,
          reservedQuantity: p.inventory?.reservedQuantity || 0,
          isLowStock:
            (p.inventory?.availableQuantity || 0) <= (p.inventory?.lowStockThreshold || 5) &&
            (p.inventory?.availableQuantity || 0) > 0,
          isOutOfStock: (p.inventory?.availableQuantity || 0) === 0,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
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
        inventory: true,
      },
    });

    if (!product || product.status === ProductStatus.DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to view this product');
    }

    return {
      success: true,
      data: { product },
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
      where.inventory = {
        availableQuantity: { gt: 0 },
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
          inventory: {
            select: {
              availableQuantity: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: items.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          description: p.description,
          category: p.category,
          seller: p.seller,
          primaryImage: p.images.find((img) => img.isPrimary)?.imageUrl || p.images[0]?.imageUrl || null,
          images: p.images.map((img) => img.imageUrl),
          inStock: (p.inventory?.availableQuantity || 0) > 0,
          availableQuantity: p.inventory?.availableQuantity || 0,
          createdAt: p.createdAt,
        })),
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
        inventory: {
          select: {
            availableQuantity: true,
          },
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

    return {
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          description: product.description,
          category: product.category,
          seller: product.seller,
          images: product.images,
          specifications: product.specifications,
          inStock: (product.inventory?.availableQuantity || 0) > 0,
          availableQuantity: product.inventory?.availableQuantity || 0,
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
    if (!product || product.status === ProductStatus.DELETED) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You are not authorized to modify this product');
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
    if (!product || product.status === ProductStatus.DELETED) {
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
}
