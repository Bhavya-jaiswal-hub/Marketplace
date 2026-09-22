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
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
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
        updateMany: jest.fn(),
      },
      inventoryHistory: {
        create: jest.fn(),
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

  describe('Product Creation', () => {
    it('creates a product with SKU, images, specs, and initial stock for an approved seller', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.APPROVED,
      });
      categoryService.hasSellerApprovedCategory.mockResolvedValue(true);
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({
        id: 'prod-1',
        sellerId: 'seller-1',
        categoryId: 'cat-1',
        name: 'Wireless Bluetooth Earbuds',
        sku: 'EAR-BT-001',
        price: new Prisma.Decimal(2499.0),
        status: ProductStatus.ACTIVE,
        createdAt: new Date(),
      });
      prisma.inventory.create.mockResolvedValue({ id: 'inv-1' });

      const res = await service.createProduct('user-1', {
        name: 'Wireless Bluetooth Earbuds',
        sku: 'ear-bt-001',
        price: 2499.0,
        categoryId: 'cat-1',
        initialStock: 50,
        lowStockThreshold: 5,
        images: [{ imageUrl: 'https://cdn.example.com/earbuds-1.jpg', isPrimary: true }],
        specifications: [{ name: 'Battery Life', value: '30 Hours' }],
      });

      expect(res.success).toBe(true);
      expect(res.data.product.id).toBe('prod-1');
      expect(res.data.product.sku).toBe('EAR-BT-001');
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sku: 'EAR-BT-001',
            price: new Prisma.Decimal(2499.0),
          }),
        }),
      );
      expect(prisma.inventory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'prod-1',
            availableQuantity: 50,
          }),
        }),
      );
      expect(prisma.inventoryHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantityChange: 50,
          }),
        }),
      );
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PRODUCT_CREATED' }),
      );
    });

    it('rejects product creation if seller status is PENDING or REJECTED', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.PENDING,
      });

      await expect(
        service.createProduct('user-1', {
          name: 'Item',
          sku: 'SKU-1',
          price: 100,
          categoryId: 'cat-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects product creation if seller does not have approved category permission', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.APPROVED,
      });
      categoryService.hasSellerApprovedCategory.mockResolvedValue(false);

      await expect(
        service.createProduct('user-1', {
          name: 'Item',
          sku: 'SKU-1',
          price: 100,
          categoryId: 'unapproved-cat',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects duplicate SKU with 409 Conflict', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.APPROVED,
      });
      categoryService.hasSellerApprovedCategory.mockResolvedValue(true);
      prisma.product.findUnique.mockResolvedValue({ id: 'existing-prod', sku: 'SKU-DUP' });

      await expect(
        service.createProduct('user-1', {
          name: 'Item',
          sku: 'sku-dup',
          price: 100,
          categoryId: 'cat-1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Product Updates and Duplication', () => {
    it('updates product and validates new category permission', async () => {
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

    it('duplicates an existing product with new SKU and copies images/specs', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-1', userId: 'user-1' });
      prisma.product.findUnique
        .mockResolvedValueOnce({
          id: 'prod-1',
          sellerId: 'seller-1',
          categoryId: 'cat-1',
          name: 'Original Product',
          description: 'Great product',
          sku: 'ORIG-001',
          price: new Prisma.Decimal(1000),
          status: ProductStatus.ACTIVE,
          images: [{ imageUrl: 'https://cdn.example.com/img1.jpg', isPrimary: true, displayOrder: 0 }],
          specifications: [{ name: 'Color', value: 'Black', displayOrder: 0 }],
          inventory: { lowStockThreshold: 5 },
        })
        .mockResolvedValueOnce(null); // sku uniqueness check

      prisma.product.create.mockResolvedValue({
        id: 'prod-copy-1',
        sellerId: 'seller-1',
        categoryId: 'cat-1',
        name: 'Original Product (Copy)',
        sku: 'ORIG-002',
        price: new Prisma.Decimal(1000),
        status: ProductStatus.ACTIVE,
      });
      prisma.inventory.create.mockResolvedValue({ id: 'inv-2' });

      const res = await service.duplicateProduct('user-1', 'prod-1', {
        newSku: 'orig-002',
        initialStock: 20,
      });

      expect(res.success).toBe(true);
      expect(res.data.product.sku).toBe('ORIG-002');
      expect(prisma.productImage.createMany).toHaveBeenCalled();
      expect(prisma.productSpecification.createMany).toHaveBeenCalled();
      expect(prisma.inventory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ availableQuantity: 20 }),
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

    it('soft deletes product and zeros out inventory stock', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-1', userId: 'user-1' });
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sellerId: 'seller-1',
        status: ProductStatus.ACTIVE,
      });

      const res = await service.deleteProduct('user-1', 'prod-1');
      expect(res.success).toBe(true);
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: expect.objectContaining({ status: ProductStatus.DELETED }),
        }),
      );
      expect(prisma.inventory.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'prod-1' },
          data: { availableQuantity: 0 },
        }),
      );
    });
  });
});
