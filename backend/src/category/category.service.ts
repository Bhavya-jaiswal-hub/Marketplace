import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AssignCategoryDto,
  CategoryRequestDto,
  CategoryRequestQueryDto,
  ConfigureCommissionDto,
  CreateCategoryDto,
  RejectCategoryRequestDto,
  RevokeCategoryDto,
  UpdateCategoryDto,
} from './dto';
import { CommissionStatus, Prisma, SellerCategoryStatus, SellerStatus } from '@prisma/client';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ================= PUBLIC CATEGORY BROWSING =================

  async listCategories(publicOnly = true): Promise<any> {
    const where: Prisma.CategoryWhereInput = {
      parentCategoryId: null,
    };
    if (publicOnly) {
      where.isActive = true;
    }

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        subcategories: {
          where: publicOnly ? { isActive: true } : undefined,
          orderBy: { name: 'asc' },
        },
      },
    });

    return {
      success: true,
      data: { categories },
      message: 'Categories retrieved successfully',
    };
  }

  async getCategoryById(categoryId: string): Promise<any> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        parentCategory: true,
        subcategories: true,
        commissions: {
          where: { status: CommissionStatus.ACTIVE },
          take: 1,
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return {
      success: true,
      data: { category },
      message: 'Category retrieved successfully',
    };
  }

  // ================= SUPER ADMIN CATEGORY MANAGEMENT =================

  async createCategory(adminUserId: string, dto: CreateCategoryDto): Promise<any> {
    const existingSlug = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
    if (existingSlug) {
      throw new ConflictException(`Category with slug '${dto.slug}' already exists`);
    }

    if (dto.parentCategoryId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentCategoryId } });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const category = await this.prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: {
          name: dto.name.trim(),
          slug: dto.slug.trim().toLowerCase(),
          description: dto.description?.trim() || null,
          parentCategoryId: dto.parentCategoryId || null,
          createdById: adminUserId,
          isActive: true,
        },
      });

      if (dto.initialCommissionRate !== undefined) {
        await tx.categoryCommission.create({
          data: {
            categoryId: created.id,
            commissionRate: new Prisma.Decimal(dto.initialCommissionRate),
            effectiveFrom: new Date(),
            status: CommissionStatus.ACTIVE,
            createdById: adminUserId,
          },
        });
      }

      return created;
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'CATEGORY_CREATED',
      resourceType: 'Category',
      resourceId: category.id,
      newValue: {
        name: category.name,
        slug: category.slug,
        parentCategoryId: category.parentCategoryId,
        initialCommissionRate: dto.initialCommissionRate,
      },
    });

    return {
      success: true,
      data: { category },
      message: 'Category created successfully',
    };
  }

  async updateCategory(adminUserId: string, categoryId: string, dto: UpdateCategoryDto): Promise<any> {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.slug && dto.slug !== category.slug) {
      const existingSlug = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
      if (existingSlug) {
        throw new ConflictException(`Category with slug '${dto.slug}' already exists`);
      }
    }

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: dto.name?.trim() ?? category.name,
        slug: dto.slug?.trim().toLowerCase() ?? category.slug,
        description: dto.description !== undefined ? dto.description?.trim() : category.description,
        isActive: dto.isActive !== undefined ? dto.isActive : category.isActive,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'CATEGORY_UPDATED',
      resourceType: 'Category',
      resourceId: categoryId,
      previousValue: {
        name: category.name,
        slug: category.slug,
        isActive: category.isActive,
      },
      newValue: {
        name: updated.name,
        slug: updated.slug,
        isActive: updated.isActive,
      },
    });

    return {
      success: true,
      data: { category: updated },
      message: 'Category updated successfully',
    };
  }

  async deactivateCategory(adminUserId: string, categoryId: string): Promise<any> {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: { isActive: false },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'CATEGORY_DEACTIVATED',
      resourceType: 'Category',
      resourceId: categoryId,
      previousValue: { isActive: true },
      newValue: { isActive: false },
    });

    return {
      success: true,
      data: { category: updated },
      message: 'Category deactivated successfully',
    };
  }

  // ================= CATEGORY COMMISSION MANAGEMENT =================

  async getCommission(categoryId: string): Promise<any> {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const commissions = await this.prisma.categoryCommission.findMany({
      where: { categoryId },
      orderBy: { effectiveFrom: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    const currentCommission = commissions.find((c) => c.status === CommissionStatus.ACTIVE) || null;

    return {
      success: true,
      data: {
        categoryId,
        currentCommission,
        commissionHistory: commissions,
      },
      message: 'Category commission details retrieved successfully',
    };
  }

  async configureCommission(adminUserId: string, categoryId: string, dto: ConfigureCommissionDto): Promise<any> {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const effectiveFromDate = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // Find active commission
      const activeCommission = await tx.categoryCommission.findFirst({
        where: {
          categoryId,
          status: CommissionStatus.ACTIVE,
        },
      });

      if (activeCommission) {
        await tx.categoryCommission.update({
          where: { id: activeCommission.id },
          data: {
            effectiveTo: effectiveFromDate,
            status: CommissionStatus.EXPIRED,
          },
        });
      }

      const newCommission = await tx.categoryCommission.create({
        data: {
          categoryId,
          commissionRate: new Prisma.Decimal(dto.commissionRate),
          effectiveFrom: effectiveFromDate,
          status: CommissionStatus.ACTIVE,
          createdById: adminUserId,
        },
      });

      return { activeCommission, newCommission };
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'COMMISSION_CONFIGURED',
      resourceType: 'CategoryCommission',
      resourceId: result.newCommission.id,
      previousValue: result.activeCommission
        ? {
            id: result.activeCommission.id,
            rate: result.activeCommission.commissionRate.toNumber(),
          }
        : null,
      newValue: {
        id: result.newCommission.id,
        rate: result.newCommission.commissionRate.toNumber(),
        effectiveFrom: result.newCommission.effectiveFrom,
      },
    });

    return {
      success: true,
      data: {
        commission: result.newCommission,
      },
      message: 'Category commission updated successfully',
    };
  }

  // ================= SELLER CATEGORY WORKFLOWS =================

  async getAvailableCategories(userId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        sellerCategories: true,
      },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const categoryMap = new Map(seller.sellerCategories.map((sc) => [sc.categoryId, sc]));

    const available = categories.map((cat) => {
      const permission = categoryMap.get(cat.id);
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        parentCategoryId: cat.parentCategoryId,
        sellerStatus: permission ? permission.status : 'NOT_REQUESTED',
        sellerCategoryId: permission ? permission.id : null,
      };
    });

    return {
      success: true,
      data: { categories: available },
      message: 'Available categories retrieved successfully',
    };
  }

  async requestCategories(userId: string, dto: CategoryRequestDto): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    if (seller.status === SellerStatus.BLOCKED) {
      throw new ForbiddenException('Blocked sellers cannot request categories');
    }

    const requestedResults: any[] = [];

    for (const categoryId of dto.categoryIds) {
      const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!category || !category.isActive) {
        throw new BadRequestException(`Category with ID ${categoryId} is not active or does not exist`);
      }

      const existing = await this.prisma.sellerCategory.findUnique({
        where: {
          sellerId_categoryId: {
            sellerId: seller.id,
            categoryId,
          },
        },
      });

      if (existing) {
        if (existing.status === SellerCategoryStatus.APPROVED) {
          requestedResults.push({ categoryId, status: existing.status, note: 'Already approved' });
          continue;
        }
        if (existing.status === SellerCategoryStatus.PENDING) {
          requestedResults.push({ categoryId, status: existing.status, note: 'Already pending review' });
          continue;
        }
        // Resubmitting previously rejected or revoked request
        const updated = await this.prisma.sellerCategory.update({
          where: { id: existing.id },
          data: {
            status: SellerCategoryStatus.PENDING,
            requestedAt: new Date(),
            reviewedAt: null,
            reviewedById: null,
            rejectionReason: null,
            revokedAt: null,
            revocationReason: null,
          },
        });
        requestedResults.push(updated);
      } else {
        const created = await this.prisma.sellerCategory.create({
          data: {
            sellerId: seller.id,
            categoryId,
            status: SellerCategoryStatus.PENDING,
          },
        });
        requestedResults.push(created);
      }
    }

    await this.auditService.logAction({
      userId,
      action: 'SELLER_CATEGORIES_REQUESTED',
      resourceType: 'SellerCategory',
      resourceId: seller.id,
      newValue: { categoryIds: dto.categoryIds },
    });

    return {
      success: true,
      data: { requests: requestedResults },
      message: 'Category request(s) submitted successfully',
    };
  }

  async getOwnCategoryRequests(userId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const requests = await this.prisma.sellerCategory.findMany({
      where: { sellerId: seller.id },
      orderBy: { requestedAt: 'desc' },
      include: {
        category: true,
      },
    });

    return {
      success: true,
      data: { requests },
      message: 'Category requests retrieved successfully',
    };
  }

  async getOwnApprovedCategories(userId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const categories = await this.prisma.sellerCategory.findMany({
      where: {
        sellerId: seller.id,
        status: SellerCategoryStatus.APPROVED,
      },
      include: {
        category: {
          include: {
            commissions: {
              where: { status: CommissionStatus.ACTIVE },
              take: 1,
            },
          },
        },
      },
    });

    return {
      success: true,
      data: {
        categories: categories.map((c) => ({
          sellerCategoryId: c.id,
          categoryId: c.category.id,
          name: c.category.name,
          slug: c.category.slug,
          description: c.category.description,
          approvedAt: c.reviewedAt,
          currentCommissionRate: c.category.commissions[0]?.commissionRate ?? null,
        })),
      },
      message: 'Approved categories retrieved successfully',
    };
  }

  // ================= ADMIN CATEGORY REQUEST REVIEWS & ASSIGNMENTS =================

  async listAdminCategoryRequests(query: CategoryRequestQueryDto): Promise<any> {
    const where: Prisma.SellerCategoryWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }

    const requests = await this.prisma.sellerCategory.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: {
        seller: {
          select: {
            id: true,
            displayName: true,
            businessName: true,
            status: true,
            contactEmail: true,
          },
        },
        category: true,
        reviewedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      data: { requests },
      message: 'Seller category requests retrieved successfully',
    };
  }

  async getCategoryRequest(requestId: string): Promise<any> {
    const request = await this.prisma.sellerCategory.findUnique({
      where: { id: requestId },
      include: {
        seller: true,
        category: true,
        reviewedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Category request not found');
    }

    return {
      success: true,
      data: { request },
      message: 'Category request retrieved successfully',
    };
  }

  async approveCategoryRequest(adminUserId: string, requestId: string): Promise<any> {
    const request = await this.prisma.sellerCategory.findUnique({
      where: { id: requestId },
      include: { seller: true },
    });

    if (!request) {
      throw new NotFoundException('Category request not found');
    }

    if (request.seller.status !== SellerStatus.APPROVED) {
      throw new BadRequestException('Cannot approve category request for an unapproved seller');
    }

    const updated = await this.prisma.sellerCategory.update({
      where: { id: requestId },
      data: {
        status: SellerCategoryStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedById: adminUserId,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SELLER_CATEGORY_APPROVED',
      resourceType: 'SellerCategory',
      resourceId: requestId,
      previousValue: { status: request.status },
      newValue: { status: SellerCategoryStatus.APPROVED },
    });

    return {
      success: true,
      data: { request: updated },
      message: 'Seller category request approved successfully',
    };
  }

  async rejectCategoryRequest(
    adminUserId: string,
    requestId: string,
    dto: RejectCategoryRequestDto,
  ): Promise<any> {
    const request = await this.prisma.sellerCategory.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Category request not found');
    }

    const updated = await this.prisma.sellerCategory.update({
      where: { id: requestId },
      data: {
        status: SellerCategoryStatus.REJECTED,
        rejectionReason: dto.rejectionReason.trim(),
        reviewedAt: new Date(),
        reviewedById: adminUserId,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SELLER_CATEGORY_REJECTED',
      resourceType: 'SellerCategory',
      resourceId: requestId,
      previousValue: { status: request.status },
      newValue: {
        status: SellerCategoryStatus.REJECTED,
        rejectionReason: dto.rejectionReason,
      },
    });

    return {
      success: true,
      data: { request: updated },
      message: 'Seller category request rejected',
    };
  }

  async revokeSellerCategory(
    adminUserId: string,
    sellerId: string,
    categoryId: string,
    dto: RevokeCategoryDto,
  ): Promise<any> {
    const permission = await this.prisma.sellerCategory.findUnique({
      where: {
        sellerId_categoryId: {
          sellerId,
          categoryId,
        },
      },
    });

    if (!permission) {
      throw new NotFoundException('Seller category permission not found');
    }

    const updated = await this.prisma.sellerCategory.update({
      where: { id: permission.id },
      data: {
        status: SellerCategoryStatus.REVOKED,
        revocationReason: dto.revocationReason.trim(),
        revokedAt: new Date(),
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SELLER_CATEGORY_REVOKED',
      resourceType: 'SellerCategory',
      resourceId: permission.id,
      previousValue: { status: permission.status },
      newValue: {
        status: SellerCategoryStatus.REVOKED,
        revocationReason: dto.revocationReason,
      },
    });

    return {
      success: true,
      data: { permission: updated },
      message: 'Seller category permission revoked successfully',
    };
  }

  async assignCategoryToSeller(adminUserId: string, sellerId: string, dto: AssignCategoryDto): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { id: sellerId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category || !category.isActive) {
      throw new BadRequestException('Category is invalid or inactive');
    }

    const permission = await this.prisma.sellerCategory.upsert({
      where: {
        sellerId_categoryId: {
          sellerId,
          categoryId: dto.categoryId,
        },
      },
      create: {
        sellerId,
        categoryId: dto.categoryId,
        status: SellerCategoryStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedById: adminUserId,
      },
      update: {
        status: SellerCategoryStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedById: adminUserId,
        rejectionReason: null,
        revocationReason: null,
        revokedAt: null,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SELLER_CATEGORY_ASSIGNED',
      resourceType: 'SellerCategory',
      resourceId: permission.id,
      newValue: { sellerId, categoryId: dto.categoryId, status: SellerCategoryStatus.APPROVED },
    });

    return {
      success: true,
      data: { permission },
      message: 'Category assigned to seller successfully',
    };
  }

  async getSellerCategories(sellerId: string): Promise<any> {
    const categories = await this.prisma.sellerCategory.findMany({
      where: { sellerId },
      include: { category: true },
    });

    return {
      success: true,
      data: { categories },
      message: 'Seller categories retrieved successfully',
    };
  }

  async hasSellerApprovedCategory(sellerId: string, categoryId: string): Promise<boolean> {
    const permission = await this.prisma.sellerCategory.findUnique({
      where: {
        sellerId_categoryId: {
          sellerId,
          categoryId,
        },
      },
    });

    return permission?.status === SellerCategoryStatus.APPROVED;
  }
}
