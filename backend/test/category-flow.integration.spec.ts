import {
  CommissionStatus,
  ProductStatus,
  SellerCategoryStatus,
  SellerStatus,
} from '@prisma/client';
import { CategoryService } from '../src/category/category.service';
import { AuditService } from '../src/audit/audit.service';
import { BadRequestException } from '@nestjs/common';

describe('Category Hierarchy, Size Set Governance & Seller Permission Integration', () => {
  let categoryService: CategoryService;
  let auditService: AuditService;

  const db = {
    sizeSets: new Map<string, any>(),
    sizeSetValues: new Map<string, any>(),
    categories: new Map<string, any>(),
    categoryCommissions: new Map<string, any>(),
    sellerProfiles: new Map<string, any>(),
    sellerCategories: new Map<string, any>(),
    products: new Map<string, any>(),
    auditLogs: new Map<string, any>(),
  };

  beforeEach(() => {
    db.sizeSets.clear();
    db.sizeSetValues.clear();
    db.categories.clear();
    db.categoryCommissions.clear();
    db.sellerProfiles.clear();
    db.sellerCategories.clear();
    db.products.clear();
    db.auditLogs.clear();

    const mockPrisma: any = {
      sizeSet: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.id) return db.sizeSets.get(where.id) || null;
          if (where.code) {
            for (const s of db.sizeSets.values()) {
              if (s.code === where.code) return s;
            }
          }
          if (where.name) {
            for (const s of db.sizeSets.values()) {
              if (s.name === where.name) return s;
            }
          }
          return null;
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          if (where.OR) {
            for (const s of db.sizeSets.values()) {
              for (const condition of where.OR) {
                if (condition.name && s.name === condition.name) return s;
                if (condition.code && s.code === condition.code) return s;
              }
            }
          }
          return null;
        }),
        findMany: jest.fn(async ({ where, include }: any) => {
          let list = Array.from(db.sizeSets.values());
          if (where?.isActive !== undefined) {
            list = list.filter((s) => s.isActive === where.isActive);
          }
          if (include?.values) {
            list = list.map((s) => ({
              ...s,
              values: Array.from(db.sizeSetValues.values()).filter((v) => v.sizeSetId === s.id),
            }));
          }
          return list;
        }),
        create: jest.fn(async ({ data }: any) => {
          const id = `ss-${Date.now()}-${Math.random()}`;
          const record = {
            id,
            name: data.name,
            code: data.code,
            description: data.description || null,
            isActive: data.isActive !== undefined ? data.isActive : true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          db.sizeSets.set(id, record);

          if (data.values?.create) {
            for (const v of data.values.create) {
              const valId = `ssv-${Date.now()}-${Math.random()}`;
              db.sizeSetValues.set(valId, {
                id: valId,
                sizeSetId: id,
                value: v.value,
                displayName: v.displayName || v.value,
                sortOrder: v.sortOrder || 0,
                isActive: true,
              });
            }
          }

          return {
            ...record,
            values: Array.from(db.sizeSetValues.values()).filter((v) => v.sizeSetId === id),
          };
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const set = db.sizeSets.get(where.id);
          if (!set) return null;
          Object.assign(set, data, { updatedAt: new Date() });
          return set;
        }),
      },
      sizeSetValue: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.id) return db.sizeSetValues.get(where.id) || null;
          if (where.sizeSetId_value) {
            for (const v of db.sizeSetValues.values()) {
              if (
                v.sizeSetId === where.sizeSetId_value.sizeSetId &&
                v.value === where.sizeSetId_value.value
              ) {
                return v;
              }
            }
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const id = `ssv-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.sizeSetValues.set(id, record);
          return record;
        }),
      },
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
          if (include?.sizeSet) {
            const ss = cat.sizeSetId ? db.sizeSets.get(cat.sizeSetId) : null;
            result.sizeSet = ss
              ? {
                  ...ss,
                  values: Array.from(db.sizeSetValues.values()).filter((v) => v.sizeSetId === ss.id),
                }
              : null;
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
              subcategories: Array.from(db.categories.values())
                .filter(
                  (sub) =>
                    sub.parentCategoryId === cat.id &&
                    (include.subcategories.where?.isActive === undefined ||
                      sub.isActive === include.subcategories.where.isActive),
                )
                .map((sub) => ({
                  ...sub,
                  sizeSet: sub.sizeSetId ? db.sizeSets.get(sub.sizeSetId) : null,
                })),
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
      },
      product: {
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const prod of db.products.values()) {
            if (
              prod.sellerId === where.sellerId &&
              prod.categoryId === where.categoryId &&
              prod.status === where.status
            ) {
              Object.assign(prod, data);
              count++;
            }
          }
          return { count };
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

  it('runs complete category hierarchy, size set binding, commission update, and seller request lifecycle', async () => {
    const adminUserId = 'admin-user-1';
    const sellerUserId = 'seller-user-1';
    const sellerProfileId = 'seller-profile-1';

    db.sellerProfiles.set(sellerProfileId, {
      id: sellerProfileId,
      userId: sellerUserId,
      displayName: 'Royal Apparel',
      status: SellerStatus.APPROVED,
    });

    // 1. Admin creates Size Sets for Alpha clothing and Men's waist
    const alphaSetRes = await categoryService.createSizeSet(adminUserId, {
      name: 'Alpha Standard',
      code: 'ALPHA_STD',
      description: 'Alpha clothing sizes XS through 3XL',
      values: [
        { value: 'S', displayName: 'Small (S)', sortOrder: 1 },
        { value: 'M', displayName: 'Medium (M)', sortOrder: 2 },
        { value: 'L', displayName: 'Large (L)', sortOrder: 3 },
      ],
    });
    const alphaSizeSetId = alphaSetRes.data.sizeSet.id;
    expect(alphaSetRes.success).toBe(true);

    const waistSetRes = await categoryService.createSizeSet(adminUserId, {
      name: "Men's Waist",
      code: 'MENS_WAIST',
      description: "Men's trouser waist sizes in even inches",
      values: [
        { value: '30', displayName: '30 in', sortOrder: 1 },
        { value: '32', displayName: '32 in', sortOrder: 2 },
      ],
    });
    const waistSizeSetId = waistSetRes.data.sizeSet.id;

    // 2. Admin creates Parent Category 'Men Clothing' with 10% commission (no sizeSetId required)
    const parentRes = await categoryService.createCategory(adminUserId, {
      name: "Men's Clothing",
      slug: 'mens-clothing',
      description: 'Men apparel collections',
      initialCommissionRate: 10.0,
    });
    const menCategoryId = parentRes.data.category.id;

    // 3. Subcategory creation without sizeSetId must be rejected
    await expect(
      categoryService.createCategory(adminUserId, {
        name: 'Shirts',
        slug: 'mens-shirts',
        parentCategoryId: menCategoryId,
      }),
    ).rejects.toThrow(BadRequestException);

    // 4. Admin creates Subcategory 'Shirts' bound to Alpha Size Set
    const shirtsRes = await categoryService.createCategory(adminUserId, {
      name: 'Shirts',
      slug: 'mens-shirts',
      parentCategoryId: menCategoryId,
      sizeSetId: alphaSizeSetId,
      initialCommissionRate: 12.0,
    });
    const shirtsCategoryId = shirtsRes.data.category.id;
    expect(shirtsRes.data.category.sizeSetId).toBe(alphaSizeSetId);

    // 5. Admin creates Subcategory 'Trousers' bound to Waist Size Set
    const trousersRes = await categoryService.createCategory(adminUserId, {
      name: 'Trousers',
      slug: 'mens-trousers',
      parentCategoryId: menCategoryId,
      sizeSetId: waistSizeSetId,
      initialCommissionRate: 15.0,
    });
    const trousersCategoryId = trousersRes.data.category.id;
    expect(trousersRes.data.category.sizeSetId).toBe(waistSizeSetId);

    // 6. Public list returns category hierarchy with subcategories
    const publicList = await categoryService.listCategories(true);
    expect(publicList.data.categories).toHaveLength(1);
    const menCat = publicList.data.categories[0];
    expect(menCat.subcategories).toHaveLength(2);

    // 7. Seller checks available categories (status NOT_REQUESTED initially)
    const available = await categoryService.getAvailableCategories(sellerUserId);
    expect(available.data.categories).toHaveLength(3);
    expect(available.data.categories.every((c: any) => c.sellerStatus === 'NOT_REQUESTED')).toBe(true);

    // 8. Seller requests permissions for Shirts and Trousers (status REQUESTED per SRS 8.8)
    const reqRes = await categoryService.requestCategories(sellerUserId, {
      categoryIds: [shirtsCategoryId, trousersCategoryId],
    });
    expect(reqRes.success).toBe(true);
    expect(reqRes.data.requests).toHaveLength(2);
    expect(reqRes.data.requests[0].status).toBe(SellerCategoryStatus.REQUESTED);
    const shirtsReqId = reqRes.data.requests.find((r: any) => r.categoryId === shirtsCategoryId).id;
    const trousersReqId = reqRes.data.requests.find((r: any) => r.categoryId === trousersCategoryId).id;

    // 9. Admin approves Shirts request
    const approveReq = await categoryService.approveCategoryRequest(adminUserId, shirtsReqId);
    expect(approveReq.data.request.status).toBe(SellerCategoryStatus.APPROVED);

    // Admin rejects Trousers request with feedback
    const rejectReq = await categoryService.rejectCategoryRequest(adminUserId, trousersReqId, {
      rejectionReason: 'Seller documentation insufficient for tailored trousers department.',
    });
    expect(rejectReq.data.request.status).toBe(SellerCategoryStatus.REJECTED);

    // 10. Seller views approved categories
    const approvedCats = await categoryService.getOwnApprovedCategories(sellerUserId);
    expect(approvedCats.data.categories).toHaveLength(1);
    expect(approvedCats.data.categories[0].slug).toBe('mens-shirts');

    // 11. Add an active product under Shirts for this seller
    db.products.set('prod-1', {
      id: 'prod-1',
      sellerId: sellerProfileId,
      categoryId: shirtsCategoryId,
      status: ProductStatus.ACTIVE,
    });

    // 12. Admin revokes Shirts category; active product transitions to REMOVED_BY_ADMIN
    const revokeRes = await categoryService.revokeSellerCategory(
      adminUserId,
      sellerProfileId,
      shirtsCategoryId,
      {
        revocationReason: 'Quality control failure in apparel inspection.',
      },
    );
    expect(revokeRes.data.permission.status).toBe(SellerCategoryStatus.REVOKED);
    expect(db.products.get('prod-1').status).toBe(ProductStatus.REMOVED_BY_ADMIN);

    // 13. Audit logs record all major governance actions
    const auditEvents = Array.from(db.auditLogs.values());
    expect(auditEvents.some((a) => a.action === 'SIZE_SET_CREATED')).toBe(true);
    expect(auditEvents.some((a) => a.action === 'CATEGORY_CREATED')).toBe(true);
    expect(auditEvents.some((a) => a.action === 'SELLER_CATEGORY_APPROVED')).toBe(true);
    expect(auditEvents.some((a) => a.action === 'SELLER_CATEGORY_REJECTED')).toBe(true);
    expect(auditEvents.some((a) => a.action === 'SELLER_CATEGORY_REVOKED')).toBe(true);
  });
});
