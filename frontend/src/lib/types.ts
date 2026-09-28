export interface User {
  id: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  role: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentCategoryId?: string;
  subcategories?: Category[];
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface ProductSpecification {
  id: string;
  name: string;
  value: string;
  displayOrder: number;
}

export interface Inventory {
  availableQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
}

export interface SellerProfile {
  id: string;
  businessName?: string;
  displayName: string;
  contactEmail: string;
  isVerified?: boolean;
}

export interface Product {
  id: string;
  sellerId: string;
  seller?: SellerProfile;
  categoryId: string;
  category?: Category;
  name: string;
  slug?: string;
  sku: string;
  description?: string;
  price: number;
  mrp?: number;
  status: string;
  images?: ProductImage[];
  specifications?: ProductSpecification[];
  inventory?: Inventory;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
}

export interface CustomerAddress {
  id: string;
  customerId?: string;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressType: 'HOME' | 'WORK' | 'SHIPPING';
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  sellerId: string;
  productId: string;
  productName: string;
  productSku: string;
  productPrice: number;
  quantity: number;
  totalPrice: number;
  fulfillmentStatus: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  courierCarrier?: string;
  trackingNumber?: string;
  deliveredAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  shippingAddress?: CustomerAddress;
  items: OrderItem[];
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderItemId: string;
  returnQuantity: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'COMPLETED';
  createdAt: string;
}
