import {
  Prisma,
  ProductStatus,
  SellerCategoryStatus,
  SellerStatus,
} from '@prisma/client';
import { ProductService } from '../src/product/product.service';
import { CategoryService } from '../src/category/category.service';
import { AuditService } from '../src/audit/audit.service';

describe('Product Catalog & Variant Lifecycle Integration Flow (SRS v1.2)', () => {
  let productService: ProductService;
  let categoryService: CategoryService;
  let auditService: AuditService;

  const db = {
    users: new Map<string, any>(),
    sellerProfiles: new Map<string, any>(),
    sizeSets: new Map<string, any>(),
    sizeSetValues: new Map<string, any>(),
    categories: new Map<string, any>(),
    sellerCategories: new Map<string, any>(),
    products: new Map<string, any>(),
    productVariants: new Map<string, any>(),
    productImages: new Map<string, any>(),
    productSpecifications: new Map<string, any>(),
    inventories: new Map<string, any>(),
    inventoryHistories: new Map<string, any>(),
    orderItems: new Map<string, any>(),
    auditLogs: new Map<string, any>(),
  };

  beforeEach(() => {
    db.users.clear();
    db.sellerProfiles.clear();
    db.sizeSets.clear();
    db.sizeSetValues.clear();
    db.categories.clear();
    db.sellerCategories.clear();
    db.products.clear();
    db.productVariants.clear();
    db.productImages.clear();
    db.productSpecifications.clear();
    db.inventories.clear();
    db.inventoryHistories.clear();
    db.orderItems.clear();
    db.auditLogs.clear();

    const mockPrisma: any = {
      sellerProfile: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.userId) {
            for (const p of db.sellerProfiles.values()) {
              if (p.userId === where.userId) return p;
            }
          }
          if (where.id) return db.sellerProfiles.get(where.id) || null;
          return null;
        }),
      },
      category: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          const cat = db.categories.get(where.id);
          if (!cat) return null;
          const res = { ...cat };
          if (include?.sizeSet) {
            const ss = cat.sizeSetId ? db.sizeSets.get(cat.sizeSetId) : null;
            if (ss) {
              const vals = Array.from(db.sizeSetValues.values()).filter(
                (v) => v.sizeSetId === ss.id && v.isActive,
              );
              res.sizeSet = { ...ss, values: vals };
            } else {
              res.sizeSet = null;
            }
          }
          return res;
        }),
      },
      sellerCategory: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.sellerId_categoryId) {
            for (const sc of db.sellerCategories.values()) {
              if (
                sc.sellerId === where.sellerId_categoryId.sellerId &&
                sc.categoryId === where.sellerId_categoryId.categoryId
              ) {
                return sc;
              }
            }
          }
          return null;
        }),
      },
      product: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          const p = db.products.get(where.id);
          if (!p) return null;
          const result = { ...p };
          if (include?.category) {
            const cat = db.categories.get(p.categoryId);
            if (cat) {
              const resCat = { ...cat };
              if (include.category.include?.sizeSet) {
                const ss = cat.sizeSetId ? db.sizeSets.get(cat.sizeSetId) : null;
                if (ss) {
                  resCat.sizeSet = {
                    ...ss,
                    values: Array.from(db.sizeSetValues.values()).filter(
                      (v) => v.sizeSetId === ss.id && v.isActive,
                    ),
                  };
                }
              }
              result.category = resCat;
            }
          }
          if (include?.seller) {
            result.seller = db.sellerProfiles.get(p.sellerId);
          }
          if (include?.images) {
            result.images = Array.from(db.productImages.values())
              .filter((img) => img.productId === p.id)
              .sort((a, b) => a.displayOrder - b.displayOrder);
          }
          if (include?.specifications) {
            result.specifications = Array.from(db.productSpecifications.values())
              .filter((s) => s.productId === p.id)
              .sort((a, b) => a.displayOrder - b.displayOrder);
          }
          if (include?.variants) {
            const vars = Array.from(db.productVariants.values()).filter(
              (v) => v.productId === p.id,
            );
            result.variants = vars.map((v) => {
              const resVar = { ...v };
              if (include.variants.include?.inventory) {
                for (const inv of db.inventories.values()) {
                  if (inv.variantId === v.id) {
                    resVar.inventory = inv;
                    break;
                  }
                }
              }
              if (include.variants.include?.images) {
                resVar.images = Array.from(db.productImages.values()).filter(
                  (img) => img.variantId === v.id,
                );
              }
              return resVar;
            });
          }
          return result;
        }),
        findMany: jest.fn(async ({ where, include, orderBy, skip, take }: any) => {
          let list = Array.from(db.products.values());

          if (where?.sellerId) {
            list = list.filter((p) => p.sellerId === where.sellerId);
          }
          if (where?.status) {
            if (typeof where.status === 'string') {
              list = list.filter((p) => p.status === where.status);
            } else if (where.status.not) {
              list = list.filter((p) => p.status !== where.status.not);
            }
          }
          if (where?.deletedAt === null) {
            list = list.filter((p) => !p.deletedAt);
          }
          if (where?.categoryId) {
            list = list.filter((p) => p.categoryId === where.categoryId);
          }
          if (where?.seller?.status) {
            list = list.filter((p) => {
              const s = db.sellerProfiles.get(p.sellerId);
              return s && s.status === where.seller?.status;
            });
          }
          if (where?.OR) {
            list = list.filter((p) => {
              return where.OR.some((cond: any) => {
                if (cond.name?.contains) {
                  return p.name.toLowerCase().includes(cond.name.contains.toLowerCase());
                }
                return false;
              });
            });
          }

          return list.map((p) => {
            const res = { ...p };
            if (include?.category) res.category = db.categories.get(p.categoryId);
            if (include?.seller) res.seller = db.sellerProfiles.get(p.sellerId);
            if (include?.images) {
              res.images = Array.from(db.productImages.values()).filter((img) => img.productId === p.id);
            }
            if (include?.variants) {
              const vars = Array.from(db.productVariants.values()).filter(
                (v) => v.productId === p.id,
              );
              res.variants = vars.map((v) => {
                const resVar = { ...v };
                if (include.variants.include?.inventory) {
                  for (const inv of db.inventories.values()) {
                    if (inv.variantId === v.id) {
                      resVar.inventory = inv;
                      break;
                    }
                  }
                }
                return resVar;
              });
            }
            return res;
          });
        }),
        count: jest.fn(async () => db.products.size),
        create: jest.fn(async ({ data }: any) => {
          const id = `prod-${Date.now()}-${Math.random()}`;
          const record = {
            id,
            ...data,
            deletedAt: data.deletedAt || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          db.products.set(id, record);
          return record;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const record = db.products.get(where.id);
          if (!record) return null;
          Object.assign(record, data, { updatedAt: new Date() });
          return record;
        }),
      },
      productVariant: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          let v = null;
          if (where.sku) {
            for (const item of db.productVariants.values()) {
              if (item.sku === where.sku) {
                v = item;
                break;
              }
            }
          } else if (where.id) {
            v = db.productVariants.get(where.id) || null;
          }
          if (!v) return null;
          const res = { ...v };
          if (include?.inventory) {
            for (const inv of db.inventories.values()) {
              if (inv.variantId === v.id) {
                res.inventory = inv;
                break;
              }
            }
          }
          return res;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          let list = Array.from(db.productVariants.values());
          if (where?.productId) {
            list = list.filter((v) => v.productId === where.productId);
          }
          if (where?.sku?.in) {
            list = list.filter((v) => where.sku.in.includes(v.sku));
          }
          return list;
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          for (const v of db.productVariants.values()) {
            if (
              v.productId === where.productId &&
              v.size.toLowerCase() === where.size?.equals?.toLowerCase() &&
              v.color.toLowerCase() === where.color?.equals?.toLowerCase()
            ) {
              return v;
            }
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const id = `var-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.productVariants.set(id, record);
          return record;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const record = db.productVariants.get(where.id);
          if (!record) return null;
          Object.assign(record, data, { updatedAt: new Date() });
          return record;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const v of db.productVariants.values()) {
            if (where.id?.in && where.id.in.includes(v.id)) {
              Object.assign(v, data);
              count++;
            }
          }
          return { count };
        }),
        delete: jest.fn(async ({ where }: any) => {
          db.productVariants.delete(where.id);
          return { id: where.id };
        }),
      },
      productImage: {
        count: jest.fn(async ({ where }: any) => {
          return Array.from(db.productImages.values()).filter(
            (img) => img.productId === where.productId,
          ).length;
        }),
        create: jest.fn(async ({ data }: any) => {
          const id = `img-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.productImages.set(id, record);
          return record;
        }),
        createMany: jest.fn(async ({ data }: any) => {
          for (const item of data) {
            const id = `img-${Date.now()}-${Math.random()}`;
            db.productImages.set(id, { id, ...item, createdAt: new Date(), updatedAt: new Date() });
          }
          return { count: data.length };
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          for (const img of db.productImages.values()) {
            if (img.productId === where.productId) {
              Object.assign(img, data);
            }
          }
          return { count: 1 };
        }),
        delete: jest.fn(async ({ where }: any) => {
          db.productImages.delete(where.id);
          return { id: where.id };
        }),
      },
      productSpecification: {
        createMany: jest.fn(async ({ data }: any) => {
          for (const item of data) {
            const id = `spec-${Date.now()}-${Math.random()}`;
            db.productSpecifications.set(id, { id, ...item, createdAt: new Date(), updatedAt: new Date() });
          }
          return { count: data.length };
        }),
      },
      inventory: {
        create: jest.fn(async ({ data }: any) => {
          const id = `inv-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.inventories.set(id, record);
          return record;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const record = db.inventories.get(where.id);
          if (!record) return null;
          Object.assign(record, data, { updatedAt: new Date() });
          return record;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const inv of db.inventories.values()) {
            if (where.variantId?.in && where.variantId.in.includes(inv.variantId)) {
              Object.assign(inv, data);
              count++;
            }
          }
          return { count };
        }),
      },
      inventoryHistory: {
        create: jest.fn(async ({ data }: any) => {
          const id = `inv-hist-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, createdAt: new Date() };
          db.inventoryHistories.set(id, record);
          return record;
        }),
      },
      orderItem: {
        count: jest.fn(async () => db.orderItems.size),
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
    productService = new ProductService(mockPrisma, auditService, categoryService);
  });

  it('runs complete product variant creation, addition, duplication, admin takedown, and soft deletion flow', async () => {
    // 1. Setup Seller & Clothing Category with Size Set
    const sellerUserId = 'seller-user-1';
    const sellerId = 'seller-profile-1';
    db.sellerProfiles.set(sellerId, {
      id: sellerId,
      userId: sellerUserId,
      displayName: 'Vanguard Menswear',
      status: SellerStatus.APPROVED,
    });

    const sizeSetId = 'size-set-alpha';
    db.sizeSets.set(sizeSetId, {
      id: sizeSetId,
      name: 'Alpha Standard',
      code: 'ALPHA_STD',
      isActive: true,
    });

    const sizeM = { id: 'ssv-m', sizeSetId, value: 'M', displayName: 'Medium', isActive: true };
    const sizeL = { id: 'ssv-l', sizeSetId, value: 'L', displayName: 'Large', isActive: true };
    const sizeXL = { id: 'ssv-xl', sizeSetId, value: 'XL', displayName: 'Extra Large', isActive: true };
    db.sizeSetValues.set(sizeM.id, sizeM);
    db.sizeSetValues.set(sizeL.id, sizeL);
    db.sizeSetValues.set(sizeXL.id, sizeXL);

    const categoryId = 'cat-shirts-1';
    db.categories.set(categoryId, {
      id: categoryId,
      name: "Men's Oxford Shirts",
      slug: 'mens-oxford-shirts',
      sizeSetId,
      isActive: true,
    });

    // Grant seller approved permission for category
    db.sellerCategories.set('sc-1', {
      id: 'sc-1',
      sellerId,
      categoryId,
      status: SellerCategoryStatus.APPROVED,
    });

    // 2. Seller creates product with 2 variants (M & L in Black)
    const createRes = await productService.createProduct(sellerUserId, {
      name: 'Classic Oxford Button-Down Shirt',
      description: '100% Cotton Oxford weave shirt',
      price: 1899.0,
      compareAtPrice: 2499.0,
      categoryId,
      variants: [
        { size: 'M', color: 'Black', sku: 'OXF-BLK-M', stockQuantity: 30, lowStockThreshold: 5 },
        { size: 'L', color: 'Black', sku: 'OXF-BLK-L', stockQuantity: 20, lowStockThreshold: 5 },
      ],
      images: [
        { imageUrl: 'https://cdn.marketplace.com/oxf-black-main.jpg', isPrimary: true },
      ],
      specifications: [
        { name: 'Fit', value: 'Regular Fit' },
        { name: 'Fabric', value: '100% Oxford Cotton' },
      ],
    });

    expect(createRes.success).toBe(true);
    const productId = createRes.data.product.id;
    expect(createRes.data.product.variants).toHaveLength(2);
    expect(createRes.data.product.initialStock).toBe(50);

    // 3. Seller adds a 3rd variant (XL in Black)
    const addVarRes = await productService.createProductVariant(sellerUserId, productId, {
      size: 'XL',
      color: 'Black',
      sku: 'OXF-BLK-XL',
      stockQuantity: 15,
    });
    expect(addVarRes.success).toBe(true);
    expect(addVarRes.data.variant.sku).toBe('OXF-BLK-XL');

    // 4. Seller updates product price
    const updateRes = await productService.updateProduct(sellerUserId, productId, {
      price: 1799.0,
    });
    expect(updateRes.success).toBe(true);
    expect(updateRes.data.product.price.toNumber()).toBe(1799.0);

    // 5. Seller duplicates product for Navy edition
    const dupRes = await productService.duplicateProduct(sellerUserId, productId, {
      newSku: 'OXF-NVY-M',
      name: 'Classic Oxford Button-Down Shirt (Navy Edition)',
      initialStock: 25,
    });
    expect(dupRes.success).toBe(true);
    expect(dupRes.data.product.sku).toBe('OXF-NVY-M');

    // 6. Public customer lists products
    const publicList = await productService.listPublicProducts({
      categoryId,
      search: 'Oxford',
    });
    expect(publicList.data.items).toHaveLength(2);
    const originalItem = publicList.data.items.find((i: any) => i.id === productId);
    expect(originalItem).toBeDefined();
    expect(originalItem.inStock).toBe(true);
    expect(originalItem.availableQuantity).toBe(65); // 30 + 20 + 15

    // 7. Public customer views product detail
    const detailRes = await productService.getPublicProduct(productId);
    expect(detailRes.success).toBe(true);
    expect(detailRes.data.product.name).toBe('Classic Oxford Button-Down Shirt');
    expect(detailRes.data.product.variants).toHaveLength(3);

    // 8. Seller pauses original product
    await productService.pauseProduct(sellerUserId, productId);
    const pausedProduct = db.products.get(productId);
    expect(pausedProduct.status).toBe(ProductStatus.PAUSED);

    // 9. Super Admin performs takedown on duplicated product for copyright policy violation
    const dupId = dupRes.data.product.id;
    const adminTakedownRes = await productService.takedownProduct('admin-user-id', dupId, {
      takedownReason: 'Unapproved brand logo reproduction',
    });
    expect(adminTakedownRes.success).toBe(true);
    const takenDownProduct = db.products.get(dupId);
    expect(takenDownProduct.status).toBe(ProductStatus.REMOVED_BY_ADMIN);
    expect(takenDownProduct.takedownReason).toBe('Unapproved brand logo reproduction');

    // 10. Seller soft deletes original product
    await productService.deleteProduct(sellerUserId, productId);
    const deletedProduct = db.products.get(productId);
    expect(deletedProduct.status).toBe(ProductStatus.SOFT_DELETED);
    expect(deletedProduct.deletedAt).not.toBeNull();

    // Verify audit logs were captured
    const auditActions = Array.from(db.auditLogs.values()).map((a) => a.action);
    expect(auditActions).toContain('PRODUCT_CREATED');
    expect(auditActions).toContain('PRODUCT_VARIANT_CREATED');
    expect(auditActions).toContain('PRODUCT_UPDATED');
    expect(auditActions).toContain('PRODUCT_DUPLICATED');
    expect(auditActions).toContain('PRODUCT_PAUSED');
    expect(auditActions).toContain('PRODUCT_TAKEDOWN_BY_ADMIN');
    expect(auditActions).toContain('PRODUCT_DELETED');
  });
});
