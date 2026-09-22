import {
  CartStatus,
  CustomerAddressType,
  ProductStatus,
} from '@prisma/client';
import { CustomerService } from '../src/customer/customer.service';
import { CartService } from '../src/cart/cart.service';
import { AuditService } from '../src/audit/audit.service';
import { BadRequestException } from '@nestjs/common';

describe('Customer Profile, Delivery Addresses & Multi-Seller Cart Integration Flow', () => {
  let customerService: CustomerService;
  let cartService: CartService;
  let auditService: AuditService;

  const db = {
    users: new Map<string, any>(),
    customerProfiles: new Map<string, any>(),
    customerAddresses: new Map<string, any>(),
    categories: new Map<string, any>(),
    sellerProfiles: new Map<string, any>(),
    products: new Map<string, any>(),
    productImages: new Map<string, any>(),
    inventories: new Map<string, any>(),
    carts: new Map<string, any>(),
    cartItems: new Map<string, any>(),
    auditLogs: new Map<string, any>(),
  };

  beforeEach(() => {
    db.users.clear();
    db.customerProfiles.clear();
    db.customerAddresses.clear();
    db.categories.clear();
    db.sellerProfiles.clear();
    db.products.clear();
    db.productImages.clear();
    db.inventories.clear();
    db.carts.clear();
    db.cartItems.clear();
    db.auditLogs.clear();

    const mockPrisma: any = {
      user: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          const user = db.users.get(where.id);
          if (!user) return null;
          const res = { ...user };
          if (include?.customerProfile) {
            for (const p of db.customerProfiles.values()) {
              if (p.userId === user.id) {
                res.customerProfile = p;
                break;
              }
            }
          }
          return res;
        }),
      },
      customerProfile: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.userId) {
            for (const p of db.customerProfiles.values()) {
              if (p.userId === where.userId) return p;
            }
          }
          return db.customerProfiles.get(where.id) || null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const id = `prof-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.customerProfiles.set(id, rec);
          return rec;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const rec = db.customerProfiles.get(where.id);
          const updated = { ...rec, ...data, updatedAt: new Date() };
          db.customerProfiles.set(where.id, updated);
          return updated;
        }),
      },
      customerAddress: {
        findMany: jest.fn(async ({ where }: any) => {
          let list = Array.from(db.customerAddresses.values());
          if (where?.customerId) {
            list = list.filter((a) => a.customerId === where.customerId);
          }
          if (where?.isActive !== undefined) {
            list = list.filter((a) => a.isActive === where.isActive);
          }
          return list;
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          for (const a of db.customerAddresses.values()) {
            let match = true;
            if (where.id && a.id !== where.id) match = false;
            if (where.customerId && a.customerId !== where.customerId) match = false;
            if (where.isActive !== undefined && a.isActive !== where.isActive)
              match = false;
            if (match) return a;
          }
          return null;
        }),
        count: jest.fn(async ({ where }: any) => {
          let list = Array.from(db.customerAddresses.values());
          if (where?.customerId) {
            list = list.filter((a) => a.customerId === where.customerId);
          }
          if (where?.isActive !== undefined) {
            list = list.filter((a) => a.isActive === where.isActive);
          }
          return list.length;
        }),
        create: jest.fn(async ({ data }: any) => {
          const id = `addr-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.customerAddresses.set(id, rec);
          return rec;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const rec = db.customerAddresses.get(where.id);
          const updated = { ...rec, ...data, updatedAt: new Date() };
          db.customerAddresses.set(where.id, updated);
          return updated;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const [id, a] of db.customerAddresses.entries()) {
            let match = true;
            if (where.customerId && a.customerId !== where.customerId) match = false;
            if (where.isActive !== undefined && a.isActive !== where.isActive)
              match = false;
            if (where.id?.not && a.id === where.id.not) match = false;
            if (match) {
              db.customerAddresses.set(id, { ...a, ...data, updatedAt: new Date() });
              count++;
            }
          }
          return { count };
        }),
      },
      cart: {
        findFirst: jest.fn(async ({ where }: any) => {
          for (const c of db.carts.values()) {
            let match = true;
            if (where.customerId && c.customerId !== where.customerId) match = false;
            if (where.status && c.status !== where.status) match = false;
            if (match) return c;
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const id = `cart-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.carts.set(id, rec);
          return rec;
        }),
      },
      cartItem: {
        findMany: jest.fn(async ({ where, include }: any) => {
          let list = Array.from(db.cartItems.values());
          if (where?.cartId) {
            list = list.filter((item) => item.cartId === where.cartId);
          }
          return list.map((item) => {
            const res = { ...item };
            if (include?.product) {
              const prod = db.products.get(item.productId);
              if (prod) {
                const prodCopy = { ...prod };
                if (include.product.include?.images) {
                  prodCopy.images = Array.from(db.productImages.values()).filter(
                    (img) => img.productId === prod.id,
                  );
                }
                if (include.product.include?.category) {
                  prodCopy.category = db.categories.get(prod.categoryId);
                }
                if (include.product.include?.seller) {
                  prodCopy.seller = db.sellerProfiles.get(prod.sellerId);
                }
                if (include.product.include?.inventory) {
                  prodCopy.inventory = Array.from(db.inventories.values()).find(
                    (inv) => inv.productId === prod.id,
                  );
                }
                res.product = prodCopy;
              }
            }
            return res;
          });
        }),
        findFirst: jest.fn(async ({ where, include }: any) => {
          for (const item of db.cartItems.values()) {
            let match = true;
            if (where.id && item.id !== where.id) match = false;
            if (where.cartId && item.cartId !== where.cartId) match = false;
            if (match) {
              const res = { ...item };
              if (include?.product) {
                const prod = db.products.get(item.productId);
                if (prod) {
                  const prodCopy = { ...prod };
                  if (include.product.include?.inventory) {
                    prodCopy.inventory = Array.from(db.inventories.values()).find(
                      (inv) => inv.productId === prod.id,
                    );
                  }
                  res.product = prodCopy;
                }
              }
              return res;
            }
          }
          return null;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.cartId_productId) {
            for (const item of db.cartItems.values()) {
              if (
                item.cartId === where.cartId_productId.cartId &&
                item.productId === where.cartId_productId.productId
              ) {
                return item;
              }
            }
          }
          return db.cartItems.get(where.id) || null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const id = `item-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.cartItems.set(id, rec);
          return rec;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const rec = db.cartItems.get(where.id);
          const updated = { ...rec, ...data, updatedAt: new Date() };
          db.cartItems.set(where.id, updated);
          return updated;
        }),
        delete: jest.fn(async ({ where }: any) => {
          const rec = db.cartItems.get(where.id);
          db.cartItems.delete(where.id);
          return rec;
        }),
        deleteMany: jest.fn(async ({ where }: any) => {
          let count = 0;
          for (const [id, item] of db.cartItems.entries()) {
            if (where.cartId && item.cartId === where.cartId) {
              db.cartItems.delete(id);
              count++;
            }
          }
          return { count };
        }),
      },
      product: {
        findFirst: jest.fn(async ({ where, include }: any) => {
          const prod = db.products.get(where.id);
          if (!prod) return null;
          if (where.deletedAt === null && prod.deletedAt) return null;
          const res = { ...prod };
          if (include?.inventory) {
            res.inventory = Array.from(db.inventories.values()).find(
              (inv) => inv.productId === prod.id,
            );
          }
          return res;
        }),
      },
      auditLog: {
        create: jest.fn(async ({ data }: any) => {
          const id = `audit-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date() };
          db.auditLogs.set(id, rec);
          return rec;
        }),
      },
    };

    auditService = new AuditService(mockPrisma);
    customerService = new CustomerService(mockPrisma, auditService);
    cartService = new CartService(mockPrisma, customerService);
  });

  it('should execute full end-to-end customer and multi-seller shopping cart lifecycle', async () => {
    // 1. Setup Customer User
    const customerUser = {
      id: 'cust-user-1',
      fullName: 'Rahul Sharma',
      email: 'rahul@example.com',
      mobileNumber: '9876543210',
    };
    db.users.set(customerUser.id, customerUser);

    // 2. Setup Category & Two Distinct Sellers with Products
    const catElectronics = { id: 'cat-elec', name: 'Electronics', slug: 'electronics' };
    db.categories.set(catElectronics.id, catElectronics);

    const sellerA = { id: 'seller-a', userId: 'usr-sel-a', displayName: 'Apex Tech' };
    const sellerB = { id: 'seller-b', userId: 'usr-sel-b', displayName: 'Byte Gadgets' };
    db.sellerProfiles.set(sellerA.id, sellerA);
    db.sellerProfiles.set(sellerB.id, sellerB);

    const productA = {
      id: 'prod-a',
      sellerId: sellerA.id,
      categoryId: catElectronics.id,
      name: 'Wireless Mechanical Keyboard',
      sku: 'KEY-RGB-01',
      price: 3499.0,
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    };
    const productB = {
      id: 'prod-b',
      sellerId: sellerB.id,
      categoryId: catElectronics.id,
      name: 'Ergonomic Vertical Mouse',
      sku: 'MOU-ERG-02',
      price: 1899.0,
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    };
    db.products.set(productA.id, productA);
    db.products.set(productB.id, productB);

    db.productImages.set('img-a', {
      id: 'img-a',
      productId: productA.id,
      imageUrl: 'https://cdn.example.com/keyboard.jpg',
      isPrimary: true,
      displayOrder: 0,
    });
    db.productImages.set('img-b', {
      id: 'img-b',
      productId: productB.id,
      imageUrl: 'https://cdn.example.com/mouse.jpg',
      isPrimary: true,
      displayOrder: 0,
    });

    db.inventories.set('inv-a', {
      id: 'inv-a',
      productId: productA.id,
      availableQuantity: 15,
      reservedQuantity: 0,
      totalQuantity: 15,
    });
    db.inventories.set('inv-b', {
      id: 'inv-b',
      productId: productB.id,
      availableQuantity: 20,
      reservedQuantity: 0,
      totalQuantity: 20,
    });

    // 3. Customer Profile Onboarding & Address Management
    const profileRes = await customerService.getOrCreateProfile(customerUser.id);
    expect(profileRes.success).toBe(true);
    expect(profileRes.data.firstName).toBe('Rahul');
    expect(profileRes.data.lastName).toBe('Sharma');

    // Add Primary Home Address
    const addrHomeRes = await customerService.createAddress(customerUser.id, {
      fullName: 'Rahul Sharma',
      phoneNumber: '9876543210',
      addressLine1: 'Flat 402, Sunset Heights',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      addressType: CustomerAddressType.HOME,
    });
    expect(addrHomeRes.success).toBe(true);
    expect(addrHomeRes.data.isDefaultShipping).toBe(true);

    // Add Work Address
    const addrWorkRes = await customerService.createAddress(customerUser.id, {
      fullName: 'Rahul Sharma (Office)',
      phoneNumber: '9876543210',
      addressLine1: 'Level 5, Infinity Cyberpark',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400051',
      addressType: CustomerAddressType.WORK,
    });
    expect(addrWorkRes.success).toBe(true);
    expect(addrWorkRes.data.isDefaultShipping).toBe(false);

    // 4. Multi-Seller Shopping Cart Operations
    // Add Product A (Seller A)
    const addRes1 = await cartService.addItem(customerUser.id, {
      productId: productA.id,
      quantity: 1,
    });
    expect(addRes1.data.items).toHaveLength(1);
    expect(addRes1.data.subtotal).toBe(3499.0);

    // Add Product B (Seller B)
    const addRes2 = await cartService.addItem(customerUser.id, {
      productId: productB.id,
      quantity: 2,
    });
    expect(addRes2.data.items).toHaveLength(2);
    // Subtotal = (3499 * 1) + (1899 * 2) = 3499 + 3798 = 7297
    expect(addRes2.data.subtotal).toBe(7297.0);
    expect(addRes2.data.totalQuantity).toBe(3);

    // Add Product A again -> verifies automatic quantity merge
    const addResMerge = await cartService.addItem(customerUser.id, {
      productId: productA.id,
      quantity: 1,
    });
    expect(addResMerge.data.items).toHaveLength(2);
    // Product A quantity is now 2. Subtotal = (3499 * 2) + (1899 * 2) = 6998 + 3798 = 10796
    expect(addResMerge.data.subtotal).toBe(10796.0);
    expect(addResMerge.data.totalQuantity).toBe(4);

    // 5. Pre-Checkout Cart Validation (Valid)
    const valResValid = await cartService.validateCart(customerUser.id);
    expect(valResValid.data.isValid).toBe(true);
    expect(valResValid.data.errors).toHaveLength(0);
    expect(valResValid.data.subtotal).toBe(10796.0);

    // 6. Pre-Checkout Cart Validation with Inactive or Depleted Stock
    // Simulate Seller A's product running out of stock
    const invA = db.inventories.get('inv-a');
    db.inventories.set('inv-a', { ...invA, availableQuantity: 1 }); // only 1 left, but cart requested 2

    const valResLowStock = await cartService.validateCart(customerUser.id);
    expect(valResLowStock.data.isValid).toBe(false);
    expect(valResLowStock.data.errors.length).toBeGreaterThan(0);
    expect(valResLowStock.data.errors[0]).toContain('only has 1 units available');

    // 7. Adjust Cart & Clear Cart
    // Adjust Product A to 1 unit
    const itemA = Array.from(db.cartItems.values()).find(
      (i) => i.productId === productA.id,
    );
    const updateRes = await cartService.updateItemQuantity(
      customerUser.id,
      itemA!.id,
      { quantity: 1 },
    );
    expect(updateRes.data.totalQuantity).toBe(3);

    // Re-validate -> now valid again
    const valResFixed = await cartService.validateCart(customerUser.id);
    expect(valResFixed.data.isValid).toBe(true);

    // Clear cart
    const clearRes = await cartService.clearCart(customerUser.id);
    expect(clearRes.success).toBe(true);

    const emptyCart = await cartService.getCart(customerUser.id);
    expect(emptyCart.data.items).toHaveLength(0);
    expect(emptyCart.data.subtotal).toBe(0);
  });
});
