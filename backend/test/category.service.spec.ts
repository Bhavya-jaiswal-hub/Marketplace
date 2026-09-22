import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CategoryService } from '../src/category/category.service';
import { PrismaService } from '../src/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { CommissionStatus, Prisma, SellerCategoryStatus, SellerStatus } from '@prisma/client';

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

  describe('Category Hierarchy & Management', () => {
    it('creates a top-level category with initial commission rate', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue({
        id: 'cat-1',
        name: 'Electronics',
        slug: 'electronics',
        parentCategoryId: null,
      });

      const res = await service.createCategory('admin-1', {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic gadgets and devices',
        initialCommissionRate: 8.5,
      });

      expect(res.success).toBe(true);
      expect(res.data.category.id).toBe('cat-1');
      expect(prisma.categoryCommission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            categoryId: 'cat-1',
            commissionRate: new Prisma.Decimal(8.5),
            status: CommissionStatus.ACTIVE,
          }),
        }),
      );
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CATEGORY_CREATED' }),
      );
    });

    it('rejects category creation with duplicate slug', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'existing-cat', slug: 'shoes' });

      await expect(
        service.createCategory('admin-1', {
          name: 'Shoes',
          slug: 'shoes',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a subcategory under a valid parent category', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce({ id: 'parent-cat-id', name: 'Clothing' }); // parent category check

      prisma.category.create.mockResolvedValue({
        id: 'subcat-1',
        name: 'Men Shoes',
        slug: 'men-shoes',
        parentCategoryId: 'parent-cat-id',
      });

      const res = await service.createCategory('admin-1', {
        name: 'Men Shoes',
        slug: 'men-shoes',
        parentCategoryId: 'parent-cat-id',
      });

      expect(res.data.category.parentCategoryId).toBe('parent-cat-id');
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
    it('updates commission by expiring the previous active commission and creating a new active record', async () => {
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
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'COMMISSION_CONFIGURED',
          previousValue: { id: 'comm-1', rate: 10 },
          newValue: expect.objectContaining({ id: 'comm-2', rate: 15 }),
        }),
      );
    });
  });

  describe('Seller Category Requests & Super Admin Reviews', () => {
    it('submits requests for multiple categories independently', async () => {
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
        .mockResolvedValueOnce({ id: 'sc-1', sellerId: 'seller-1', categoryId: 'cat-1', status: 'PENDING' })
        .mockResolvedValueOnce({ id: 'sc-2', sellerId: 'seller-1', categoryId: 'cat-2', status: 'PENDING' });

      const res = await service.requestCategories('user-1', {
        categoryIds: ['cat-1', 'cat-2'],
      });

      expect(res.success).toBe(true);
      expect(res.data.requests).toHaveLength(2);
    });

    it('approves a category request only for an approved seller', async () => {
      prisma.sellerCategory.findUnique.mockResolvedValue({
        id: 'sc-1',
        sellerId: 'seller-1',
        categoryId: 'cat-1',
        status: SellerCategoryStatus.PENDING,
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
        seller: { id: 'seller-1', status: SellerStatus.PENDING },
      });

      await expect(service.approveCategoryRequest('admin-1', 'sc-1')).rejects.toThrow(BadRequestException);
    });

    it('revokes seller category permission with revocation reason', async () => {
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
        revocationReason: 'Policy violation for counterfeit listing',
      });

      expect(res.data.permission.status).toBe(SellerCategoryStatus.REVOKED);
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SELLER_CATEGORY_REVOKED',
          newValue: expect.objectContaining({
            status: SellerCategoryStatus.REVOKED,
            revocationReason: 'Policy violation for counterfeit listing',
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
