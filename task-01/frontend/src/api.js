// helper to talk to backend api
const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `HTTP error ${response.status}`);
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // get all products
  async getProducts() {
    const res = await request('/products');
    const rawList = res.data || res.products || [];
    if (!Array.isArray(rawList)) return [];
    return rawList.map(p => ({
      ...p,
      total_stock: p.total_stock ?? p.totalStock ?? 0,
      reserved_stock: p.reserved_stock ?? p.reservedStock ?? 0,
      available_stock: p.available_stock ?? p.availableStock ?? ((p.total_stock ?? p.totalStock ?? 0) - (p.reserved_stock ?? p.reservedStock ?? 0)),
      image_url: p.image_url || p.imageUrl || '',
      price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0
    }));
  },

  // get single product by id
  async getProduct(id) {
    const res = await request(`/products/${id}`);
    const p = res.data || res.product;
    if (!p) return null;
    return {
      ...p,
      total_stock: p.total_stock ?? p.totalStock ?? 0,
      reserved_stock: p.reserved_stock ?? p.reservedStock ?? 0,
      available_stock: p.available_stock ?? p.availableStock ?? ((p.total_stock ?? p.totalStock ?? 0) - (p.reserved_stock ?? p.reservedStock ?? 0)),
      image_url: p.image_url || p.imageUrl || '',
      price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0
    };
  },

  // add new product
  async createProduct(productData) {
    const res = await request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    return res.data || res.product;
  },

  // update product details or stock
  async updateProduct(id, productData) {
    const res = await request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
    return res.data || res.product;
  },

  // delete product
  async deleteProduct(id) {
    const res = await request(`/products/${id}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  // create order and hold stock for 5 minutes
  async checkout({ items, customerName, customerEmail, durationMs }) {
    const res = await request('/checkout', {
      method: 'POST',
      body: JSON.stringify({ items, customerName, customerEmail, durationMs }),
    });
    return res.data || res.order;
  },

  // get orders list (optional status filter)
  async getOrders(status) {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    const res = await request(`/orders${query}`);
    return res.data || res.orders || [];
  },

  // get single order details
  async getOrder(id) {
    const res = await request(`/orders/${id}`);
    return res.data || res.order;
  },

  // cancel order and give stock back
  async cancelOrder(id, reason) {
    const res = await request(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res.data || res.order;
  },

  // force expire order right now for testing
  async expireOrder(id) {
    const res = await request(`/orders/${id}/expire`, {
      method: 'POST',
    });
    return res.data || res.order;
  },

  // process payment with idempotency key
  async processPayment({ orderId, idempotencyKey, paymentMethod, simulatedOutcome }) {
    const res = await request('/payments/process', {
      method: 'POST',
      body: JSON.stringify({ orderId, idempotencyKey, paymentMethod, simulatedOutcome }),
    });
    return res;
  },

  // get stock movement history
  async getAuditLogs(limit = 100) {
    const res = await request(`/inventory/audit?limit=${limit}`);
    return res.data || res.logs || [];
  },

  // reset test database
  async resetSystem() {
    const res = await request('/system/reset', {
      method: 'POST',
    });
    return res;
  },

  // simulate multiple buyers trying to purchase at once
  async runConcurrencySimulation({ productId, concurrentBuyers, quantityPerBuyer }) {
    const res = await request('/system/simulate-concurrency', {
      method: 'POST',
      body: JSON.stringify({ productId, concurrentBuyers, quantityPerBuyer }),
    });
    return res;
  }
};
