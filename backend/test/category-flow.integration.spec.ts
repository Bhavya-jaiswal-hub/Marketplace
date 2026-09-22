import {
  CommissionStatus,
  Prisma,
  SellerCategoryStatus,
  SellerStatus,
} from '@prisma/client';
import { CategoryService } from '../src/category/category.service';
import { AuditService } from '../src/audit/audit.service';
import { BadRequestException } from '@nestjs/common';

describe('Category Hierarchy, Commission & Seller Permission Integration', () => {
  let categoryService: CategoryService;
  let auditService: AuditService;

  const db = {
    categories: new Map<string, any>(),
    categoryCommissions: new Map<string, any>(),
    sellerProfiles: new Map<string, any>(),
    sellerCategories: new Map<string, any>(),
    auditLogs: new Map<string, any>(),
  };

  beforeEach(() => {
    db.categories.clear();
    db.categoryCommissions.clear();
    db.sellerProfiles.clear();
    db.sellerCategories.clear();
    db.auditLogs.clear();

    const mockPrisma: any = {
      category: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          let cat = null;
          if (where.slug) {
            for (const c of db.categories.values()) {
              if (c.slug === where.slug) {
                cat = c;
                break;
              }
            }
          } else if (where.id) {
            cat = db.categories.get(where.id) || null;
          }

          if (!cat) return null;
          const result = { ...cat };
          if (include?.subcategories) {
            result.subcategories = Array.from(db.categories.values()).filter(
              (c) => c.parentCategoryId === cat.id && (include.subcategories.where?.isActive === undefined || c.isActive === include.subcategories.where.isActive),
            );
          }
          if (include?.commissions) {
            result.commissions = Array.from(db.categoryCommissions.values()).filter(
              (cm) => cm.categoryId === cat.id && (include.commissions.where?.status === undefined || cm.status === include.commissions.where.status),
            );
          }
          return result;
        }),
        findMany: jest.fn(async ({ where, include }: any) => {
          let list = Array.from(db.categories.values());
          if (where?.parentCategoryId === null) {
            list = list.filter((c) => c.parentCategoryId === null);
          }
          if (where?.isActive !== undefined) {
            list = list.filter((c) => c.isActive === where.isActive);
          }
          if (include?.subcategories) {
            list = list.map((cat) => ({
              ...cat,
              subcategories: Array.from(db.categories.values()).filter(
                (sub) => sub.parentCategoryId === cat.id && (include.subcategories.where?.isActive === undefined || sub.isActive === include.subcategories.where.isActive),
              ),
            }));
          }
          return list;
        }),
        create: jest.fn(async ({ data }: any) => {
          const id = `cat-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.categories.set(id, record);
          return record;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const cat = db.categories.get(where.id);
          if (!cat) return null;
          Object.assign(cat, data, { updatedAt: new Date() });
          return cat;
        }),
      },
      categoryCommission: {
        findFirst: jest.fn(async ({ where }: any) => {
          for (const comm of db.categoryCommissions.values()) {
            if (comm.categoryId === where.categoryId && comm.status === where.status) {
              return comm;
            }
          }
          return null;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          let list = Array.from(db.categoryCommissions.values());
          if (where?.categoryId) {
            list = list.filter((c) => c.categoryId === where.categoryId);
          }
          return list;
        }),
        create: jest.fn(async ({ data }: any) => {
          const id = `comm-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.categoryCommissions.set(id, record);
          return record;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const comm = db.categoryCommissions.get(where.id);
          if (!comm) return null;
          Object.assign(comm, data, { updatedAt: new Date() });
          return comm;
        }),
      },
      sellerProfile: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          let profile = null;
          if (where.userId) {
            for (const p of db.sellerProfiles.values()) {
              if (p.userId === where.userId) {
                profile = p;
                break;
              }
            }
          } else if (where.id) {
            profile = db.sellerProfiles.get(where.id) || null;
          }

          if (!profile) return null;
          const result = { ...profile };
          if (include?.sellerCategories) {
            result.sellerCategories = Array.from(db.sellerCategories.values()).filter(
              (sc) => sc.sellerId === profile.id,
            );
          }
          return result;
        }),
      },
      sellerCategory: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          let record = null;
          if (where.id) {
            record = db.sellerCategories.get(where.id) || null;
          } else if (where.sellerId_categoryId) {
            for (const sc of db.sellerCategories.values()) {
              if (
                sc.sellerId === where.sellerId_categoryId.sellerId &&
                sc.categoryId === where.sellerId_categoryId.categoryId
              ) {
                record = sc;
                break;
              }
            }
          }

          if (!record) return null;
          const result = { ...record };
          if (include?.seller) {
            result.seller = db.sellerProfiles.get(record.sellerId);
          }
          if (include?.category) {
            const cat = db.categories.get(record.categoryId);
            result.category = {
              ...cat,
              commissions: Array.from(db.categoryCommissions.values()).filter(
                (cm) => cm.categoryId === cat.id,
              ),
            };
          }
          return result;
        }),
        findMany: jest.fn(async ({ where, include }: any) => {
          let list = Array.from(db.sellerCategories.values());
          if (where?.sellerId) {
            list = list.filter((sc) => sc.sellerId === where.sellerId);
          }
          if (where?.status) {
            list = list.filter((sc) => sc.status === where.status);
          }
          if (include?.category) {
            list = list.map((sc) => {
              const cat = db.categories.get(sc.categoryId);
              let comms = Array.from(db.categoryCommissions.values()).filter(
                (cm) => cm.categoryId === cat.id,
              );
              if (include.category.include?.commissions?.where?.status) {
                comms = comms.filter(
                  (cm) => cm.status === include.category.include.commissions.where.status,
                );
              }
              return {
                ...sc,
                category: {
                  ...cat,
                  commissions: comms,
                },
              };
            });
          }
          return list;
        }),
        create: jest.fn(async ({ data }: any) => {
          const id = `sc-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, requestedAt: new Date(), createdAt: new Date(), updatedAt: new Date() };
          db.sellerCategories.set(id, record);
          return record;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const record = db.sellerCategories.get(where.id);
          if (!record) return null;
          Object.assign(record, data, { updatedAt: new Date() });
          return record;
        }),
        upsert: jest.fn(async ({ where, create, update }: any) => {
          let found = null;
          for (const sc of db.sellerCategories.values()) {
            if (
              sc.sellerId === where.sellerId_categoryId.sellerId &&
              sc.categoryId === where.sellerId_categoryId.categoryId
            ) {
              found = sc;
              break;
            }
          }
          if (found) {
            Object.assign(found, update, { updatedAt: new Date() });
            return found;
          }
          const id = `sc-${Date.now()}-${Math.random()}`;
          const record = { id, ...create, requestedAt: new Date(), createdAt: new Date(), updatedAt: new Date() };
          db.sellerCategories.set(id, record);
          return record;
        }),
      },
      auditLog: {
        create: jest.fn(async ({ data }: any) => {
          const id = `audit-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, createdAt: new Date() };
          db.auditLogs.set(id, record);
          return record;
        }),
      },
      $transaction: jest.fn(async (cb: any) => cb(mockPrisma)),
    };

    auditService = new AuditService(mockPrisma);
    categoryService = new CategoryService(mockPrisma, auditService);
  });

  it('runs complete category hierarchy, commission update, and seller request approval/revocation flow', async () => {
    const adminUserId = 'admin-user-1';
    const sellerUserId = 'seller-user-1';
    const sellerProfileId = 'seller-profile-1';

    db.sellerProfiles.set(sellerProfileId, {
      id: sellerProfileId,
      userId: sellerUserId,
      displayName: 'Royal Footwear',
      status: SellerStatus.APPROVED,
    });

    // 1. Admin creates Parent Category 'Fashion' with 10% initial commission
    const parentRes = await categoryService.createCategory(adminUserId, {
      name: 'Fashion',
      slug: 'fashion',
      description: 'Apparel and accessories',
      initialCommissionRate: 10.0,
    });
    const parentCategoryId = parentRes.data.category.id;

    // 2. Admin creates Subcategory 'Footwear' under 'Fashion' with 12% initial commission
    const subRes = await categoryService.createCategory(adminUserId, {
      name: 'Footwear',
      slug: 'footwear',
      parentCategoryId,
      description: 'Shoes and sandals',
      initialCommissionRate: 12.0,
    });
    const footwearCategoryId = subRes.data.category.id;

    // 3. Admin creates another top-level category 'Electronics' with 8% commission
    const elecRes = await categoryService.createCategory(adminUserId, {
      name: 'Electronics',
      slug: 'electronics',
      initialCommissionRate: 8.0,
    });
    const elecCategoryId = elecRes.data.category.id;

    // 4. Public lists categories hierarchy
    const publicList = await categoryService.listCategories(true);
    expect(publicList.data.categories).toHaveLength(2); // Fashion and Electronics
    const fashion = publicList.data.categories.find((c: any) => c.slug === 'fashion');
    expect(fashion.subcategories).toHaveLength(1);
    expect(fashion.subcategories[0].slug).toBe('footwear');

    // 5. Admin updates commission on 'Footwear' from 12% to 15%
    const commUpdateRes = await categoryService.configureCommission(adminUserId, footwearCategoryId, {
      commissionRate: 15.0,
    });
    expect(commUpdateRes.success).toBe(true);

    // Verify commission history
    const commDetails = await categoryService.getCommission(footwearCategoryId);
    expect(commDetails.data.currentCommission.commissionRate.toNumber()).toBe(15.0);
    expect(commDetails.data.commissionHistory).toHaveLength(2);
    const expiredComm = commDetails.data.commissionHistory.find((c: any) => c.status === CommissionStatus.EXPIRED);
    expect(expiredComm.commissionRate.toNumber()).toBe(12.0);

    // 6. Seller views available categories
    const available = await categoryService.getAvailableCategories(sellerUserId);
    expect(available.data.categories).toHaveLength(3);
    expect(available.data.categories.every((c: any) => c.sellerStatus === 'NOT_REQUESTED')).toBe(true);

    // 7. Seller submits category request for Footwear and Electronics
    const reqRes = await categoryService.requestCategories(sellerUserId, {
      categoryIds: [footwearCategoryId, elecCategoryId],
    });
    expect(reqRes.success).toBe(true);
    expect(reqRes.data.requests).toHaveLength(2);
    const footwearReqId = reqRes.data.requests.find((r: any) => r.categoryId === footwearCategoryId).id;
    const elecReqId = reqRes.data.requests.find((r: any) => r.categoryId === elecCategoryId).id;

    // 8. Admin approves Footwear request
    const approveReq = await categoryService.approveCategoryRequest(adminUserId, footwearReqId);
    expect(approveReq.data.request.status).toBe(SellerCategoryStatus.APPROVED);

    // Admin rejects Electronics request with reason
    const rejectReq = await categoryService.rejectCategoryRequest(adminUserId, elecReqId, {
      rejectionReason: 'Seller documentation does not qualify for high-voltage electronics.',
    });
    expect(rejectReq.data.request.status).toBe(SellerCategoryStatus.REJECTED);

    // 9. Seller views approved categories
    const approvedCats = await categoryService.getOwnApprovedCategories(sellerUserId);
    expect(approvedCats.data.categories).toHaveLength(1);
    expect(approvedCats.data.categories[0].slug).toBe('footwear');
    expect(approvedCats.data.categories[0].currentCommissionRate.toNumber()).toBe(15.0);

    // 10. Check permission check helper
    expect(await categoryService.hasSellerApprovedCategory(sellerProfileId, footwearCategoryId)).toBe(true);
    expect(await categoryService.hasSellerApprovedCategory(sellerProfileId, elecCategoryId)).toBe(false);

    // 11. Admin revokes Footwear permission
    const revokeRes = await categoryService.revokeSellerCategory(
      adminUserId,
      sellerProfileId,
      footwearCategoryId,
      {
        revocationReason: 'Repeated late delivery complaints in footwear department.',
      },
    );
    expect(revokeRes.data.permission.status).toBe(SellerCategoryStatus.REVOKED);
    expect(await categoryService.hasSellerApprovedCategory(sellerProfileId, footwearCategoryId)).toBe(false);

    // 12. Check audit log count for categories & commissions
    const auditEvents = Array.from(db.auditLogs.values());
    expect(auditEvents.some((a) => a.action === 'CATEGORY_CREATED')).toBe(true);
    expect(auditEvents.some((a) => a.action === 'COMMISSION_CONFIGURED')).toBe(true);
    expect(auditEvents.some((a) => a.action === 'SELLER_CATEGORY_APPROVED')).toBe(true);
    expect(auditEvents.some((a) => a.action === 'SELLER_CATEGORY_REJECTED')).toBe(true);
    expect(auditEvents.some((a) => a.action === 'SELLER_CATEGORY_REVOKED')).toBe(true);
  });
});
