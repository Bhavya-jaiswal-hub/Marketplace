import {
  PrismaClient,
  AccountType,
  AccountStatus,
  SellerStatus,
  SellerType,
  AddressType,
  CustomerAddressType,
  SellerCategoryStatus,
  CommissionStatus,
  ProductStatus,
  StockChangeType,
  TemplateStatus,
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding for Multi-Vendor Marketplace...');

  // 1. Roles
  const roles = ['SUPER_ADMIN', 'ADMIN', 'SELLER', 'CUSTOMER'];
  const roleMap: Record<string, string> = {};

  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `${roleName.replace('_', ' ')} system role`,
      },
    });
    roleMap[roleName] = role.id;
  }
  console.log('✅ Roles initialized.');

  // 2. Users & Passwords
  const adminPassword = await bcrypt.hash('Admin@123456', 10);
  const sellerPassword = await bcrypt.hash('Seller@123456', 10);
  const customerPassword = await bcrypt.hash('Customer@123456', 10);

  // Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@marketplace.com' },
    update: {},
    create: {
      fullName: 'Super Administrator',
      email: 'admin@marketplace.com',
      passwordHash: adminPassword,
      accountType: AccountType.ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      roleId: roleMap['SUPER_ADMIN'],
      emailVerified: true,
    },
  });

  // Seller 1: Tech Gadgets
  const sellerUser1 = await prisma.user.upsert({
    where: { email: 'seller@techgadgets.com' },
    update: {},
    create: {
      fullName: 'Vikram Mehta',
      email: 'seller@techgadgets.com',
      mobileNumber: '+919876543211',
      passwordHash: sellerPassword,
      accountType: AccountType.SELLER,
      accountStatus: AccountStatus.ACTIVE,
      roleId: roleMap['SELLER'],
      emailVerified: true,
    },
  });

  // Seller 2: Urban Threads
  const sellerUser2 = await prisma.user.upsert({
    where: { email: 'seller@urbanthreads.com' },
    update: {},
    create: {
      fullName: 'Ananya Roy',
      email: 'seller@urbanthreads.com',
      mobileNumber: '+919876543212',
      passwordHash: sellerPassword,
      accountType: AccountType.SELLER,
      accountStatus: AccountStatus.ACTIVE,
      roleId: roleMap['SELLER'],
      emailVerified: true,
    },
  });

  // Customer 1: Rohan Sharma
  const customerUser1 = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      fullName: 'Rohan Sharma',
      email: 'customer@example.com',
      mobileNumber: '+919876543210',
      passwordHash: customerPassword,
      accountType: AccountType.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE,
      roleId: roleMap['CUSTOMER'],
      emailVerified: true,
    },
  });

  // Customer 2: Priya Patel
  const customerUser2 = await prisma.user.upsert({
    where: { email: 'priya.patel@example.com' },
    update: {},
    create: {
      fullName: 'Priya Patel',
      email: 'priya.patel@example.com',
      mobileNumber: '+919812345678',
      passwordHash: customerPassword,
      accountType: AccountType.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE,
      roleId: roleMap['CUSTOMER'],
      emailVerified: true,
    },
  });
  console.log('✅ Users created (Admin, Sellers, Customers).');

  // 3. Customer Profiles & Addresses
  const customerProfile1 = await prisma.customerProfile.upsert({
    where: { userId: customerUser1.id },
    update: {},
    create: {
      userId: customerUser1.id,
      firstName: 'Rohan',
      lastName: 'Sharma',
      phoneNumber: '+919876543210',
    },
  });

  await prisma.customerAddress.createMany({
    data: [
      {
        customerId: customerProfile1.id,
        fullName: 'Rohan Sharma',
        phoneNumber: '+919876543210',
        addressLine1: 'Flat 402, Green Glen Heights, Bellandur',
        addressLine2: 'Outer Ring Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560103',
        country: 'India',
        addressType: CustomerAddressType.HOME,
        isDefaultShipping: true,
        isDefaultBilling: true,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.customerProfile.upsert({
    where: { userId: customerUser2.id },
    update: {},
    create: {
      userId: customerUser2.id,
      firstName: 'Priya',
      lastName: 'Patel',
      phoneNumber: '+919812345678',
    },
  });
  console.log('✅ Customer profiles and addresses configured.');

  // 4. Seller Profiles, Addresses, and KYC Verifications
  const sellerProfile1 = await prisma.sellerProfile.upsert({
    where: { userId: sellerUser1.id },
    update: {},
    create: {
      userId: sellerUser1.id,
      sellerType: SellerType.BUSINESS,
      businessName: 'TechGadgets Retail Private Limited',
      displayName: 'TechGadgets India',
      businessDescription: 'Premium electronics, headphones, and computing devices.',
      contactEmail: 'contact@techgadgets.com',
      contactMobile: '+919876543211',
      status: SellerStatus.APPROVED,
      payoutDetails: {
        bankAccountName: 'TechGadgets Retail Pvt Ltd',
        bankAccountNumber: '98765432101234',
        bankIfscCode: 'HDFC0001234',
      },
    },
  });

  await prisma.sellerAddress.createMany({
    data: [
      {
        sellerId: sellerProfile1.id,
        addressType: AddressType.PICKUP,
        addressLine1: 'Warehouse 4B, Electronic City Phase 1',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560100',
        country: 'IN',
        isPrimary: true,
      },
      {
        sellerId: sellerProfile1.id,
        addressType: AddressType.BUSINESS,
        addressLine1: 'Unit 201, Outer Ring Road Tech Hub',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560103',
        country: 'IN',
        isPrimary: false,
      },
    ],
    skipDuplicates: true,
  });

  const sellerProfile2 = await prisma.sellerProfile.upsert({
    where: { userId: sellerUser2.id },
    update: {},
    create: {
      userId: sellerUser2.id,
      sellerType: SellerType.BUSINESS,
      businessName: 'Urban Threads Apparels LLP',
      displayName: 'Urban Threads Fashion',
      businessDescription: 'Trendy casual wear, denim, and organic cotton apparel.',
      contactEmail: 'support@urbanthreads.com',
      contactMobile: '+919876543212',
      status: SellerStatus.APPROVED,
      payoutDetails: {
        bankAccountName: 'Urban Threads Apparels LLP',
        bankAccountNumber: '50100234567890',
        bankIfscCode: 'ICIC0000001',
      },
    },
  });

  await prisma.sellerAddress.createMany({
    data: [
      {
        sellerId: sellerProfile2.id,
        addressType: AddressType.PICKUP,
        addressLine1: 'Unit 102, Sun Mill Compound, Lower Parel',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400013',
        country: 'IN',
        isPrimary: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Seller profiles and operational addresses configured.');

  // 5. Category Hierarchy & Commissions
  const catElectronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Consumer electronics, gadgets, and tech accessories',
      isActive: true,
      createdById: adminUser.id,
    },
  });

  await prisma.categoryCommission.createMany({
    data: [
      {
        categoryId: catElectronics.id,
        commissionRate: new Decimal(8.5),
        status: CommissionStatus.ACTIVE,
        createdById: adminUser.id,
      },
    ],
    skipDuplicates: true,
  });

  const catAudio = await prisma.category.upsert({
    where: { slug: 'audio-accessories' },
    update: {},
    create: {
      name: 'Audio & Accessories',
      slug: 'audio-accessories',
      description: 'Headphones, earphones, and audio gear',
      parentCategoryId: catElectronics.id,
      isActive: true,
      createdById: adminUser.id,
    },
  });

  await prisma.categoryCommission.createMany({
    data: [
      {
        categoryId: catAudio.id,
        commissionRate: new Decimal(7.0),
        status: CommissionStatus.ACTIVE,
        createdById: adminUser.id,
      },
    ],
    skipDuplicates: true,
  });

  const catLaptops = await prisma.category.upsert({
    where: { slug: 'laptops-computers' },
    update: {},
    create: {
      name: 'Laptops & Computers',
      slug: 'laptops-computers',
      description: 'Laptops, gaming rigs, and peripherals',
      parentCategoryId: catElectronics.id,
      isActive: true,
      createdById: adminUser.id,
    },
  });

  await prisma.categoryCommission.createMany({
    data: [
      {
        categoryId: catLaptops.id,
        commissionRate: new Decimal(6.0),
        status: CommissionStatus.ACTIVE,
        createdById: adminUser.id,
      },
    ],
    skipDuplicates: true,
  });

  const catFashion = await prisma.category.upsert({
    where: { slug: 'fashion-apparel' },
    update: {},
    create: {
      name: 'Fashion & Apparel',
      slug: 'fashion-apparel',
      description: 'Men and women clothing, footwear, and accessories',
      isActive: true,
      createdById: adminUser.id,
    },
  });

  await prisma.categoryCommission.createMany({
    data: [
      {
        categoryId: catFashion.id,
        commissionRate: new Decimal(12.0),
        status: CommissionStatus.ACTIVE,
        createdById: adminUser.id,
      },
    ],
    skipDuplicates: true,
  });

  const catMensWear = await prisma.category.upsert({
    where: { slug: 'mens-clothing' },
    update: {},
    create: {
      name: "Men's Clothing",
      slug: 'mens-clothing',
      description: 'Shirts, t-shirts, jeans, and formal wear',
      parentCategoryId: catFashion.id,
      isActive: true,
      createdById: adminUser.id,
    },
  });

  await prisma.categoryCommission.createMany({
    data: [
      {
        categoryId: catMensWear.id,
        commissionRate: new Decimal(12.0),
        status: CommissionStatus.ACTIVE,
        createdById: adminUser.id,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Category tree and commission structures seeded.');

  // 6. Seller-Category Permissions
  const sellerCategories = [
    { sellerId: sellerProfile1.id, categoryId: catElectronics.id },
    { sellerId: sellerProfile1.id, categoryId: catAudio.id },
    { sellerId: sellerProfile1.id, categoryId: catLaptops.id },
    { sellerId: sellerProfile2.id, categoryId: catFashion.id },
    { sellerId: sellerProfile2.id, categoryId: catMensWear.id },
  ];

  for (const sc of sellerCategories) {
    await prisma.sellerCategory.upsert({
      where: {
        sellerId_categoryId: {
          sellerId: sc.sellerId,
          categoryId: sc.categoryId,
        },
      },
      update: { status: SellerCategoryStatus.APPROVED },
      create: {
        sellerId: sc.sellerId,
        categoryId: sc.categoryId,
        status: SellerCategoryStatus.APPROVED,
      },
    });
  }
  console.log('✅ Seller category permissions granted.');

  // 7. Products & Inventory
  const productsData = [
    {
      sellerId: sellerProfile1.id,
      categoryId: catAudio.id,
      name: 'Apex ANC Wireless Noise-Canceling Headphones',
      sku: 'TECH-ANC-001',
      description: 'Industry-leading Active Noise Cancellation with 40-hour battery life, high-res audio drivers, and ultra-comfortable memory foam earcups.',
      price: new Decimal(4999.0),
      stock: 65,
      lowStockThreshold: 15,
      specs: [
        { name: 'Bluetooth Version', value: '5.3' },
        { name: 'Battery Life', value: '40 Hours' },
        { name: 'Driver Size', value: '40mm High-Res' },
        { name: 'Fast Charging', value: '10 min for 5 hours' },
      ],
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800',
      ],
    },
    {
      sellerId: sellerProfile1.id,
      categoryId: catLaptops.id,
      name: 'Zenith Pro 15.6" Ultra-Slim Gaming Laptop',
      sku: 'TECH-LPT-002',
      description: 'Next-generation 14-core processor, RTX 4060 graphics, 16GB DDR5 RAM, and 1TB NVMe Gen4 SSD for effortless productivity and gaming.',
      price: new Decimal(74999.0),
      stock: 18,
      lowStockThreshold: 5,
      specs: [
        { name: 'Processor', value: 'Intel Core i7 14th Gen' },
        { name: 'Graphics', value: 'NVIDIA RTX 4060 8GB GDDR6' },
        { name: 'RAM', value: '16GB DDR5 5600MHz' },
        { name: 'Display', value: '15.6" QHD 165Hz IPS' },
      ],
      images: [
        'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800',
      ],
    },
    {
      sellerId: sellerProfile1.id,
      categoryId: catAudio.id,
      name: 'NovaPulse True Wireless Earbuds with Spatial Audio',
      sku: 'TECH-TWS-003',
      description: 'Compact IPX5 water-resistant earbuds featuring 32-hour playback, crystal clear ENC microphone, and immersive spatial audio.',
      price: new Decimal(1999.0),
      stock: 120,
      lowStockThreshold: 20,
      specs: [
        { name: 'Battery', value: '32 Hours Total' },
        { name: 'Water Resistance', value: 'IPX5' },
        { name: 'Latency', value: '45ms Gaming Mode' },
      ],
      images: [
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800',
      ],
    },
    {
      sellerId: sellerProfile2.id,
      categoryId: catMensWear.id,
      name: 'Classic Oxford Pure Cotton Slim-Fit Shirt (Navy Blue)',
      sku: 'FASH-OXF-001',
      description: 'Tailored from 100% breathable organic Oxford cotton. Perfect for business meetings and casual evening gatherings.',
      price: new Decimal(1499.0),
      stock: 90,
      lowStockThreshold: 20,
      specs: [
        { name: 'Material', value: '100% Organic Cotton' },
        { name: 'Fit', value: 'Slim Fit' },
        { name: 'Pattern', value: 'Solid Oxford Weave' },
      ],
      images: [
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
      ],
    },
    {
      sellerId: sellerProfile2.id,
      categoryId: catMensWear.id,
      name: 'Raw Selvedge Denim Heritage Jacket',
      sku: 'FASH-JCK-002',
      description: 'Heavyweight 14oz Japanese selvedge denim jacket with custom brass hardware and double-needle contrast stitching.',
      price: new Decimal(3499.0),
      stock: 8, // Low stock demo item
      lowStockThreshold: 10,
      specs: [
        { name: 'Weight', value: '14oz Selvedge Denim' },
        { name: 'Fit', value: 'Regular Vintage Fit' },
        { name: 'Hardware', value: 'Antiqued Brass Buttons' },
      ],
      images: [
        'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800',
      ],
    },
  ];

  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sellerId: p.sellerId,
        categoryId: p.categoryId,
        name: p.name,
        sku: p.sku,
        description: p.description,
        price: p.price,
        status: ProductStatus.ACTIVE,
      },
    });

    // Product Images
    for (let i = 0; i < p.images.length; i++) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          imageUrl: p.images[i],
          isPrimary: i === 0,
          displayOrder: i + 1,
        },
      });
    }

    // Product Specifications
    for (let i = 0; i < p.specs.length; i++) {
      await prisma.productSpecification.create({
        data: {
          productId: product.id,
          name: p.specs[i].name,
          value: p.specs[i].value,
          displayOrder: i + 1,
        },
      });
    }

    // Inventory
    const inventory = await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {
        availableQuantity: p.stock,
        lowStockThreshold: p.lowStockThreshold,
      },
      create: {
        productId: product.id,
        availableQuantity: p.stock,
        reservedQuantity: 0,
        lowStockThreshold: p.lowStockThreshold,
      },
    });

    // Inventory History
    await prisma.inventoryHistory.create({
      data: {
        inventoryId: inventory.id,
        productId: product.id,
        changeType: StockChangeType.STOCK_ADDED,
        quantityChange: p.stock,
        previousQuantity: 0,
        newQuantity: p.stock,
        reason: 'Initial database seed stock allocation',
      },
    });
  }
  console.log('✅ Products, images, specifications, and inventory records seeded.');

  // 8. Notification Templates
  const templates = [
    {
      name: 'ORDER_CONFIRMED',
      type: 'ORDER_STATUS',
      title: 'Order Confirmed - #{{orderNumber}}',
      message: 'Hello {{customerName}}, your order #{{orderNumber}} for INR {{amount}} has been confirmed successfully.',
    },
    {
      name: 'ORDER_SHIPPED',
      type: 'ORDER_STATUS',
      title: 'Your Order #{{orderNumber}} has been Shipped',
      message: 'Great news! Your order is on its way via {{courierName}} (Tracking: {{trackingNumber}}).',
    },
    {
      name: 'RETURN_APPROVED',
      type: 'RETURN_STATUS',
      title: 'Return Request Approved - #{{orderNumber}}',
      message: 'Your return request for {{itemTitle}} has been approved. Our courier partner will arrange physical pickup shortly.',
    },
    {
      name: 'LOW_STOCK_ALERT',
      type: 'INVENTORY_ALERT',
      title: 'Low Stock Alert: {{productName}}',
      message: 'Warning: Product {{productName}} (SKU: {{sku}}) has only {{availableQuantity}} units left in inventory.',
    },
  ];

  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: { templateName: t.name },
      update: {},
      create: {
        templateName: t.name,
        notificationType: t.type,
        titleTemplate: t.title,
        messageTemplate: t.message,
        status: TemplateStatus.ACTIVE,
      },
    });
  }
  console.log('✅ Notification templates configured.');

  // 9. Initial Sample In-App Notification
  await prisma.notification.create({
    data: {
      userId: customerUser1.id,
      type: 'WELCOME_OFFER',
      title: 'Welcome to Multi-Vendor Marketplace!',
      message: 'Enjoy seamless shopping with verified independent vendors across India.',
      channel: NotificationChannel.IN_APP,
      status: NotificationDeliveryStatus.DELIVERED,
      isRead: false,
      deliveryAttempts: 1,
    },
  });

  console.log('\n================================================================');
  console.log('🎉 Database seeding completed successfully!');
  console.log('================================================================');
  console.log('🔑 Seeded Accounts for Testing:');
  console.log('   - Super Admin: admin@marketplace.com       / Admin@123456');
  console.log('   - Seller 1:    seller@techgadgets.com      / Seller@123456');
  console.log('   - Seller 2:    seller@urbanthreads.com     / Seller@123456');
  console.log('   - Customer:    customer@example.com        / Customer@123456');
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
