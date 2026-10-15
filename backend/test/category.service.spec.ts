import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CategoryService, DEFAULT_SIZE_SETS } from '../src/category/category.service';
import { PrismaService } from '../src/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { CommissionStatus, Prisma, ProductStatus, SellerCategoryStatus, SellerStatus } from '@prisma/client';

describe('CategoryService', () => {
  let service: CategoryService;
  let prisma: any;
  let auditService: { logAction: jest.Mock; getResourceAuditLogs: jest.Mock };

  beforeEach(() => {
    prisma = {
      category: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      categoryCommission: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      sellerProfile: {
        findUnique: jest.fn(),
      },
      sellerCategory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      sizeSet: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      sizeSetValue: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      product: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    auditService = {
      logAction: jest.fn().mockResolvedValue({ id: 'audit-log-id' }),
      getResourceAuditLogs: jest.fn().mockResolvedValue([]),
    };

    service = new CategoryService(
      prisma as unknown as PrismaService,
      auditService as unknown as AuditService,
    );
  });

  describe('Size Set Governance (FR-3)', () => {
    it('creates a new size set with initial values', async () => {
      prisma.sizeSet.findFirst.mockResolvedValue(null);
      prisma.sizeSet.create.mockResolvedValue({
        id: 'size-set-1',
        name: 'Alpha Standard',
        code: 'ALPHA_STD',
        description: 'Alpha standard sizing',
        isActive: true,
        values: [
          { id: 'v-1', value: 'S', displayName: 'Small', sortOrder: 1 },
          { id: 'v-2', value: 'M', displayName: 'Medium', sortOrder: 2 },
        ],
      });

      const res = await service.createSizeSet('admin-1', {
        name: 'Alpha Standard',
        code: 'ALPHA_STD',
        description: 'Alpha standard sizing',
        values: [
          { value: 'S', displayName: 'Small', sortOrder: 1 },
          { value: 'M', displayName: 'Medium', sortOrder: 2 },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.data.sizeSet.code).toBe('ALPHA_STD');
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SIZE_SET_CREATED' }),
      );
    });

    it('rejects duplicate size set name or code with ConflictException', async () => {
      prisma.sizeSet.findFirst.mockResolvedValue({ id: 'existing-set', name: 'Alpha Standard', code: 'ALPHA_STD' });

      await expect(
        service.createSizeSet('admin-1', {
          name: 'Alpha Standard',
          code: 'ALPHA_STD',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('lists size sets filtered by active status', async () => {
      prisma.sizeSet.findMany.mockResolvedValue([
        { id: 'ss-1', name: 'Alpha Standard', code: 'ALPHA_STD', isActive: true, values: [] },
      ]);

      const res = await service.listSizeSets({ includeInactive: false });
      expect(res.success).toBe(true);
      expect(res.data.sizeSets).toHaveLength(1);
      expect(prisma.sizeSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('retrieves a size set by ID with sorted values', async () => {
      prisma.sizeSet.findUnique.mockResolvedValue({
        id: 'ss-1',
        name: 'Alpha Standard',
        values: [{ value: 'S', sortOrder: 1 }],
      });

      const res = await service.getSizeSetById('ss-1');
      expect(res.success).toBe(true);
      expect(res.data.sizeSet.name).toBe('Alpha Standard');
    });

    it('throws NotFoundException when retrieving non-existent size set', async () => {
      prisma.sizeSet.findUnique.mockResolvedValue(null);

      await expect(service.getSizeSetById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('updates size set details and records audit log', async () => {
      prisma.sizeSet.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === 'ss-1') {
          return Promise.resolve({ id: 'ss-1', name: 'Old Name', isActive: true });
        }
        return Promise.resolve(null);
      });
      prisma.sizeSet.update.mockResolvedValue({ id: 'ss-1', name: 'New Name', isActive: false });

      const res = await service.updateSizeSet('admin-1', 'ss-1', {
        name: 'New Name',
        isActive: false,
      });

      expect(res.success).toBe(true);
      expect(res.data.sizeSet.isActive).toBe(false);
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SIZE_SET_UPDATED' }),
      );
    });

    it('adds a new size value to an existing size set', async () => {
      prisma.sizeSet.findUnique.mockResolvedValue({ id: 'ss-1', name: 'Alpha' });
      prisma.sizeSetValue.findUnique.mockResolvedValue(null);
      prisma.sizeSetValue.create.mockResolvedValue({
        id: 'val-1',
        sizeSetId: 'ss-1',
        value: 'XL',
        displayName: 'Extra Large',
        sortOrder: 4,
      });

      const res = await service.addSizeSetValue('admin-1', 'ss-1', {
        value: 'XL',
        displayName: 'Extra Large',
        sortOrder: 4,
      });

      expect(res.success).toBe(true);
      expect(res.data.value.value).toBe('XL');
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SIZE_SET_VALUE_ADDED' }),
      );
    });

    it('rejects adding duplicate size value to same size set', async () => {
      prisma.sizeSet.findUnique.mockResolvedValue({ id: 'ss-1', name: 'Alpha' });
      prisma.sizeSetValue.findUnique.mockResolvedValue({ id: 'existing-val', value: 'M' });

      await expect(
        service.addSizeSetValue('admin-1', 'ss-1', { value: 'M' }),
      ).rejects.toThrow(ConflictException);
    });

    it('seeds default size sets idempotently', async () => {
      prisma.sizeSet.findUnique.mockResolvedValue(null);
      prisma.sizeSet.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: `ss-${data.code}`, ...data }),
      );

      const seeded = await service.seedDefaultSizeSets();
      expect(seeded.length).toBe(DEFAULT_SIZE_SETS.length);
    });
  });

  describe('Category Hierarchy & Subcategory SizeSet Binding', () => {
    it('creates a top-level category with initial commission rate and no sizeSet required', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue({
        id: 'cat-1',
        name: 'Men Clothing',
        slug: 'mens-clothing',
        parentCategoryId: null,
        sizeSetId: null,
      });

      const res = await service.createCategory('admin-1', {
        name: 'Men Clothing',
        slug: 'mens-clothing',
        description: 'All apparel for men',
        initialCommissionRate: 10.0,
      });

      expect(res.success).toBe(true);
      expect(res.data.category.id).toBe('cat-1');
      expect(prisma.categoryCommission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            categoryId: 'cat-1',
            commissionRate: new Prisma.Decimal(10.0),
            status: CommissionStatus.ACTIVE,
          }),
        }),
      );
    });

    it('rejects subcategory creation when sizeSetId is omitted', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce({ id: 'parent-cat-id', name: 'Men Clothing' }); // parent category check

      await expect(
        service.createCategory('admin-1', {
          name: 'Shirts',
          slug: 'mens-shirts',
          parentCategoryId: 'parent-cat-id',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects subcategory creation when sizeSetId does not exist', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce({ id: 'parent-cat-id', name: 'Men Clothing' }); // parent check
      prisma.sizeSet.findUnique.mockResolvedValue(null); // sizeSet check

      await expect(
        service.createCategory('admin-1', {
          name: 'Shirts',
          slug: 'mens-shirts',
          parentCategoryId: 'parent-cat-id',
          sizeSetId: 'non-existent-size-set',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a subcategory when valid parentCategoryId and sizeSetId are provided', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce({ id: 'parent-cat-id', name: 'Men Clothing' }); // parent check
      prisma.sizeSet.findUnique.mockResolvedValue({ id: 'size-set-alpha', name: 'Alpha Standard' });

      prisma.category.create.mockResolvedValue({
        id: 'subcat-1',
        name: 'Shirts',
        slug: 'mens-shirts',
        parentCategoryId: 'parent-cat-id',
        sizeSetId: 'size-set-alpha',
      });

      const res = await service.createCategory('admin-1', {
        name: 'Shirts',
        slug: 'mens-shirts',
        parentCategoryId: 'parent-cat-id',
        sizeSetId: 'size-set-alpha',
      });

      expect(res.success).toBe(true);
      expect(res.data.category.parentCategoryId).toBe('parent-cat-id');
      expect(res.data.category.sizeSetId).toBe('size-set-alpha');
    });

    it('rejects category creation with duplicate slug', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'existing-cat', slug: 'jeans' });

      await expect(
        service.createCategory('admin-1', {
          name: 'Jeans',
          slug: 'jeans',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('deactivates category and records audit log', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', isActive: true });
      prisma.category.update.mockResolvedValue({ id: 'cat-1', isActive: false });

      const res = await service.deactivateCategory('admin-1', 'cat-1');
      expect(res.data.category.isActive).toBe(false);
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CATEGORY_DEACTIVATED' }),
      );
    });
  });

  describe('Commission Configuration & History', () => {
    it('updates commission by expiring previous active record and creating new active record', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      prisma.categoryCommission.findFirst.mockResolvedValue({
        id: 'comm-1',
        commissionRate: new Prisma.Decimal(10.0),
        status: CommissionStatus.ACTIVE,
      });
      prisma.categoryCommission.create.mockResolvedValue({
        id: 'comm-2',
        categoryId: 'cat-1',
        commissionRate: new Prisma.Decimal(15.0),
        status: CommissionStatus.ACTIVE,
        effectiveFrom: new Date(),
      });

      const res = await service.configureCommission('admin-1', 'cat-1', {
        commissionRate: 15.0,
      });

      expect(res.success).toBe(true);
      expect(prisma.categoryCommission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comm-1' },
          data: expect.objectContaining({ status: CommissionStatus.EXPIRED }),
        }),
      );
      expect(prisma.categoryCommission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            categoryId: 'cat-1',
            commissionRate: new Prisma.Decimal(15.0),
            status: CommissionStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  describe('Seller Category Requests & Super Admin Reviews (SRS Section 8.8)', () => {
    it('submits requests in REQUESTED status for multiple categories', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.APPROVED,
      });
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: 'cat-1', isActive: true })
        .mockResolvedValueOnce({ id: 'cat-2', isActive: true });
      prisma.sellerCategory.findUnique.mockResolvedValue(null);
      prisma.sellerCategory.create
        .mockResolvedValueOnce({ id: 'sc-1', sellerId: 'seller-1', categoryId: 'cat-1', status: SellerCategoryStatus.REQUESTED })
        .mockResolvedValueOnce({ id: 'sc-2', sellerId: 'seller-1', categoryId: 'cat-2', status: SellerCategoryStatus.REQUESTED });

      const res = await service.requestCategories('user-1', {
        categoryIds: ['cat-1', 'cat-2'],
      });

      expect(res.success).toBe(true);
      expect(res.data.requests).toHaveLength(2);
      expect(prisma.sellerCategory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: SellerCategoryStatus.REQUESTED }),
        }),
      );
    });

    it('approves a category request in REQUESTED status for an approved seller', async () => {
      prisma.sellerCategory.findUnique.mockResolvedValue({
        id: 'sc-1',
        sellerId: 'seller-1',
        categoryId: 'cat-1',
        status: SellerCategoryStatus.REQUESTED,
        seller: { id: 'seller-1', status: SellerStatus.APPROVED },
      });
      prisma.sellerCategory.update.mockResolvedValue({
        id: 'sc-1',
        status: SellerCategoryStatus.APPROVED,
        reviewedById: 'admin-1',
      });

      const res = await service.approveCategoryRequest('admin-1', 'sc-1');
      expect(res.data.request.status).toBe(SellerCategoryStatus.APPROVED);
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SELLER_CATEGORY_APPROVED' }),
      );
    });

    it('rejects approving category request if seller is unapproved', async () => {
      prisma.sellerCategory.findUnique.mockResolvedValue({
        id: 'sc-1',
        seller: { id: 'seller-1', status: SellerStatus.PENDING_APPROVAL },
      });

      await expect(service.approveCategoryRequest('admin-1', 'sc-1')).rejects.toThrow(BadRequestException);
    });

    it('revokes seller category and moves active listings to REMOVED_BY_ADMIN', async () => {
      prisma.sellerCategory.findUnique.mockResolvedValue({
        id: 'sc-1',
        sellerId: 'seller-1',
        categoryId: 'cat-1',
        status: SellerCategoryStatus.APPROVED,
      });
      prisma.sellerCategory.update.mockResolvedValue({
        id: 'sc-1',
        status: SellerCategoryStatus.REVOKED,
      });

      const res = await service.revokeSellerCategory('admin-1', 'seller-1', 'cat-1', {
        revocationReason: 'Counterfeit policy violation',
      });

      expect(res.data.permission.status).toBe(SellerCategoryStatus.REVOKED);
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: {
          sellerId: 'seller-1',
          categoryId: 'cat-1',
          status: ProductStatus.ACTIVE,
        },
        data: {
          status: ProductStatus.REMOVED_BY_ADMIN,
        },
      });
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SELLER_CATEGORY_REVOKED',
          newValue: expect.objectContaining({
            status: SellerCategoryStatus.REVOKED,
            revocationReason: 'Counterfeit policy violation',
          }),
        }),
      );
    });

    it('checks whether a seller has approved permission for a category', async () => {
      prisma.sellerCategory.findUnique.mockResolvedValueOnce({
        status: SellerCategoryStatus.APPROVED,
      });
      const hasPermission = await service.hasSellerApprovedCategory('seller-1', 'cat-1');
      expect(hasPermission).toBe(true);

      prisma.sellerCategory.findUnique.mockResolvedValueOnce({
        status: SellerCategoryStatus.REVOKED,
      });
      const hasRevokedPermission = await service.hasSellerApprovedCategory('seller-1', 'cat-1');
      expect(hasRevokedPermission).toBe(false);
    });
  });
});
