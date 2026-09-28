import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// API Helper Endpoints
export const productService = {
  getProducts: async (params?: { categoryId?: string; search?: string; status?: string }) => {
    const res = await api.get('/products', { params });
    const payload = res.data?.data || res.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.products)) return payload.products;
    return [];
  },
  getProductById: async (id: string) => {
    const res = await api.get(`/products/${id}`);
    const payload = res.data?.data || res.data;
    return payload?.product || payload;
  },
  getCategories: async () => {
    const res = await api.get('/categories');
    const payload = res.data?.data || res.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.categories)) return payload.categories;
    return [];
  },
};

export const cartService = {
  getCart: async () => {
    const res = await api.get('/cart');
    const payload = res.data?.data || res.data;
    return payload?.cart || payload;
  },
  addItem: async (productId: string, quantity: number = 1) => {
    const res = await api.post('/cart/items', { productId, quantity });
    const payload = res.data?.data || res.data;
    return payload?.cart || payload;
  },
  updateItemQuantity: async (itemId: string, quantity: number) => {
    const res = await api.patch(`/cart/items/${itemId}`, { quantity });
    const payload = res.data?.data || res.data;
    return payload?.cart || payload;
  },
  removeItem: async (itemId: string) => {
    const res = await api.delete(`/cart/items/${itemId}`);
    const payload = res.data?.data || res.data;
    return payload?.cart || payload;
  },
  clearCart: async () => {
    const res = await api.delete('/cart');
    return res.data?.data || res.data;
  },
};

export const customerService = {
  getProfile: async () => {
    const res = await api.get('/customers/profile');
    const payload = res.data?.data || res.data;
    return payload?.customer || payload;
  },
  getAddresses: async () => {
    const res = await api.get('/customers/addresses');
    const payload = res.data?.data || res.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.addresses)) return payload.addresses;
    return [];
  },
  addAddress: async (data: any) => {
    const res = await api.post('/customers/addresses', data);
    const payload = res.data?.data || res.data;
    return payload?.address || payload;
  },
};

export const orderService = {
  createOrder: async (data: { shippingAddressId: string }) => {
    const res = await api.post('/orders', data);
    const payload = res.data?.data || res.data;
    return payload?.order || payload;
  },
  getMyOrders: async () => {
    const res = await api.get('/orders/my-orders');
    const payload = res.data?.data || res.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.orders)) return payload.orders;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  },
  getOrderById: async (orderId: string) => {
    const res = await api.get(`/orders/${orderId}`);
    const payload = res.data?.data || res.data;
    return payload?.order || payload;
  },
  requestReturn: async (data: { orderItemId: string; returnQuantity: number; reason: string }) => {
    const res = await api.post('/return-requests', data);
    return res.data?.data || res.data;
  },
};

export const paymentService = {
  createRazorpayOrder: async (orderId: string) => {
    const res = await api.post('/payments/create-order', { orderId });
    return res.data?.data || res.data;
  },
  verifyPayment: async (data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => {
    const res = await api.post('/payments/verify', data);
    return res.data?.data || res.data;
  },
};
