// Order lifecycle management: creation, cancellation, refunds, and restock
// Supports both PostgreSQL database and in-memory fallback.

const crypto = require('crypto');
const inventoryService = require('./inventoryService');
const paymentService = require('./paymentService');
const db = require('../db/db');

// In-memory store fallback of customer orders
// Map: orderId -> Order object
const memoryOrders = new Map();

/**
 * Helper to calculate delivery fee in Sri Lankan Rupees
 */
function calculateShipping(subtotal) {
  if (subtotal >= 5000) return 0;
  return 350;
}

/**
 * Place an order by charging the customer and committing the stock hold
 */
async function placeOrder({
  reservationId,
  customer,
  paymentDetails,
  simulationMode = 'SUCCESS',
  idempotencyKey
}) {
  // 1. Verify reservation exists and is active
  const reservation = await inventoryService.getReservation(reservationId);
  if (!reservation) {
    throw new Error('Your checkout reservation was not found. Please add items to cart again.');
  }

  if (reservation.status === 'EXPIRED') {
    throw new Error('Your stock reservation has expired. Please return to cart to refresh stock.');
  }

  if (reservation.status === 'RELEASED') {
    throw new Error('This checkout reservation has already been cancelled.');
  }

  if (reservation.status === 'COMMITTED') {
    // Check if an order already exists for this committed reservation
    if (db.isConnected()) {
      try {
        const existingOrderRes = await db.query(
          'SELECT id FROM orders WHERE reservation_id = $1',
          [reservationId]
        );
        if (existingOrderRes.rows.length > 0) {
          const ord = await getOrderById(existingOrderRes.rows[0].id);
          console.log(`[PostgreSQL Order] Found existing order ${ord.id} for committed reservation ${reservationId}.`);
          return {
            success: true,
            order: ord,
            isDuplicate: true,
            message: 'Order was already placed previously.'
          };
        }
      } catch (err) {
        console.warn('[PostgreSQL Order Check Error]:', err.message);
      }
    }

    for (const ord of memoryOrders.values()) {
      if (ord.reservationId === reservationId) {
        console.log(`[Order] Found existing order ${ord.id} for committed reservation ${reservationId}.`);
        return {
          success: true,
          order: ord,
          isDuplicate: true,
          message: 'Order was already placed previously.'
        };
      }
    }
  }

  // 2. Calculate totals in Sri Lankan Rupees (LKR)
  const subtotal = reservation.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;

  // 3. Attempt payment charge via payment service
  const paymentResult = await paymentService.processPayment({
    idempotencyKey,
    reservationId,
    amount: total,
    simulationMode,
    paymentDetails
  });

  // 4. If payment did not succeed, return failure without committing stock
  if (!paymentResult.success) {
    return {
      success: false,
      status: paymentResult.status,
      error: paymentResult.error,
      reservationId,
      canRetry: true
    };
  }

  // 5. Payment succeeded! Permanently commit the held stock
  await inventoryService.commitReservation(reservationId);

  // 6. Create official order record
  const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const newOrder = {
    id: orderId,
    reservationId,
    customer: {
      fullName: customer.fullName || 'Valued Customer',
      email: customer.email || 'customer@example.lk',
      phone: customer.phone || '+94 77 123 4567',
      address: customer.address || '123 Galle Road',
      city: customer.city || 'Colombo',
      district: customer.district || 'Western Province',
      notes: customer.notes || ''
    },
    items: reservation.items,
    pricing: {
      subtotal,
      shipping,
      total,
      currency: 'LKR'
    },
    payment: {
      status: 'PAID',
      transactionId: paymentResult.transactionId,
      method: paymentResult.paymentMethod?.type || 'Credit/Debit Card',
      cardLast4: paymentResult.paymentMethod?.cardLast4 || '•••• 4242',
      paidAt: paymentResult.timestamp
    },
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Save to PostgreSQL if connected
  if (db.isConnected()) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO orders (
          id, reservation_id, customer_name, customer_email, customer_phone,
          delivery_address, city, district, subtotal, shipping, total_amount,
          status, payment_id, payment_method, idempotency_key, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())`,
        [
          orderId,
          reservationId,
          newOrder.customer.fullName,
          newOrder.customer.email,
          newOrder.customer.phone,
          newOrder.customer.address,
          newOrder.customer.city,
          newOrder.customer.district,
          subtotal,
          shipping,
          total,
          'PAID',
          paymentResult.transactionId,
          newOrder.payment.method,
          idempotencyKey || null
        ]
      );

      for (const item of reservation.items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, item.productId, item.name, item.price, item.quantity, item.imageUrl || '']
        );
      }

      await client.query('COMMIT');
      console.log(`[PostgreSQL Order] Order ${orderId} saved to database.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.warn('[PostgreSQL Order Save Error]:', err.message);
    } finally {
      client.release();
    }
  }

  // Always keep in-memory synchronized as well
  memoryOrders.set(orderId, newOrder);
  console.log(`[Order] New order placed successfully: ${orderId} for Rs. ${total}`);

  return {
    success: true,
    order: newOrder,
    message: 'Congratulations! Your order has been placed and confirmed.'
  };
}

/**
 * Get all orders sorted by creation date (newest first)
 */
async function getAllOrders() {
  if (db.isConnected()) {
    try {
      const ordersRes = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
      const resultOrders = [];

      for (const row of ordersRes.rows) {
        const itemsRes = await db.query(
          'SELECT product_id AS "productId", product_name AS "name", price, quantity, image_url AS "imageUrl" FROM order_items WHERE order_id = $1',
          [row.id]
        );

        resultOrders.push({
          id: row.id,
          reservationId: row.reservation_id,
          customer: {
            fullName: row.customer_name,
            email: row.customer_email,
            phone: row.customer_phone,
            address: row.delivery_address,
            city: row.city,
            district: row.district
          },
          items: itemsRes.rows,
          pricing: {
            subtotal: row.subtotal,
            shipping: row.shipping,
            total: row.total_amount,
            currency: 'LKR'
          },
          payment: {
            status: row.status,
            transactionId: row.payment_id,
            method: row.payment_method || 'Credit/Debit Card'
          },
          refund: row.refund_id ? {
            refundId: row.refund_id,
            refundedAmount: row.total_amount,
            reason: row.refund_reason,
            refundedAt: row.refunded_at
          } : null,
          status: row.status,
          createdAt: row.created_at
        });
      }

      return resultOrders;
    } catch (err) {
      console.warn('[PostgreSQL Orders Fetch Error, using memory]:', err.message);
    }
  }

  return Array.from(memoryOrders.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

/**
 * Get single order by ID
 */
async function getOrderById(orderId) {
  if (db.isConnected()) {
    try {
      const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      if (orderRes.rows.length > 0) {
        const row = orderRes.rows[0];
        const itemsRes = await db.query(
          'SELECT product_id AS "productId", product_name AS "name", price, quantity, image_url AS "imageUrl" FROM order_items WHERE order_id = $1',
          [orderId]
        );
        return {
          id: row.id,
          reservationId: row.reservation_id,
          customer: {
            fullName: row.customer_name,
            email: row.customer_email,
            phone: row.customer_phone,
            address: row.delivery_address,
            city: row.city,
            district: row.district
          },
          items: itemsRes.rows,
          pricing: {
            subtotal: row.subtotal,
            shipping: row.shipping,
            total: row.total_amount,
            currency: 'LKR'
          },
          payment: {
            status: row.status,
            transactionId: row.payment_id,
            method: row.payment_method
          },
          refund: row.refund_id ? {
            refundId: row.refund_id,
            refundedAmount: row.total_amount,
            reason: row.refund_reason,
            refundedAt: row.refunded_at
          } : null,
          status: row.status,
          createdAt: row.created_at
        };
      }
    } catch (err) {
      console.warn('[PostgreSQL Order Get Error]:', err.message);
    }
  }

  return memoryOrders.get(orderId) || null;
}

/**
 * Cancel an order and trigger a simulated refund
 * Also automatically returns the items back to available inventory!
 */
async function cancelOrder(orderId, reason = 'Customer requested cancellation') {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new Error(`Order "${orderId}" not found.`);
  }

  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
    throw new Error(`Order "${orderId}" has already been cancelled and refunded.`);
  }

  // 1. Process simulated refund with payment gateway
  const refundResult = await paymentService.processRefund({
    transactionId: order.payment.transactionId,
    amount: order.pricing.total,
    reason
  });

  // 2. Return items back to warehouse stock in inventory
  await inventoryService.restoreStock(order.items);

  // 3. Update order state in PostgreSQL if connected
  if (db.isConnected()) {
    try {
      await db.query(
        `UPDATE orders
         SET status = $1, refund_id = $2, refund_reason = $3, refunded_at = NOW()
         WHERE id = $4`,
        ['REFUNDED', refundResult.refundId, reason, orderId]
      );
      console.log(`[PostgreSQL Order] Order ${orderId} marked as REFUNDED.`);
    } catch (err) {
      console.warn('[PostgreSQL Order Cancel Error]:', err.message);
    }
  }

  // Update in-memory copy
  order.status = 'REFUNDED';
  order.refund = {
    refundId: refundResult.refundId,
    refundedAmount: refundResult.amount,
    currency: 'LKR',
    reason,
    refundedAt: refundResult.timestamp
  };
  order.updatedAt = new Date().toISOString();
  memoryOrders.set(orderId, order);

  console.log(`[Order] Order ${orderId} was refunded. Refund ID: ${refundResult.refundId}`);
  return {
    success: true,
    order,
    refund: refundResult,
    message: `Order ${orderId} was successfully cancelled. A full refund of Rs. ${order.pricing.total.toLocaleString()} has been processed, and stock has been restocked.`
  };
}

module.exports = {
  placeOrder,
  getAllOrders,
  getOrderById,
  cancelOrder
};
