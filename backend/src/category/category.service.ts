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
  CreateSizeSetDto,
  UpdateSizeSetDto,
  AddSizeSetValueDto,
  SizeSetQueryDto,
} from './dto';
import {
  CommissionStatus,
  Prisma,
  ProductStatus,
  SellerCategoryStatus,
  SellerStatus,
} from '@prisma/client';

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
        sizeSet: {
          include: {
            values: {
              where: publicOnly ? { isActive: true } : undefined,
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        subcategories: {
          where: publicOnly ? { isActive: true } : undefined,
          orderBy: { name: 'asc' },
          include: {
            sizeSet: {
              include: {
                values: {
                  where: publicOnly ? { isActive: true } : undefined,
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
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
        sizeSet: {
          include: {
            values: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        subcategories: {
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
        },
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
      if (!dto.sizeSetId) {
        throw new BadRequestException('Subcategories must be assigned a valid sizeSetId');
      }
      const sizeSet = await this.prisma.sizeSet.findUnique({ where: { id: dto.sizeSetId } });
      if (!sizeSet) {
        throw new NotFoundException('Size set not found');
      }
    }

    const category = await this.prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: {
          name: dto.name.trim(),
          slug: dto.slug.trim().toLowerCase(),
          description: dto.description?.trim() || null,
          parentCategoryId: dto.parentCategoryId || null,
          sizeSetId: dto.sizeSetId || null,
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
        sizeSetId: category.sizeSetId,
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

    if (dto.sizeSetId !== undefined) {
      const isSubcategory = !!category.parentCategoryId;
      if (isSubcategory && !dto.sizeSetId) {
        throw new BadRequestException('Subcategories must be assigned a valid sizeSetId');
      }
      if (dto.sizeSetId) {
        const sizeSet = await this.prisma.sizeSet.findUnique({ where: { id: dto.sizeSetId } });
        if (!sizeSet) {
          throw new NotFoundException('Size set not found');
        }
      }
    }

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: dto.name?.trim() ?? category.name,
        slug: dto.slug?.trim().toLowerCase() ?? category.slug,
        description: dto.description !== undefined ? dto.description?.trim() : category.description,
        sizeSetId: dto.sizeSetId !== undefined ? (dto.sizeSetId || null) : category.sizeSetId,
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
        if (existing.status === SellerCategoryStatus.REQUESTED) {
          requestedResults.push({ categoryId, status: existing.status, note: 'Already pending review' });
          continue;
        }
        // Resubmitting previously rejected or revoked request
        const updated = await this.prisma.sellerCategory.update({
          where: { id: existing.id },
          data: {
            status: SellerCategoryStatus.REQUESTED,
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
            status: SellerCategoryStatus.REQUESTED,
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

    // Move any active listings in revoked category to REMOVED_BY_ADMIN (SRS Section 8.8)
    await this.prisma.product.updateMany({
      where: {
        sellerId,
        categoryId,
        status: ProductStatus.ACTIVE,
      },
      data: {
        status: ProductStatus.REMOVED_BY_ADMIN,
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

  // ================= SUPER ADMIN SIZE SET MANAGEMENT =================

  async createSizeSet(adminUserId: string, dto: CreateSizeSetDto): Promise<any> {
    const normalizedCode = dto.code.trim().toUpperCase();
    const existing = await this.prisma.sizeSet.findFirst({
      where: {
        OR: [{ name: dto.name.trim() }, { code: normalizedCode }],
      },
    });
    if (existing) {
      throw new ConflictException(`Size set with name '${dto.name}' or code '${normalizedCode}' already exists`);
    }

    const sizeSet = await this.prisma.sizeSet.create({
      data: {
        name: dto.name.trim(),
        code: normalizedCode,
        description: dto.description?.trim() || null,
        isActive: true,
        values: dto.values?.length
          ? {
              create: dto.values.map((v, index) => ({
                value: v.value.trim(),
                displayName: v.displayName?.trim() || v.value.trim(),
                sortOrder: v.sortOrder ?? index + 1,
                isActive: true,
              })),
            }
          : undefined,
      },
      include: {
        values: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SIZE_SET_CREATED',
      resourceType: 'SizeSet',
      resourceId: sizeSet.id,
      newValue: { name: sizeSet.name, code: sizeSet.code },
    });

    return {
      success: true,
      data: { sizeSet },
      message: 'Size set created successfully',
    };
  }

  async listSizeSets(query?: SizeSetQueryDto): Promise<any> {
    const where: Prisma.SizeSetWhereInput = {};
    if (!query?.includeInactive) {
      where.isActive = true;
    }

    const sizeSets = await this.prisma.sizeSet.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        values: {
          where: query?.includeInactive ? undefined : { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return {
      success: true,
      data: { sizeSets },
      message: 'Size sets retrieved successfully',
    };
  }

  async getSizeSetById(id: string): Promise<any> {
    const sizeSet = await this.prisma.sizeSet.findUnique({
      where: { id },
      include: {
        values: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!sizeSet) {
      throw new NotFoundException('Size set not found');
    }

    return {
      success: true,
      data: { sizeSet },
      message: 'Size set retrieved successfully',
    };
  }

  async updateSizeSet(adminUserId: string, id: string, dto: UpdateSizeSetDto): Promise<any> {
    const sizeSet = await this.prisma.sizeSet.findUnique({ where: { id } });
    if (!sizeSet) {
      throw new NotFoundException('Size set not found');
    }

    if (dto.name && dto.name.trim() !== sizeSet.name) {
      const existingName = await this.prisma.sizeSet.findUnique({ where: { name: dto.name.trim() } });
      if (existingName) {
        throw new ConflictException(`Size set with name '${dto.name}' already exists`);
      }
    }

    const updated = await this.prisma.sizeSet.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : sizeSet.name,
        description: dto.description !== undefined ? dto.description?.trim() : sizeSet.description,
        isActive: dto.isActive !== undefined ? dto.isActive : sizeSet.isActive,
      },
      include: {
        values: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SIZE_SET_UPDATED',
      resourceType: 'SizeSet',
      resourceId: id,
      previousValue: { name: sizeSet.name, isActive: sizeSet.isActive },
      newValue: { name: updated.name, isActive: updated.isActive },
    });

    return {
      success: true,
      data: { sizeSet: updated },
      message: 'Size set updated successfully',
    };
  }

  async addSizeSetValue(adminUserId: string, sizeSetId: string, dto: AddSizeSetValueDto): Promise<any> {
    const sizeSet = await this.prisma.sizeSet.findUnique({ where: { id: sizeSetId } });
    if (!sizeSet) {
      throw new NotFoundException('Size set not found');
    }

    const existingValue = await this.prisma.sizeSetValue.findUnique({
      where: {
        sizeSetId_value: {
          sizeSetId,
          value: dto.value.trim(),
        },
      },
    });

    if (existingValue) {
      throw new ConflictException(`Size value '${dto.value}' already exists in this size set`);
    }

    const created = await this.prisma.sizeSetValue.create({
      data: {
        sizeSetId,
        value: dto.value.trim(),
        displayName: dto.displayName?.trim() || dto.value.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SIZE_SET_VALUE_ADDED',
      resourceType: 'SizeSetValue',
      resourceId: created.id,
      newValue: { sizeSetId, value: created.value, sortOrder: created.sortOrder },
    });

    return {
      success: true,
      data: { value: created },
      message: 'Size set value added successfully',
    };
  }

  async seedDefaultSizeSets(): Promise<any> {
    const seeded = [];
    for (const set of DEFAULT_SIZE_SETS) {
      const existing = await this.prisma.sizeSet.findUnique({ where: { code: set.code } });
      if (!existing) {
        const created = await this.prisma.sizeSet.create({
          data: {
            name: set.name,
            code: set.code,
            description: set.description,
            isActive: true,
            values: {
              create: set.values,
            },
          },
          include: { values: true },
        });
        seeded.push(created);
      } else {
        seeded.push(existing);
      }
    }
    return seeded;
  }
}

export const DEFAULT_SIZE_SETS = [
  {
    name: 'Alpha Standard',
    code: 'ALPHA_STD',
    description: 'Standard alpha clothing sizing (XS through 3XL)',
    values: [
      { value: 'XS', displayName: 'Extra Small (XS)', sortOrder: 1 },
      { value: 'S', displayName: 'Small (S)', sortOrder: 2 },
      { value: 'M', displayName: 'Medium (M)', sortOrder: 3 },
      { value: 'L', displayName: 'Large (L)', sortOrder: 4 },
      { value: 'XL', displayName: 'Extra Large (XL)', sortOrder: 5 },
      { value: 'XXL', displayName: 'Double Extra Large (XXL)', sortOrder: 6 },
      { value: '3XL', displayName: 'Triple Extra Large (3XL)', sortOrder: 7 },
    ],
  },
  {
    name: "Men's Waist",
    code: 'MENS_WAIST',
    description: "Men's trouser and jeans waist sizing (28 to 42 even inches)",
    values: [
      { value: '28', displayName: '28 in', sortOrder: 1 },
      { value: '30', displayName: '30 in', sortOrder: 2 },
      { value: '32', displayName: '32 in', sortOrder: 3 },
      { value: '34', displayName: '34 in', sortOrder: 4 },
      { value: '36', displayName: '36 in', sortOrder: 5 },
      { value: '38', displayName: '38 in', sortOrder: 6 },
      { value: '40', displayName: '40 in', sortOrder: 7 },
      { value: '42', displayName: '42 in', sortOrder: 8 },
    ],
  },
  {
    name: "Women's Waist",
    code: 'WOMENS_WAIST',
    description: "Women's trousers, skirts, and denim waist sizing (26 to 38 even inches)",
    values: [
      { value: '26', displayName: '26 in', sortOrder: 1 },
      { value: '28', displayName: '28 in', sortOrder: 2 },
      { value: '30', displayName: '30 in', sortOrder: 3 },
      { value: '32', displayName: '32 in', sortOrder: 4 },
      { value: '34', displayName: '34 in', sortOrder: 5 },
      { value: '36', displayName: '36 in', sortOrder: 6 },
      { value: '38', displayName: '38 in', sortOrder: 7 },
    ],
  },
  {
    name: "Kids' Age Brackets",
    code: 'KIDS_AGE',
    description: "Kids' apparel age-based size brackets from infants to teens",
    values: [
      { value: '0-3M', displayName: '0-3 Months', sortOrder: 1 },
      { value: '3-6M', displayName: '3-6 Months', sortOrder: 2 },
      { value: '6-12M', displayName: '6-12 Months', sortOrder: 3 },
      { value: '1-2Y', displayName: '1-2 Years', sortOrder: 4 },
      { value: '2-3Y', displayName: '2-3 Years', sortOrder: 5 },
      { value: '3-4Y', displayName: '3-4 Years', sortOrder: 6 },
      { value: '4-5Y', displayName: '4-5 Years', sortOrder: 7 },
      { value: '5-6Y', displayName: '5-6 Years', sortOrder: 8 },
      { value: '6-7Y', displayName: '6-7 Years', sortOrder: 9 },
      { value: '7-8Y', displayName: '7-8 Years', sortOrder: 10 },
      { value: '8-9Y', displayName: '8-9 Years', sortOrder: 11 },
      { value: '9-10Y', displayName: '9-10 Years', sortOrder: 12 },
      { value: '10-11Y', displayName: '10-11 Years', sortOrder: 13 },
      { value: '11-12Y', displayName: '11-12 Years', sortOrder: 14 },
      { value: '12-13Y', displayName: '12-13 Years', sortOrder: 15 },
    ],
  },
  {
    name: 'Free Size',
    code: 'FREE_SIZE',
    description: 'One-size-fits-all apparel (e.g. Sarees, Shawls, Scarves)',
    values: [
      { value: 'Free Size', displayName: 'Free Size / One Size', sortOrder: 1 },
    ],
  },
];
