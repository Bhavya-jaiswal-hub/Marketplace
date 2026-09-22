import {
  Prisma,
  ProductStatus,
  SellerCategoryStatus,
  SellerStatus,
} from '@prisma/client';
import { ProductService } from '../src/product/product.service';
import { CategoryService } from '../src/category/category.service';
import { AuditService } from '../src/audit/audit.service';

describe('Product Catalog Lifecycle Integration Flow', () => {
  let productService: ProductService;
  let categoryService: CategoryService;
  let auditService: AuditService;

  const db = {
    users: new Map<string, any>(),
    sellerProfiles: new Map<string, any>(),
    categories: new Map<string, any>(),
    sellerCategories: new Map<string, any>(),
    products: new Map<string, any>(),
    productImages: new Map<string, any>(),
    productSpecifications: new Map<string, any>(),
    inventories: new Map<string, any>(),
    inventoryHistories: new Map<string, any>(),
    auditLogs: new Map<string, any>(),
  };

  beforeEach(() => {
    db.users.clear();
    db.sellerProfiles.clear();
    db.categories.clear();
    db.sellerCategories.clear();
    db.products.clear();
    db.productImages.clear();
    db.productSpecifications.clear();
    db.inventories.clear();
    db.inventoryHistories.clear();
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
        findUnique: jest.fn(async ({ where }: any) => db.categories.get(where.id) || null),
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
          let p = null;
          if (where.sku) {
            for (const prod of db.products.values()) {
              if (prod.sku === where.sku) {
                p = prod;
                break;
              }
            }
          } else if (where.id) {
            p = db.products.get(where.id) || null;
          }

          if (!p) return null;
          const result = { ...p };
          if (include?.category) {
            result.category = db.categories.get(p.categoryId);
          }
          if (include?.seller) {
            result.seller = db.sellerProfiles.get(p.sellerId);
          }
          if (include?.images) {
            result.images = Array.from(db.productImages.values()).filter((img) => img.productId === p.id);
          }
          if (include?.specifications) {
            result.specifications = Array.from(db.productSpecifications.values()).filter((s) => s.productId === p.id);
          }
          if (include?.inventory) {
            for (const inv of db.inventories.values()) {
              if (inv.productId === p.id) {
                result.inventory = inv;
                break;
              }
            }
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

          // Search
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
            if (include?.inventory) {
              for (const inv of db.inventories.values()) {
                if (inv.productId === p.id) {
                  res.inventory = inv;
                  break;
                }
              }
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
      productImage: {
        count: jest.fn(async ({ where }: any) => {
          return Array.from(db.productImages.values()).filter((img) => img.productId === where.productId).length;
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
        updateMany: jest.fn(async ({ where, data }: any) => {
          for (const inv of db.inventories.values()) {
            if (inv.productId === where.productId) {
              Object.assign(inv, data);
            }
          }
          return { count: 1 };
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

  it('runs complete product creation, duplication, lifecycle status, and public discovery flow', async () => {
    // 1. Setup Seller & Category
    const sellerUserId = 'seller-user-1';
    const sellerId = 'seller-profile-1';
    db.sellerProfiles.set(sellerId, {
      id: sellerId,
      userId: sellerUserId,
      displayName: 'Acoustic Audio Hub',
      status: SellerStatus.APPROVED,
    });

    const categoryId = 'cat-headphones-1';
    db.categories.set(categoryId, {
      id: categoryId,
      name: 'Headphones & Audio',
      slug: 'headphones-audio',
      isActive: true,
    });

    // Grant seller approved permission for category
    db.sellerCategories.set(`sc-1`, {
      id: `sc-1`,
      sellerId,
      categoryId,
      status: SellerCategoryStatus.APPROVED,
    });

    // 2. Seller creates Product
    const createRes = await productService.createProduct(sellerUserId, {
      name: 'Studio Pro Wireless Headphones',
      description: 'Active noise cancelling studio quality headphones',
      sku: 'AUDIO-HP-001',
      price: 4999.0,
      categoryId,
      initialStock: 30,
      lowStockThreshold: 5,
      images: [
        { imageUrl: 'https://cdn.marketplace.com/hp-black-main.jpg', isPrimary: true },
        { imageUrl: 'https://cdn.marketplace.com/hp-black-side.jpg', isPrimary: false },
      ],
      specifications: [
        { name: 'Driver Size', value: '40mm' },
        { name: 'Battery', value: '45 Hours' },
      ],
    });

    expect(createRes.success).toBe(true);
    const productId = createRes.data.product.id;
    expect(createRes.data.product.sku).toBe('AUDIO-HP-001');

    // 3. Seller updates product price
    const updateRes = await productService.updateProduct(sellerUserId, productId, {
      price: 4499.0,
    });
    expect(updateRes.success).toBe(true);
    expect(updateRes.data.product.price.toNumber()).toBe(4499.0);

    // 4. Seller duplicates product for a different colorway
    const dupRes = await productService.duplicateProduct(sellerUserId, productId, {
      newSku: 'AUDIO-HP-002-SILVER',
      name: 'Studio Pro Wireless Headphones (Silver Edition)',
      initialStock: 15,
    });
    expect(dupRes.success).toBe(true);
    expect(dupRes.data.product.sku).toBe('AUDIO-HP-002-SILVER');

    // 5. Public customer lists products
    const publicList = await productService.listPublicProducts({
      categoryId,
      search: 'Studio',
    });
    expect(publicList.data.items).toHaveLength(2);
    expect(publicList.data.items[0].inStock).toBe(true);

    // 6. Public customer gets product details
    const detailRes = await productService.getPublicProduct(productId);
    expect(detailRes.success).toBe(true);
    expect(detailRes.data.product.name).toBe('Studio Pro Wireless Headphones');
    expect(detailRes.data.product.availableQuantity).toBe(30);

    // 7. Seller pauses original product
    await productService.pauseProduct(sellerUserId, productId);
    const pausedProduct = db.products.get(productId);
    expect(pausedProduct.status).toBe(ProductStatus.PAUSED);

    // 8. Seller soft deletes duplicated product
    const dupId = dupRes.data.product.id;
    await productService.deleteProduct(sellerUserId, dupId);
    const deletedProduct = db.products.get(dupId);
    expect(deletedProduct.status).toBe(ProductStatus.DELETED);
    expect(deletedProduct.deletedAt).not.toBeNull();

    // Verify audit logs were captured
    const auditActions = Array.from(db.auditLogs.values()).map((a) => a.action);
    expect(auditActions).toContain('PRODUCT_CREATED');
    expect(auditActions).toContain('PRODUCT_UPDATED');
    expect(auditActions).toContain('PRODUCT_DUPLICATED');
    expect(auditActions).toContain('PRODUCT_PAUSED');
    expect(auditActions).toContain('PRODUCT_DELETED');
  });
});
