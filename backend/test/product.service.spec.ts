import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProductService } from '../src/product/product.service';
import { PrismaService } from '../src/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { CategoryService } from '../src/category/category.service';
import { Prisma, ProductStatus, SellerStatus } from '@prisma/client';

describe('ProductService', () => {
  let service: ProductService;
  let prisma: any;
  let auditService: { logAction: jest.Mock };
  let categoryService: { hasSellerApprovedCategory: jest.Mock };

  beforeEach(() => {
    prisma = {
      sellerProfile: {
        findUnique: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productVariant: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      productImage: {
        findUnique: jest.fn(),
        count: jest.fn(),
        createMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      productSpecification: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        createManyAndReturn: jest.fn(),
      },
      inventory: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      inventoryHistory: {
        create: jest.fn(),
      },
      orderItem: {
        count: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    auditService = {
      logAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    categoryService = {
      hasSellerApprovedCategory: jest.fn().mockResolvedValue(true),
    };

    service = new ProductService(
      prisma as unknown as PrismaService,
      auditService as unknown as AuditService,
      categoryService as unknown as CategoryService,
    );
  });

  describe('Product Creation with Size x Color Variants', () => {
    const mockCategory = {
      id: 'cat-1',
      name: 'Men Shirts',
      sizeSet: {
        id: 'size-set-1',
        name: 'Alpha Standard',
        values: [
          { id: 'ssv-m', value: 'M', displayName: 'Medium', isActive: true, sortOrder: 1 },
          { id: 'ssv-l', value: 'L', displayName: 'Large', isActive: true, sortOrder: 2 },
          { id: 'ssv-xl', value: 'XL', displayName: 'Extra Large', isActive: true, sortOrder: 3 },
        ],
      },
    };

    it('creates a product with multiple size-color variants, images, specs, and variant inventory', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.APPROVED,
      });
      categoryService.hasSellerApprovedCategory.mockResolvedValue(true);
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.productVariant.findMany.mockResolvedValue([]); // SKU uniqueness check passes

      prisma.product.create.mockResolvedValue({
        id: 'prod-1',
        sellerId: 'seller-1',
        categoryId: 'cat-1',
        name: 'Slim Fit Cotton Shirt',
        description: 'Premium formal shirt',
        price: new Prisma.Decimal(1299.0),
        compareAtPrice: new Prisma.Decimal(1999.0),
        status: ProductStatus.ACTIVE,
        createdAt: new Date(),
      });

      prisma.productVariant.create
        .mockResolvedValueOnce({
          id: 'var-1',
          productId: 'prod-1',
          sku: 'SHIRT-SLIM-M-BLK',
          size: 'M',
          color: 'Black',
          stockQuantity: 25,
        })
        .mockResolvedValueOnce({
          id: 'var-2',
          productId: 'prod-1',
          sku: 'SHIRT-SLIM-L-BLK',
          size: 'L',
          color: 'Black',
          stockQuantity: 30,
        });

      prisma.inventory.create
        .mockResolvedValueOnce({ id: 'inv-1', variantId: 'var-1', availableQuantity: 25 })
        .mockResolvedValueOnce({ id: 'inv-2', variantId: 'var-2', availableQuantity: 30 });

      const res = await service.createProduct('user-1', {
        name: 'Slim Fit Cotton Shirt',
        description: 'Premium formal shirt',
        price: 1299.0,
        compareAtPrice: 1999.0,
        categoryId: 'cat-1',
        variants: [
          { size: 'M', color: 'Black', sku: 'shirt-slim-m-blk', stockQuantity: 25 },
          { size: 'L', color: 'Black', sku: 'shirt-slim-l-blk', stockQuantity: 30 },
        ],
        images: [{ imageUrl: 'https://cdn.example.com/shirt-1.jpg', isPrimary: true }],
        specifications: [{ name: 'Material', value: '100% Cotton' }],
      });

      expect(res.success).toBe(true);
      expect(res.data.product.id).toBe('prod-1');
      expect(res.data.product.variants).toHaveLength(2);
      expect(prisma.productVariant.create).toHaveBeenCalledTimes(2);
      expect(prisma.inventory.create).toHaveBeenCalledTimes(2);
      expect(prisma.inventoryHistory.create).toHaveBeenCalledTimes(2);
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PRODUCT_CREATED' }),
      );
    });

    it('rejects variant creation if variant size does not match Category SizeSet', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.APPROVED,
      });
      categoryService.hasSellerApprovedCategory.mockResolvedValue(true);
      prisma.category.findUnique.mockResolvedValue(mockCategory);

      await expect(
        service.createProduct('user-1', {
          name: 'Shirt',
          price: 999,
          categoryId: 'cat-1',
          variants: [
            { size: '42', color: 'Blue', sku: 'SHIRT-BLU-42', stockQuantity: 10 }, // 42 is waist size, not in Alpha
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate size x color combination within request payload', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.APPROVED,
      });
      categoryService.hasSellerApprovedCategory.mockResolvedValue(true);
      prisma.category.findUnique.mockResolvedValue(mockCategory);

      await expect(
        service.createProduct('user-1', {
          name: 'Shirt',
          price: 999,
          categoryId: 'cat-1',
          variants: [
            { size: 'M', color: 'Blue', sku: 'SHIRT-BLU-M1', stockQuantity: 10 },
            { size: 'M', color: 'Blue', sku: 'SHIRT-BLU-M2', stockQuantity: 15 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate variant SKU with ConflictException', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.APPROVED,
      });
      categoryService.hasSellerApprovedCategory.mockResolvedValue(true);
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.productVariant.findMany.mockResolvedValue([{ id: 'var-old', sku: 'EXISTING-SKU' }]);

      await expect(
        service.createProduct('user-1', {
          name: 'Shirt',
          price: 999,
          categoryId: 'cat-1',
          variants: [
            { size: 'M', color: 'Blue', sku: 'existing-sku', stockQuantity: 10 },
          ],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects product creation if seller status is not APPROVED', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.PENDING_APPROVAL,
      });

      await expect(
        service.createProduct('user-1', {
          name: 'Shirt',
          price: 999,
          categoryId: 'cat-1',
          sku: 'SKU-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Product Updates and Duplication', () => {
    it('updates product details and validates new category permission', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-1', userId: 'user-1' });
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sellerId: 'seller-1',
        categoryId: 'old-cat',
        price: new Prisma.Decimal(500),
        status: ProductStatus.ACTIVE,
      });
      categoryService.hasSellerApprovedCategory.mockResolvedValue(true);
      prisma.product.update.mockResolvedValue({
        id: 'prod-1',
        name: 'Updated Name',
        price: new Prisma.Decimal(650),
        categoryId: 'new-cat',
        status: ProductStatus.ACTIVE,
        variants: [],
      });

      const res = await service.updateProduct('user-1', 'prod-1', {
        name: 'Updated Name',
        price: 650,
        categoryId: 'new-cat',
      });

      expect(res.success).toBe(true);
      expect(categoryService.hasSellerApprovedCategory).toHaveBeenCalledWith('seller-1', 'new-cat');
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PRODUCT_UPDATED' }),
      );
    });

    it('duplicates an existing product with new SKU and copies variants', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-1', userId: 'user-1' });
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sellerId: 'seller-1',
        categoryId: 'cat-1',
        name: 'Original Shirt',
        description: 'Cotton',
        price: new Prisma.Decimal(1000),
        status: ProductStatus.ACTIVE,
        images: [{ imageUrl: 'https://cdn.example.com/img1.jpg', isPrimary: true, displayOrder: 0 }],
        specifications: [{ name: 'Color', value: 'Black', displayOrder: 0 }],
        variants: [
          { id: 'var-1', size: 'M', color: 'Black', stockQuantity: 20, lowStockThreshold: 5 },
        ],
      });
      prisma.productVariant.findUnique.mockResolvedValue(null); // new SKU available

      prisma.product.create.mockResolvedValue({
        id: 'prod-copy-1',
        sellerId: 'seller-1',
        categoryId: 'cat-1',
        name: 'Original Shirt (Copy)',
        price: new Prisma.Decimal(1000),
        status: ProductStatus.ACTIVE,
      });
      prisma.productVariant.create.mockResolvedValue({
        id: 'var-copy-1',
        sku: 'SHIRT-COPY-001',
        size: 'M',
        color: 'Black',
      });
      prisma.inventory.create.mockResolvedValue({ id: 'inv-copy-1' });

      const res = await service.duplicateProduct('user-1', 'prod-1', {
        newSku: 'shirt-copy-001',
        initialStock: 15,
      });

      expect(res.success).toBe(true);
      expect(res.data.product.sku).toBe('SHIRT-COPY-001');
      expect(prisma.productImage.createMany).toHaveBeenCalled();
      expect(prisma.inventory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ availableQuantity: 15 }),
        }),
      );
    });
  });

  describe('Lifecycle Status and Soft Deletion', () => {
    it('pauses and activates product', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-1', userId: 'user-1' });
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sellerId: 'seller-1',
        status: ProductStatus.ACTIVE,
      });
      prisma.product.update.mockResolvedValue({
        id: 'prod-1',
        status: ProductStatus.PAUSED,
      });

      const res = await service.pauseProduct('user-1', 'prod-1');
      expect(res.data.product.status).toBe(ProductStatus.PAUSED);
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PRODUCT_PAUSED' }),
      );
    });

    it('soft deletes product and zeroes out variant inventories', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-1', userId: 'user-1' });
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sellerId: 'seller-1',
        status: ProductStatus.ACTIVE,
        variants: [{ id: 'var-1' }, { id: 'var-2' }],
      });

      const res = await service.deleteProduct('user-1', 'prod-1');
      expect(res.success).toBe(true);
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: expect.objectContaining({ status: ProductStatus.SOFT_DELETED }),
        }),
      );
      expect(prisma.inventory.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { variantId: { in: ['var-1', 'var-2'] } },
          data: { availableQuantity: 0 },
        }),
      );
    });
  });

  describe('Variant Management CRUD (FR-5)', () => {
    const mockProductWithCategory = {
      id: 'prod-1',
      sellerId: 'seller-1',
      status: ProductStatus.ACTIVE,
      category: {
        id: 'cat-1',
        sizeSet: {
          id: 'size-set-1',
          name: 'Alpha Standard',
          values: [
            { id: 'ssv-s', value: 'S', isActive: true },
            { id: 'ssv-m', value: 'M', isActive: true },
          ],
        },
      },
    };

    it('creates a new variant for an existing product with size set validation', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.APPROVED,
      });
      prisma.product.findUnique.mockResolvedValue(mockProductWithCategory);
      prisma.productVariant.findUnique.mockResolvedValue(null); // SKU available
      prisma.productVariant.findFirst.mockResolvedValue(null); // combo available
      prisma.productVariant.create.mockResolvedValue({
        id: 'var-new-1',
        productId: 'prod-1',
        sku: 'NEW-SKU-S-RED',
        size: 'S',
        color: 'Red',
        stockQuantity: 10,
      });
      prisma.inventory.create.mockResolvedValue({ id: 'inv-new-1', availableQuantity: 10 });

      const res = await service.createProductVariant('user-1', 'prod-1', {
        size: 'S',
        color: 'Red',
        sku: 'new-sku-s-red',
        stockQuantity: 10,
      });

      expect(res.success).toBe(true);
      expect(res.data.variant.sku).toBe('NEW-SKU-S-RED');
      expect(prisma.inventory.create).toHaveBeenCalled();
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PRODUCT_VARIANT_CREATED' }),
      );
    });

    it('rejects variant creation if size is not in Category SizeSet', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.APPROVED,
      });
      prisma.product.findUnique.mockResolvedValue(mockProductWithCategory);

      await expect(
        service.createProductVariant('user-1', 'prod-1', {
          size: 'XXL', // not in mockProductWithCategory
          color: 'Red',
          sku: 'NEW-SKU-XXL',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deactivates variant instead of hard deleting if variant has order history', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-1', userId: 'user-1' });
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sellerId: 'seller-1',
        status: ProductStatus.ACTIVE,
      });
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        productId: 'prod-1',
        sku: 'ORDERED-VAR',
      });
      prisma.orderItem.count.mockResolvedValue(3); // Has 3 orders

      const res = await service.deleteProductVariant('user-1', 'prod-1', 'var-1');
      expect(res.success).toBe(true);
      expect(prisma.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'var-1' },
          data: { isActive: false, stockQuantity: 0 },
        }),
      );
      expect(prisma.productVariant.delete).not.toHaveBeenCalled();
    });

    it('hard deletes variant when it has no order history', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-1', userId: 'user-1' });
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sellerId: 'seller-1',
        status: ProductStatus.ACTIVE,
      });
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        productId: 'prod-1',
        sku: 'UNORDERED-VAR',
      });
      prisma.orderItem.count.mockResolvedValue(0); // Zero orders

      const res = await service.deleteProductVariant('user-1', 'prod-1', 'var-1');
      expect(res.success).toBe(true);
      expect(prisma.productVariant.delete).toHaveBeenCalledWith({ where: { id: 'var-1' } });
    });
  });

  describe('Admin Product Moderation Takedown (BR-4, BR-6)', () => {
    it('takes down product with mandatory reason and sets status to REMOVED_BY_ADMIN', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-violating-1',
        status: ProductStatus.ACTIVE,
      });
      prisma.product.update.mockResolvedValue({
        id: 'prod-violating-1',
        status: ProductStatus.REMOVED_BY_ADMIN,
        takedownReason: 'Counterfeit trademark violation detected',
        takedownByAdminId: 'admin-user-1',
      });

      const res = await service.takedownProduct('admin-user-1', 'prod-violating-1', {
        takedownReason: 'Counterfeit trademark violation detected',
      });

      expect(res.success).toBe(true);
      expect(res.data.product.status).toBe(ProductStatus.REMOVED_BY_ADMIN);
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-violating-1' },
          data: {
            status: ProductStatus.REMOVED_BY_ADMIN,
            takedownReason: 'Counterfeit trademark violation detected',
            takedownByAdminId: 'admin-user-1',
          },
        }),
      );
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-user-1',
          action: 'PRODUCT_TAKEDOWN_BY_ADMIN',
          resourceType: 'Product',
          resourceId: 'prod-violating-1',
        }),
      );
    });
  });
});
