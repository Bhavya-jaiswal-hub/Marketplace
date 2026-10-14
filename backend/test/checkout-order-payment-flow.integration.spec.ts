import {
  CommissionStatus,
  CustomerAddressType,
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
  ProductStatus,
} from '@prisma/client';
import * as crypto from 'crypto';
import { CustomerService } from '../src/customer/customer.service';
import { CartService } from '../src/cart/cart.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { OrderService } from '../src/order/order.service';
import { PaymentService } from '../src/payment/payment.service';
import { AuditService } from '../src/audit/audit.service';

describe('Multi-Seller Checkout, Order Creation, Razorpay Payment & Fulfillment Flow', () => {
  let customerService: CustomerService;
  let cartService: CartService;
  let inventoryService: InventoryService;
  let orderService: OrderService;
  let paymentService: PaymentService;
  let auditService: AuditService;

  const razorpayKeySecret = 'rzp_test_secret_integ';
  const razorpayWebhookSecret = 'rzp_webhook_secret_integ';

  const db = {
    users: new Map<string, any>(),
    customerProfiles: new Map<string, any>(),
    customerAddresses: new Map<string, any>(),
    categories: new Map<string, any>(),
    categoryCommissions: new Map<string, any>(),
    sellerProfiles: new Map<string, any>(),
    products: new Map<string, any>(),
    productVariants: new Map<string, any>(),
    productImages: new Map<string, any>(),
    inventories: new Map<string, any>(),
    inventoryHistories: new Map<string, any>(),
    carts: new Map<string, any>(),
    cartItems: new Map<string, any>(),
    orders: new Map<string, any>(),
    orderItems: new Map<string, any>(),
    orderItemHistories: new Map<string, any>(),
    paymentsPending: new Map<string, any>(),
    paymentTransactions: new Map<string, any>(),
    auditLogs: new Map<string, any>(),
  };

  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = razorpayKeySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = razorpayWebhookSecret;

    Object.values(db).forEach((map) => map.clear());

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
      },
      customerAddress: {
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
        findMany: jest.fn(async ({ where }: any) => {
          return Array.from(db.customerAddresses.values()).filter(
            (a) => a.customerId === where.customerId && a.isActive,
          );
        }),
        count: jest.fn(async () => db.customerAddresses.size),
        create: jest.fn(async ({ data }: any) => {
          const id = `addr-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.customerAddresses.set(id, rec);
          return rec;
        }),
        updateMany: jest.fn(async () => ({ count: 0 })),
      },
      sellerProfile: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.userId) {
            for (const s of db.sellerProfiles.values()) {
              if (s.userId === where.userId) return s;
            }
          }
          return db.sellerProfiles.get(where.id) || null;
        }),
      },
      cart: {
        findFirst: jest.fn(async ({ where }: any) => {
          for (const c of db.carts.values()) {
            if (c.customerId === where.customerId && c.status === where.status) {
              const res = { ...c };
              res.items = Array.from(db.cartItems.values())
                .filter((item) => item.cartId === c.id)
                .map((item) => {
                  const itemCopy = { ...item };
                  const prod = db.products.get(item.productId);
                  const variant = db.productVariants.get(item.variantId);
                  if (prod) {
                    const prodCopy = { ...prod };
                    const cat = db.categories.get(prod.categoryId);
                    if (cat) {
                      prodCopy.category = {
                        ...cat,
                        commissions: Array.from(
                          db.categoryCommissions.values(),
                        ).filter(
                          (comm) =>
                            comm.categoryId === cat.id &&
                            comm.status === CommissionStatus.ACTIVE,
                        ),
                      };
                    }
                    prodCopy.seller = db.sellerProfiles.get(prod.sellerId);
                    itemCopy.product = prodCopy;
                  }
                  if (variant) {
                    const variantCopy = { ...variant };
                    variantCopy.inventory = Array.from(db.inventories.values()).find(
                      (inv) => inv.variantId === variant.id,
                    );
                    itemCopy.variant = variantCopy;
                  }
                  return itemCopy;
                });
              return res;
            }
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
        findMany: jest.fn(async ({ where, include }: any) => {
          let list = Array.from(db.cartItems.values()).filter(
            (i) => i.cartId === where.cartId,
          );
          return list.map((item) => {
            const itemCopy = { ...item };
            const prod = db.products.get(item.productId);
            const variant = db.productVariants.get(item.variantId);

            if (include?.product && prod) {
              const prodCopy = { ...prod };
              if (include.product.include?.images) {
                prodCopy.images = Array.from(db.productImages.values()).filter(
                  (img) => img.productId === prod.id,
                );
              } else {
                prodCopy.images = [];
              }
              if (include.product.include?.category) {
                const cat = db.categories.get(prod.categoryId);
                if (cat) {
                  const catCopy = { ...cat };
                  if (include.product.include.category.include?.commissions) {
                    catCopy.commissions = Array.from(
                      db.categoryCommissions.values(),
                    ).filter((c: any) => c.categoryId === cat.id);
                  }
                  prodCopy.category = catCopy;
                }
              }
              if (include.product.include?.seller) {
                prodCopy.seller = db.sellerProfiles.get(prod.sellerId);
              }
              if (include.product.include?.inventory) {
                prodCopy.inventory = Array.from(db.inventories.values()).find(
                  (inv) => inv.variantId === item.variantId || inv.productId === prod.id,
                );
              }
              itemCopy.product = prodCopy;
            }

            if (include?.variant && variant) {
              const variantCopy = { ...variant };
              if (include.variant.include?.inventory) {
                variantCopy.inventory = Array.from(db.inventories.values()).find(
                  (inv) => inv.variantId === variant.id,
                );
              }
              itemCopy.variant = variantCopy;
            }

            return itemCopy;
          });
        }),
        create: jest.fn(async ({ data }: any) => {
          const id = `item-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.cartItems.set(id, rec);
          return rec;
        }),
        deleteMany: jest.fn(async ({ where }: any) => {
          let count = 0;
          for (const [id, item] of db.cartItems.entries()) {
            if (item.cartId === where.cartId) {
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
          return { ...prod };
        }),
      },
      productVariant: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          const variant = db.productVariants.get(where.id);
          if (!variant) return null;
          const res = { ...variant };
          if (include?.product) {
            const prod = db.products.get(variant.productId);
            if (prod) {
              const prodCopy = { ...prod };
              if (include.product.include?.category) {
                const cat = db.categories.get(prod.categoryId);
                if (cat) {
                  const catCopy = { ...cat };
                  if (include.product.include.category.include?.commissions) {
                    catCopy.commissions = Array.from(
                      db.categoryCommissions.values(),
                    ).filter((c: any) => c.categoryId === cat.id);
                  }
                  prodCopy.category = catCopy;
                }
              }
              if (include.product.include?.seller) {
                prodCopy.seller = db.sellerProfiles.get(prod.sellerId);
              }
              res.product = prodCopy;
            }
          }
          if (include?.inventory) {
            res.inventory = Array.from(db.inventories.values()).find(
              (inv) => inv.variantId === variant.id,
            );
          }
          return res;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const variant = db.productVariants.get(where.id);
          const updated = { ...variant, ...data, updatedAt: new Date() };
          db.productVariants.set(where.id, updated);
          return updated;
        }),
      },
      inventory: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          let inv: any = null;
          if (where.variantId) {
            for (const item of db.inventories.values()) {
              if (item.variantId === where.variantId) {
                inv = item;
                break;
              }
            }
          } else if (where.productId) {
            for (const item of db.inventories.values()) {
              if (item.productId === where.productId) {
                inv = item;
                break;
              }
            }
          } else if (where.id) {
            inv = db.inventories.get(where.id) || null;
          }
          if (inv && include?.product) {
            return {
              ...inv,
              product: db.products.get(inv.productId),
            };
          }
          return inv;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const inv = db.inventories.get(where.id);
          const updated = { ...inv, ...data, updatedAt: new Date() };
          db.inventories.set(where.id, updated);
          return updated;
        }),
      },
      inventoryHistory: {
        create: jest.fn(async ({ data }: any) => {
          const id = `inv-hist-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date() };
          db.inventoryHistories.set(id, rec);
          return rec;
        }),
      },
      order: {
        create: jest.fn(async ({ data }: any) => {
          const id = `ord-${Date.now()}-${Math.random()}`;
          const { orderItems, ...orderProps } = data;
          const orderRec = {
            id,
            ...orderProps,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          db.orders.set(id, orderRec);

          if (orderItems?.create) {
            for (const itemData of orderItems.create) {
              const itemId = `oi-${Date.now()}-${Math.random()}`;
              const { history, ...itemProps } = itemData;
              const itemRec = {
                id: itemId,
                orderId: id,
                ...itemProps,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              db.orderItems.set(itemId, itemRec);

              if (history?.create) {
                const histId = `oih-${Date.now()}-${Math.random()}`;
                db.orderItemHistories.set(histId, {
                  id: histId,
                  orderItemId: itemId,
                  ...history.create,
                  createdAt: new Date(),
                });
              }
            }
          }
          return orderRec;
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          for (const o of db.orders.values()) {
            if (where.id && o.id !== where.id) continue;
            if (where.customerId && o.customerId !== where.customerId) continue;
            const res = { ...o };
            res.orderItems = Array.from(db.orderItems.values())
              .filter((i) => i.orderId === o.id)
              .map((i) => ({
                ...i,
                product: db.products.get(i.productId),
                variant: db.productVariants.get(i.variantId),
                history: Array.from(db.orderItemHistories.values()).filter(
                  (h) => h.orderItemId === i.id,
                ),
              }));
            res.paymentsPending = Array.from(db.paymentsPending.values()).filter(
              (p) => p.orderId === o.id,
            );
            res.paymentTransactions = Array.from(
              db.paymentTransactions.values(),
            ).filter((t) => t.orderId === o.id);
            return res;
          }
          return null;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          const o = db.orders.get(where.id);
          if (!o) return null;
          const res = { ...o };
          res.orderItems = Array.from(db.orderItems.values())
            .filter((i) => i.orderId === o.id)
            .map((i) => ({
              ...i,
              product: db.products.get(i.productId),
              variant: db.productVariants.get(i.variantId),
              history: Array.from(db.orderItemHistories.values()).filter(
                (h) => h.orderItemId === i.id,
              ),
            }));
          res.paymentsPending = Array.from(db.paymentsPending.values()).filter(
            (p) => p.orderId === o.id,
          );
          res.paymentTransactions = Array.from(
            db.paymentTransactions.values(),
          ).filter((t) => t.orderId === o.id);
          return res;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const o = db.orders.get(where.id);
          const updated = { ...o, ...data, updatedAt: new Date() };
          db.orders.set(where.id, updated);
          return updated;
        }),
      },
      orderItem: {
        findFirst: jest.fn(async ({ where }: any) => {
          for (const item of db.orderItems.values()) {
            let match = true;
            if (where.id && item.id !== where.id) match = false;
            if (where.orderId && item.orderId !== where.orderId) match = false;
            if (where.sellerId && item.sellerId !== where.sellerId) match = false;
            if (match) {
              const res = { ...item };
              res.order = db.orders.get(item.orderId);
              return res;
            }
          }
          return null;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          let list = Array.from(db.orderItems.values());
          if (where?.orderId) list = list.filter((i) => i.orderId === where.orderId);
          if (where?.sellerId) list = list.filter((i) => i.sellerId === where.sellerId);
          return list;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const item = db.orderItems.get(where.id);
          const updated = { ...item, ...data, updatedAt: new Date() };
          db.orderItems.set(where.id, updated);
          return updated;
        }),
      },
      orderItemHistory: {
        create: jest.fn(async ({ data }: any) => {
          const id = `oih-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date() };
          db.orderItemHistories.set(id, rec);
          return rec;
        }),
      },
      paymentPending: {
        create: jest.fn(async ({ data }: any) => {
          const id = `pay-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.paymentsPending.set(id, rec);
          return rec;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.paymentReference) {
            for (const p of db.paymentsPending.values()) {
              if (p.paymentReference === where.paymentReference) {
                const res = { ...p };
                const ord = db.orders.get(p.orderId);
                if (ord) {
                  res.order = {
                    ...ord,
                    orderItems: Array.from(db.orderItems.values()).filter(
                      (i) => i.orderId === ord.id,
                    ),
                  };
                }
                return res;
              }
            }
          }
          return null;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const p = db.paymentsPending.get(where.id);
          const updated = { ...p, ...data, updatedAt: new Date() };
          db.paymentsPending.set(where.id, updated);
          return updated;
        }),
      },
      paymentTransaction: {
        create: jest.fn(async ({ data }: any) => {
          const id = `tx-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.paymentTransactions.set(id, rec);
          return rec;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.providerTransactionId) {
            for (const tx of db.paymentTransactions.values()) {
              if (tx.providerTransactionId === where.providerTransactionId) return tx;
            }
          }
          return null;
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
      $transaction: jest.fn(async (cb: any) => cb(mockPrisma)),
    };

    auditService = new AuditService(mockPrisma);
    customerService = new CustomerService(mockPrisma, auditService);
    inventoryService = new InventoryService(mockPrisma, auditService);
    cartService = new CartService(mockPrisma, customerService);
    orderService = new OrderService(
      mockPrisma,
      customerService,
      inventoryService,
      auditService,
    );
    paymentService = new PaymentService(
      mockPrisma,
      inventoryService,
      auditService,
    );
  });

  it('should execute full end-to-end variant checkout, stock reservation, payment capture, and snapshot verification', async () => {
    // 1. Setup Customer User & Address
    const customerUser = {
      id: 'cust-usr-1',
      fullName: 'Anita Roy',
      email: 'anita@example.com',
      mobileNumber: '9123456780',
    };
    db.users.set(customerUser.id, customerUser);

    await customerService.getOrCreateProfile(customerUser.id);
    const addr = await customerService.createAddress(customerUser.id, {
      fullName: 'Anita Roy',
      phoneNumber: '9123456780',
      addressLine1: 'Villa 12, Palm Meadows',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500084',
      addressType: CustomerAddressType.HOME,
      isDefaultShipping: true,
    });

    // 2. Setup Category with 10% Commission
    const cat = { id: 'cat-apparel', name: "Women's Clothing", slug: 'womens-clothing' };
    db.categories.set(cat.id, cat);
    db.categoryCommissions.set('comm-1', {
      id: 'comm-1',
      categoryId: cat.id,
      commissionRate: 10.0,
      status: CommissionStatus.ACTIVE,
      effectiveFrom: new Date(),
    });

    // 3. Setup Seller A (Silk Kurti ₹4,000) & Seller B (Cotton Palazzo ₹1,500)
    const sellerA = { id: 'seller-a', userId: 'usr-sel-a', displayName: 'Silk & Loom' };
    const sellerB = { id: 'seller-b', userId: 'usr-sel-b', displayName: 'Cotton Crafts' };
    db.sellerProfiles.set(sellerA.id, sellerA);
    db.sellerProfiles.set(sellerB.id, sellerB);

    const productA = {
      id: 'prod-kurti',
      sellerId: sellerA.id,
      categoryId: cat.id,
      name: 'Embroidered Silk Kurti',
      sku: 'KURTI-SILK',
      price: 4000.0,
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    };
    const productB = {
      id: 'prod-palazzo',
      sellerId: sellerB.id,
      categoryId: cat.id,
      name: 'Flared Cotton Palazzo',
      sku: 'PALAZZO-COT',
      price: 1500.0,
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    };
    db.products.set(productA.id, productA);
    db.products.set(productB.id, productB);

    // Variants for Product A & B
    const variantA = {
      id: 'var-kurti-m-red',
      productId: productA.id,
      sku: 'KURTI-SILK-M-RED',
      size: 'M',
      color: 'Red',
      priceOverride: null,
      stockQuantity: 10,
      isActive: true,
    };
    const variantB = {
      id: 'var-palazzo-l-wht',
      productId: productB.id,
      sku: 'PALAZZO-COT-L-WHT',
      size: 'L',
      color: 'White',
      priceOverride: null,
      stockQuantity: 10,
      isActive: true,
    };
    db.productVariants.set(variantA.id, variantA);
    db.productVariants.set(variantB.id, variantB);

    // Initial Inventory: 10 units each
    db.inventories.set('inv-a', {
      id: 'inv-a',
      variantId: variantA.id,
      productId: productA.id,
      availableQuantity: 10,
      reservedQuantity: 0,
      totalQuantity: 10,
    });
    db.inventories.set('inv-b', {
      id: 'inv-b',
      variantId: variantB.id,
      productId: productB.id,
      availableQuantity: 10,
      reservedQuantity: 0,
      totalQuantity: 10,
    });

    // 4. Customer adds 1 Kurti and 2 Palazzos to cart
    await cartService.addItem(customerUser.id, {
      variantId: variantA.id,
      quantity: 1,
    });
    await cartService.addItem(customerUser.id, {
      variantId: variantB.id,
      quantity: 2,
    });

    // Total Cart Value: (4000 * 1) + (1500 * 2) = 4000 + 3000 = ₹7,000
    // Both Seller A (₹4000 >= ₹999) and Seller B (₹3000 >= ₹999) have subtotal >= ₹999 -> Free shipping!

    // 5. Initiate Checkout
    const checkoutRes = await orderService.initiateCheckout(customerUser.id, {
      shippingAddressId: addr.data.id,
    });

    expect(checkoutRes.success).toBe(true);
    expect(checkoutRes.data.amount).toBe(7000.0);
    const { orderId, paymentReference, providerOrderReference } = checkoutRes.data;

    // Check that inventory was atomically reserved per variant:
    // Variant A: 1 unit reserved (available 9, reserved 1)
    // Variant B: 2 units reserved (available 8, reserved 2)
    const invAAfterCheckout = db.inventories.get('inv-a');
    const invBAfterCheckout = db.inventories.get('inv-b');
    expect(invAAfterCheckout.availableQuantity).toBe(9);
    expect(invAAfterCheckout.reservedQuantity).toBe(1);
    expect(invBAfterCheckout.availableQuantity).toBe(8);
    expect(invBAfterCheckout.reservedQuantity).toBe(2);

    // 6. Complete Razorpay Payment with HMAC-SHA256 signature
    const razorpayPaymentId = 'pay_integ_success_123';
    const razorpaySignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${providerOrderReference}|${razorpayPaymentId}`)
      .digest('hex');

    const paymentConfirmRes = await paymentService.verifyClientPayment(
      customerUser.id,
      {
        paymentReference,
        razorpayOrderId: providerOrderReference!,
        razorpayPaymentId,
        razorpaySignature,
      },
    );

    expect(paymentConfirmRes.success).toBe(true);
    expect(paymentConfirmRes.data.status).toBe(PaymentStatus.PAID);

    // Check that stock reservations are confirmed/deducted:
    // Variant A: totalQuantity = 9, reservedQuantity = 0, availableQuantity = 9
    // Variant B: totalQuantity = 8, reservedQuantity = 0, availableQuantity = 8
    const invAAfterPay = db.inventories.get('inv-a');
    const invBAfterPay = db.inventories.get('inv-b');
    expect(invAAfterPay.availableQuantity).toBe(9);
    expect(invAAfterPay.reservedQuantity).toBe(0);
    expect(invBAfterPay.availableQuantity).toBe(8);
    expect(invBAfterPay.reservedQuantity).toBe(0);

    // Check Order and OrderItems are in PLACED status and have snapshot attributes
    const placedOrder = await orderService.getCustomerOrder(
      customerUser.id,
      orderId,
    );
    expect(placedOrder.data.orderStatus).toBe(OrderStatus.PLACED);
    expect(placedOrder.data.paymentStatus).toBe(PaymentStatus.PAID);
    expect(placedOrder.data.orderItems).toHaveLength(2);

    const itemKurti = placedOrder.data.orderItems.find(
      (i: any) => i.variantId === variantA.id,
    );
    const itemPalazzo = placedOrder.data.orderItems.find(
      (i: any) => i.variantId === variantB.id,
    );

    expect(itemKurti).toBeDefined();
    expect(itemPalazzo).toBeDefined();

    // Verify snapshots on OrderItem
    expect(itemKurti!.productNameSnapshot).toBe('Embroidered Silk Kurti');
    expect(itemKurti!.skuSnapshot).toBe('KURTI-SILK-M-RED');
    expect(itemKurti!.sizeSnapshot).toBe('M');
    expect(itemKurti!.colorSnapshot).toBe('Red');
    expect(itemKurti!.status).toBe(OrderItemStatus.PLACED);

    // 10% commission snapshot:
    // Kurti: Subtotal ₹4000, Commission ₹400, SellerEarnings ₹3600
    expect(Number(itemKurti!.commissionRate)).toBe(10.0);
    expect(Number(itemKurti!.commissionAmount)).toBe(400.0);
    expect(Number(itemKurti!.sellerEarnings)).toBe(3600.0);

    // Palazzo: Subtotal ₹3000, Commission ₹300, SellerEarnings ₹2700
    expect(Number(itemPalazzo!.commissionRate)).toBe(10.0);
    expect(Number(itemPalazzo!.commissionAmount)).toBe(300.0);
    expect(Number(itemPalazzo!.sellerEarnings)).toBe(2700.0);

    // 7. Seller A fulfills Kurti item: PLACED -> PACKED -> SHIPPED
    await orderService.updateSellerOrderItemStatus(
      sellerA.userId,
      orderId,
      itemKurti!.id,
      { status: OrderItemStatus.PACKED },
    );
    const shipResA = await orderService.updateSellerOrderItemStatus(
      sellerA.userId,
      orderId,
      itemKurti!.id,
      {
        status: OrderItemStatus.SHIPPED,
        trackingCarrier: 'Delhivery',
        trackingNumber: 'DEL-12345678',
      },
    );
    expect(shipResA.data.status).toBe(OrderItemStatus.SHIPPED);
    expect(shipResA.data.trackingNumber).toBe('DEL-12345678');

    // Check parent order derived status: PARTIALLY_SHIPPED
    const midOrder = await orderService.getCustomerOrder(customerUser.id, orderId);
    expect(midOrder.data.orderStatus).toBe(OrderStatus.PARTIALLY_SHIPPED);

    // 8. Seller B fulfills Palazzo item: PLACED -> PACKED -> SHIPPED -> DELIVERED
    await orderService.updateSellerOrderItemStatus(
      sellerB.userId,
      orderId,
      itemPalazzo!.id,
      { status: OrderItemStatus.PACKED },
    );
    await orderService.updateSellerOrderItemStatus(
      sellerB.userId,
      orderId,
      itemPalazzo!.id,
      {
        status: OrderItemStatus.SHIPPED,
        trackingCarrier: 'EcomExpress',
        trackingNumber: 'ECOM-87654321',
      },
    );
    const delResB = await orderService.updateSellerOrderItemStatus(
      sellerB.userId,
      orderId,
      itemPalazzo!.id,
      { status: OrderItemStatus.DELIVERED },
    );
    expect(delResB.data.status).toBe(OrderItemStatus.DELIVERED);

    // Seller A also delivers
    await orderService.updateSellerOrderItemStatus(
      sellerA.userId,
      orderId,
      itemKurti!.id,
      { status: OrderItemStatus.DELIVERED },
    );

    // Now all items delivered -> parent order status = DELIVERED
    const finalOrder = await orderService.getCustomerOrder(customerUser.id, orderId);
    expect(finalOrder.data.orderStatus).toBe(OrderStatus.DELIVERED);

    // 9. Verify Historical Snapshots remain intact even if product or category commissions change
    db.products.set(productA.id, { ...productA, price: 5500.0 });
    db.categoryCommissions.set('comm-1', {
      ...db.categoryCommissions.get('comm-1'),
      commissionRate: 25.0,
    });

    const finalOrderCheck = await orderService.getCustomerOrder(
      customerUser.id,
      orderId,
    );
    const finalKurti = finalOrderCheck.data.orderItems.find(
      (i: any) => i.variantId === variantA.id,
    );
    expect(Number(finalKurti!.unitPrice)).toBe(4000.0); // original unit price preserved
    expect(Number(finalKurti!.commissionRate)).toBe(10.0); // original commission preserved
    expect(Number(finalKurti!.sellerEarnings)).toBe(3600.0); // original earnings preserved
    expect(finalKurti!.skuSnapshot).toBe('KURTI-SILK-M-RED');
  });

  it('should release stock reservations when payment fails via Razorpay webhook', async () => {
    // Setup customer and product
    const customerUser = {
      id: 'cust-usr-fail',
      fullName: 'Vikram Seth',
      email: 'vikram@example.com',
      mobileNumber: '9123456789',
    };
    db.users.set(customerUser.id, customerUser);
    await customerService.getOrCreateProfile(customerUser.id);
    const addr = await customerService.createAddress(customerUser.id, {
      fullName: 'Vikram Seth',
      phoneNumber: '9123456789',
      addressLine1: 'Road 5, Jubilee Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500033',
      addressType: CustomerAddressType.HOME,
      isDefaultShipping: true,
    });

    const cat = { id: 'cat-mens', name: "Men's Clothing", slug: 'mens-clothing' };
    db.categories.set(cat.id, cat);

    const seller = { id: 'seller-x', userId: 'usr-sel-x', displayName: 'X-Apparel' };
    db.sellerProfiles.set(seller.id, seller);

    const product = {
      id: 'prod-hoodie',
      sellerId: seller.id,
      categoryId: cat.id,
      name: 'Fleece Hoodie',
      sku: 'HOODIE-FLC',
      price: 1999.0,
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    };
    db.products.set(product.id, product);

    const variant = {
      id: 'var-hoodie-xl-blk',
      productId: product.id,
      sku: 'HOODIE-FLC-XL-BLK',
      size: 'XL',
      color: 'Black',
      priceOverride: null,
      stockQuantity: 5,
      isActive: true,
    };
    db.productVariants.set(variant.id, variant);

    db.inventories.set('inv-hoodie', {
      id: 'inv-hoodie',
      variantId: variant.id,
      productId: product.id,
      availableQuantity: 5,
      reservedQuantity: 0,
      totalQuantity: 5,
    });

    await cartService.addItem(customerUser.id, {
      variantId: variant.id,
      quantity: 2,
    });

    const checkoutRes = await orderService.initiateCheckout(customerUser.id, {
      shippingAddressId: addr.data.id,
    });
    expect(checkoutRes.success).toBe(true);

    // Stock reserved: available 3, reserved 2
    const invReserved = db.inventories.get('inv-hoodie');
    expect(invReserved.availableQuantity).toBe(3);
    expect(invReserved.reservedQuantity).toBe(2);

    // Webhook payment.failed
    const paymentRecord = Array.from(db.paymentsPending.values()).find(
      (p) => p.orderId === checkoutRes.data.orderId,
    );

    const webhookPayload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_999',
            order_id: checkoutRes.data.providerOrderReference,
            notes: {
              paymentReference: paymentRecord.paymentReference,
            },
            error_description: 'Payment was declined by customer bank',
          },
        },
      },
    };

    const webhookBody = JSON.stringify(webhookPayload);
    const webhookSig = crypto
      .createHmac('sha256', razorpayWebhookSecret)
      .update(webhookBody)
      .digest('hex');

    const webhookRes = await paymentService.handleRazorpayWebhook(
      webhookPayload,
      webhookSig,
    );

    expect(webhookRes.received).toBe(true);

    // Stock should be released back: available 5, reserved 0
    const invReleased = db.inventories.get('inv-hoodie');
    expect(invReleased.availableQuantity).toBe(5);
    expect(invReleased.reservedQuantity).toBe(0);
  });
});
