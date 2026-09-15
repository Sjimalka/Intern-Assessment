// Determine API base URL:
// In production (Vercel), point to the Render backend via VITE_API_URL
// In local dev, fallback to '/api' which Vite proxies to http://localhost:5000
const rawBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = rawBase ? `${rawBase.replace(/\/$/, '')}/api` : '/api';

/**
 * Helper to handle fetch responses and throw friendly errors
 */
async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * 1. Fetch product catalog with search, category, price, and stock filters
 */
export async function fetchProducts({ search = '', category = '', minPrice = '', maxPrice = '', inStock = false } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category && category !== 'All') params.append('category', category);
  if (minPrice) params.append('minPrice', minPrice);
  if (maxPrice) params.append('maxPrice', maxPrice);
  if (inStock) params.append('inStock', 'true');

  const response = await fetch(`${API_BASE}/products?${params.toString()}`);
  return handleResponse(response);
}

/**
 * 2. Fetch single product details by ID
 */
export async function fetchProductById(id) {
  const response = await fetch(`${API_BASE}/products/${id}`);
  return handleResponse(response);
}

/**
 * 3. Reserve stock for cart items (starts 10-minute hold)
 */
export async function reserveStock(items, ttlSeconds = 600) {
  const response = await fetch(`${API_BASE}/checkout/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, ttlSeconds }),
  });
  return handleResponse(response);
}

/**
 * 4. Get active reservation status and countdown seconds
 */
export async function getReservationStatus(reservationId) {
  const response = await fetch(`${API_BASE}/checkout/reserve/${reservationId}`);
  return handleResponse(response);
}

/**
 * 5. Manually release reservation hold if user cancels or leaves
 */
export async function releaseReservation(reservationId) {
  const response = await fetch(`${API_BASE}/checkout/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservationId }),
  });
  return handleResponse(response);
}

/**
 * 6. Place order and process mock payment
 * Supports simulationMode: 'SUCCESS' | 'FAILURE' | 'TIMEOUT'
 * Includes unique idempotencyKey to prevent duplicate charges
 */
export async function submitPaymentAndOrder({
  reservationId,
  customer,
  paymentDetails,
  simulationMode = 'SUCCESS',
  idempotencyKey,
}) {
  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reservationId,
      customer,
      paymentDetails,
      simulationMode,
      idempotencyKey,
    }),
  });
  return handleResponse(response);
}

/**
 * 7. Fetch all orders (order history)
 */
export async function fetchOrders() {
  const response = await fetch(`${API_BASE}/orders`);
  return handleResponse(response);
}

/**
 * 8. Cancel an order and process simulated refund (also restocks warehouse)
 */
export async function cancelOrderAndRefund(orderId, reason = 'Cancelled by customer') {
  const response = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return handleResponse(response);
}
