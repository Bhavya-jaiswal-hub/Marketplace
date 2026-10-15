import {
  CartStatus,
  CustomerAddressType,
  ProductStatus,
} from '@prisma/client';
import { CustomerService } from '../src/customer/customer.service';
import { CartService, PLATFORM_SHIPPING_CONFIG } from '../src/cart/cart.service';
import { AuditService } from '../src/audit/audit.service';

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
    productVariants: new Map<string, any>(),
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
    db.productVariants.clear();
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
            const prod = db.products.get(item.productId);
            const variant = db.productVariants.get(item.variantId);

            if (include?.product && prod) {
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
                  (inv) => inv.variantId === item.variantId || inv.productId === prod.id,
                );
              }
              res.product = prodCopy;
            }

            if (include?.variant && variant) {
              const variantCopy = { ...variant };
              if (include.variant.include?.inventory) {
                variantCopy.inventory = Array.from(db.inventories.values()).find(
                  (inv) => inv.variantId === variant.id,
                );
              }
              res.variant = variantCopy;
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
              const prod = db.products.get(item.productId);
              const variant = db.productVariants.get(item.variantId);

              if (include?.product && prod) {
                res.product = { ...prod };
              }
              if (include?.variant && variant) {
                const variantCopy = { ...variant };
                if (include.variant.include?.inventory) {
                  variantCopy.inventory = Array.from(db.inventories.values()).find(
                    (inv) => inv.variantId === variant.id,
                  );
                }
                res.variant = variantCopy;
              }
              return res;
            }
          }
          return null;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.cartId_variantId) {
            for (const item of db.cartItems.values()) {
              if (
                item.cartId === where.cartId_variantId.cartId &&
                item.variantId === where.cartId_variantId.variantId
              ) {
                return item;
              }
            }
          }
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
        findFirst: jest.fn(async ({ where }: any) => {
          const prod = db.products.get(where.id);
          if (!prod) return null;
          if (where.deletedAt === null && prod.deletedAt) return null;
          return { ...prod };
        }),
      },
      productVariant: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          const variant = db.productVariants.get(where.id);
          if (!variant) return null;
          const res = { ...variant };
          if (include?.product) {
            res.product = db.products.get(variant.productId);
          }
          if (include?.inventory) {
            res.inventory = Array.from(db.inventories.values()).find(
              (inv) => inv.variantId === variant.id,
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

  it('should execute full end-to-end customer and multi-seller shopping cart lifecycle with variants and shipping calculation', async () => {
    // 1. Setup Customer User
    const customerUser = {
      id: 'cust-user-1',
      fullName: 'Rahul Sharma',
      email: 'rahul@example.com',
      mobileNumber: '9876543210',
    };
    db.users.set(customerUser.id, customerUser);

    // 2. Setup Category & Two Distinct Sellers with Clothing Products and Size x Color Variants
    const catClothing = { id: 'cat-cloth', name: "Men's Clothing", slug: 'mens-clothing' };
    db.categories.set(catClothing.id, catClothing);

    const sellerA = { id: 'seller-a', userId: 'usr-sel-a', displayName: 'Apex Apparel' };
    const sellerB = { id: 'seller-b', userId: 'usr-sel-b', displayName: 'Heritage Cotton' };
    db.sellerProfiles.set(sellerA.id, sellerA);
    db.sellerProfiles.set(sellerB.id, sellerB);

    const productA = {
      id: 'prod-a',
      sellerId: sellerA.id,
      categoryId: catClothing.id,
      name: 'Cotton Oxford Shirt',
      sku: 'SHIRT-OXFORD',
      price: 1499.0,
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    };
    const productB = {
      id: 'prod-b',
      sellerId: sellerB.id,
      categoryId: catClothing.id,
      name: 'Slim Fit Denim Jeans',
      sku: 'JEANS-SLIM',
      price: 799.0,
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    };
    db.products.set(productA.id, productA);
    db.products.set(productB.id, productB);

    // Variants for Product A (Seller A)
    const variantA = {
      id: 'var-a-m',
      productId: productA.id,
      sku: 'SHIRT-OXFORD-BLU-M',
      size: 'M',
      color: 'Blue',
      priceOverride: null,
      stockQuantity: 15,
      isActive: true,
    };
    db.productVariants.set(variantA.id, variantA);

    // Variants for Product B (Seller B)
    const variantB = {
      id: 'var-b-32',
      productId: productB.id,
      sku: 'JEANS-SLIM-BLK-32',
      size: '32',
      color: 'Black',
      priceOverride: null,
      stockQuantity: 20,
      isActive: true,
    };
    db.productVariants.set(variantB.id, variantB);

    db.productImages.set('img-a', {
      id: 'img-a',
      productId: productA.id,
      imageUrl: 'https://cdn.example.com/shirt.jpg',
      isPrimary: true,
      displayOrder: 0,
    });
    db.productImages.set('img-b', {
      id: 'img-b',
      productId: productB.id,
      imageUrl: 'https://cdn.example.com/jeans.jpg',
      isPrimary: true,
      displayOrder: 0,
    });

    db.inventories.set('inv-a', {
      id: 'inv-a',
      variantId: variantA.id,
      productId: productA.id,
      availableQuantity: 15,
      reservedQuantity: 0,
      totalQuantity: 15,
    });
    db.inventories.set('inv-b', {
      id: 'inv-b',
      variantId: variantB.id,
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

    // 4. Multi-Seller Shopping Cart Operations
    // Add Variant A (Seller A, ₹1,499 >= ₹999 -> free shipping from Seller A)
    const addRes1 = await cartService.addItem(customerUser.id, {
      variantId: variantA.id,
      quantity: 1,
    });
    expect(addRes1.data.items).toHaveLength(1);
    expect(addRes1.data.subtotal).toBe(1499.0);
    expect(addRes1.data.shippingAmount).toBe(0); // ₹1499 >= ₹999 -> Free shipping

    // Add Variant B (Seller B, ₹799 < ₹999 -> ₹79 flat shipping for Seller B)
    const addRes2 = await cartService.addItem(customerUser.id, {
      variantId: variantB.id,
      quantity: 1,
    });
    expect(addRes2.data.items).toHaveLength(2);
    // Subtotal = 1499 + 799 = ₹2,298
    expect(addRes2.data.subtotal).toBe(2298.0);
    // Shipping: Seller A = ₹0, Seller B = ₹79. Total shipping = ₹79
    expect(addRes2.data.shippingAmount).toBe(79.0);
    expect(addRes2.data.totalAmount).toBe(2377.0);

    // Verify Seller Groups & Nudge
    expect(addRes2.data.sellerGroups).toHaveLength(2);
    const groupB = addRes2.data.sellerGroups.find((g: any) => g.sellerId === sellerB.id);
    expect(groupB).toBeDefined();
    expect(groupB!.freeShippingEligible).toBe(false);
    expect(groupB!.amountNeededForFreeShipping).toBe(200.0); // 999 - 799 = 200
    expect(groupB!.freeShippingNudge).toContain('Add ₹200 more for free shipping');

    // Add Variant B again -> verifies automatic quantity merge and free shipping unlock (799 * 2 = 1598 >= 999)
    const addResMerge = await cartService.addItem(customerUser.id, {
      variantId: variantB.id,
      quantity: 1,
    });
    expect(addResMerge.data.items).toHaveLength(2);
    expect(addResMerge.data.totalQuantity).toBe(3);
    // Subtotal = 1499 + 1598 = ₹3,097
    expect(addResMerge.data.subtotal).toBe(3097.0);
    // Now both Seller A and Seller B have subtotals >= 999 -> Total Shipping = ₹0
    expect(addResMerge.data.shippingAmount).toBe(0);
    expect(addResMerge.data.totalAmount).toBe(3097.0);

    // 5. Pre-Checkout Cart Validation (Valid)
    const valResValid = await cartService.validateCart(customerUser.id);
    expect(valResValid.data.isValid).toBe(true);
    expect(valResValid.data.errors).toHaveLength(0);
    expect(valResValid.data.subtotal).toBe(3097.0);

    // 6. Pre-Checkout Cart Validation with Depleted Stock
    const invA = db.inventories.get('inv-a');
    db.inventories.set('inv-a', { ...invA, availableQuantity: 0 }); // out of stock

    const valResLowStock = await cartService.validateCart(customerUser.id);
    expect(valResLowStock.data.isValid).toBe(false);
    expect(valResLowStock.data.errors.length).toBeGreaterThan(0);
    expect(valResLowStock.data.errors[0]).toContain('only has 0 units available');

    // Restore stock
    db.inventories.set('inv-a', { ...invA, availableQuantity: 15 });

    // 7. Adjust Cart Item Quantity & Clear Cart
    const itemB = Array.from(db.cartItems.values()).find(
      (i) => i.variantId === variantB.id,
    );
    const updateRes = await cartService.updateItemQuantity(
      customerUser.id,
      itemB!.id,
      { quantity: 1 },
    );
    expect(updateRes.data.totalQuantity).toBe(2);

    // Clear cart
    const clearRes = await cartService.clearCart(customerUser.id);
    expect(clearRes.success).toBe(true);

    const emptyCart = await cartService.getCart(customerUser.id);
    expect(emptyCart.data.items).toHaveLength(0);
    expect(emptyCart.data.subtotal).toBe(0);
    expect(emptyCart.data.shippingAmount).toBe(0);
  });
});
