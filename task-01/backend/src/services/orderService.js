import { pool, getClient } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

// 5 minutes in milliseconds
export const DEFAULT_RESERVATION_DURATION_MS = 5 * 60 * 1000;

// handles order creation, stock reservations, and cancellations
export const orderService = {
  // turn cart into order and hold stock using SELECT ... FOR UPDATE row locks
  async createOrderFromCart({ items, customerName = 'Guest Customer', customerEmail = '', durationMs = DEFAULT_RESERVATION_DURATION_MS }) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      const err = new Error('Cart cannot be empty');
      err.statusCode = 400;
      throw err;
    }

    // check that all quantities are positive numbers
    for (const item of items) {
      if (!item.productId || !item.quantity || parseInt(item.quantity, 10) <= 0) {
        const err = new Error('Each item must have a valid productId and positive quantity');
        err.statusCode = 400;
        throw err;
      }
    }

    const orderId = 'ord_' + uuidv4().substring(0, 8);
    const orderNumber = 'ORD-' + Date.now().toString().slice(-6) + '-' + Math.floor(100 + Math.random() * 900);
    const now = Date.now();
    const expiresAt = now + durationMs;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      let totalAmount = 0;
      const verifiedLineItems = [];

      // lock rows and reserve stock
      for (const item of items) {
        const requestedQty = parseInt(item.quantity, 10);

        // row-level lock ensures serial reservation per product
        const prodRes = await client.query(`
          SELECT 
            id, 
            name, 
            CAST(price AS DOUBLE PRECISION) AS price, 
            total_stock, 
            reserved_stock, 
            (total_stock - reserved_stock) AS available_stock
          FROM products
          WHERE id = $1
          FOR UPDATE;
        `, [item.productId]);

        if (prodRes.rows.length === 0) {
          const err = new Error(`Product with ID "${item.productId}" does not exist`);
          err.statusCode = 404;
          throw err;
        }

        const product = prodRes.rows[0];
        const available = product.available_stock;

        // stop if insufficient stock is available
        if (available < requestedQty) {
          const err = new Error(`Insufficient stock for "${product.name}". Available: ${available}, Requested: ${requestedQty}`);
          err.statusCode = 409;
          throw err;
        }

        // atomically increment reserved_stock
        await client.query(`
          UPDATE products
          SET 
            reserved_stock = reserved_stock + $1,
            updated_at = $2
          WHERE id = $3;
        `, [requestedQty, now, product.id]);

        const lineTotal = product.price * requestedQty;
        totalAmount += lineTotal;

        verifiedLineItems.push({
          id: 'item_' + uuidv4().substring(0, 8),
          orderId,
          productId: product.id,
          productName: product.name,
          quantity: requestedQty,
          unitPrice: product.price,
          totalPrice: lineTotal
        });

        // write reserve event to audit log
        await client.query(`
          INSERT INTO inventory_audit_log (id, product_id, product_name, action, quantity_change, new_total_stock, new_reserved_stock, reference_id, reason, created_at)
          VALUES ($1, $2, $3, 'RESERVE', $4, $5, $6, $7, 'Stock reserved for checkout', $8);
        `, [
          uuidv4(),
          product.id,
          product.name,
          requestedQty,
          product.total_stock,
          product.reserved_stock + requestedQty,
          orderId,
          now
        ]);
      }

      // save order as RESERVED with 5 minute timer
      await client.query(`
        INSERT INTO orders (id, order_number, customer_name, customer_email, total_amount, status, reserved_at, expires_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'RESERVED', $6, $7, $8, $9);
      `, [orderId, orderNumber, customerName, customerEmail, Math.round(totalAmount * 100) / 100, now, expiresAt, now, now]);

      // save order line items
      for (const line of verifiedLineItems) {
        await client.query(`
          INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [line.id, line.orderId, line.productId, line.productName, line.quantity, line.unitPrice, line.totalPrice]);
      }

      await client.query('COMMIT');
      return await this.getOrderById(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // get order by id and compute how many seconds are left on reservation
  async getOrderById(id) {
    const orderRes = await pool.query(`
      SELECT 
        id, 
        order_number, 
        customer_name, 
        customer_email, 
        CAST(total_amount AS DOUBLE PRECISION) AS total_amount, 
        status, 
        reserved_at, 
        expires_at, 
        paid_at, 
        cancelled_at, 
        failed_at, 
        created_at, 
        updated_at 
      FROM orders 
      WHERE id = $1;
    `, [id]);

    if (orderRes.rows.length === 0) return null;
    const order = orderRes.rows[0];

    const itemsRes = await pool.query(`
      SELECT 
        id, 
        order_id, 
        product_id, 
        product_name, 
        quantity, 
        CAST(unit_price AS DOUBLE PRECISION) AS unit_price, 
        CAST(total_price AS DOUBLE PRECISION) AS total_price 
      FROM order_items 
      WHERE order_id = $1;
    `, [id]);

    const paymentsRes = await pool.query(`
      SELECT 
        id, 
        order_id, 
        idempotency_key, 
        CAST(amount AS DOUBLE PRECISION) AS amount, 
        payment_method, 
        gateway_transaction_id, 
        outcome, 
        error_message, 
        created_at 
      FROM payments 
      WHERE order_id = $1 
      ORDER BY created_at DESC;
    `, [id]);

    const now = Date.now();
    const remainingMs = order.status === 'RESERVED' ? Math.max(0, parseInt(order.expires_at, 10) - now) : 0;

    return {
      ...order,
      items: itemsRes.rows,
      payments: paymentsRes.rows,
      remainingSeconds: Math.floor(remainingMs / 1000),
      isExpired: order.status === 'RESERVED' && remainingMs <= 0
    };
  },

  // list orders with optional status filter
  async getAllOrders(status = null, limit = 50) {
    let text = `
      SELECT 
        id, 
        order_number, 
        customer_name, 
        customer_email, 
        CAST(total_amount AS DOUBLE PRECISION) AS total_amount, 
        status, 
        reserved_at, 
        expires_at, 
        paid_at, 
        cancelled_at, 
        failed_at, 
        created_at, 
        updated_at 
      FROM orders
    `;
    const params = [];

    if (status) {
      text += ' WHERE status = $1';
      params.push(status);
    }

    text += ` ORDER BY created_at DESC LIMIT $${params.length + 1};`;
    params.push(limit);

    const ordersRes = await pool.query(text, params);
    const now = Date.now();

    const orders = await Promise.all(ordersRes.rows.map(async (order) => {
      const itemsRes = await pool.query(`
        SELECT 
          id, 
          order_id, 
          product_id, 
          product_name, 
          quantity, 
          CAST(unit_price AS DOUBLE PRECISION) AS unit_price, 
          CAST(total_price AS DOUBLE PRECISION) AS total_price 
        FROM order_items 
        WHERE order_id = $1;
      `, [order.id]);

      const remainingMs = order.status === 'RESERVED' ? Math.max(0, parseInt(order.expires_at, 10) - now) : 0;
      return {
        ...order,
        items: itemsRes.rows,
        remainingSeconds: Math.floor(remainingMs / 1000)
      };
    }));

    return orders;
  },

  // cancel order and give back reserved stock
  async cancelOrder(orderId, reason = 'Customer cancelled checkout') {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE;', [orderId]);
      if (orderRes.rows.length === 0) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
      }

      const order = orderRes.rows[0];

      // can only cancel reserved orders
      if (order.status !== 'RESERVED') {
        const err = new Error(`Cannot cancel order in "${order.status}" status. Only RESERVED orders can be cancelled.`);
        err.statusCode = 400;
        throw err;
      }

      const now = Date.now();
      const itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1;', [orderId]);

      // return reserved items back to available stock
      for (const item of itemsRes.rows) {
        await client.query(`
          UPDATE products
          SET 
            reserved_stock = GREATEST(0, reserved_stock - $1),
            updated_at = $2
          WHERE id = $3;
        `, [item.quantity, now, item.product_id]);

        const prodRes = await client.query('SELECT total_stock, reserved_stock FROM products WHERE id = $1;', [item.product_id]);
        const currentProduct = prodRes.rows[0];

        await client.query(`
          INSERT INTO inventory_audit_log (id, product_id, product_name, action, quantity_change, new_total_stock, new_reserved_stock, reference_id, reason, created_at)
          VALUES ($1, $2, $3, 'RELEASE', $4, $5, $6, $7, $8, $9);
        `, [
          uuidv4(),
          item.product_id,
          item.product_name,
          -item.quantity,
          currentProduct ? currentProduct.total_stock : 0,
          currentProduct ? currentProduct.reserved_stock : 0,
          orderId,
          reason,
          now
        ]);
      }

      // mark order as CANCELLED
      await client.query(`
        UPDATE orders
        SET status = 'CANCELLED', cancelled_at = $1, updated_at = $2
        WHERE id = $3;
      `, [now, now, orderId]);

      await client.query('COMMIT');
      return await this.getOrderById(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // expire order after 5 minutes and release stock
  async expireOrder(orderId, reason = 'Reservation 5-minute window expired') {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE;', [orderId]);
      if (orderRes.rows.length === 0 || orderRes.rows[0].status !== 'RESERVED') {
        await client.query('ROLLBACK');
        return null;
      }

      const now = Date.now();
      const itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1;', [orderId]);

      // unlock reserved stock for each item
      for (const item of itemsRes.rows) {
        await client.query(`
          UPDATE products
          SET 
            reserved_stock = GREATEST(0, reserved_stock - $1),
            updated_at = $2
          WHERE id = $3;
        `, [item.quantity, now, item.product_id]);

        const prodRes = await client.query('SELECT total_stock, reserved_stock FROM products WHERE id = $1;', [item.product_id]);
        const currentProduct = prodRes.rows[0];

        await client.query(`
          INSERT INTO inventory_audit_log (id, product_id, product_name, action, quantity_change, new_total_stock, new_reserved_stock, reference_id, reason, created_at)
          VALUES ($1, $2, $3, 'RELEASE', $4, $5, $6, $7, $8, $9);
        `, [
          uuidv4(),
          item.product_id,
          item.product_name,
          -item.quantity,
          currentProduct ? currentProduct.total_stock : 0,
          currentProduct ? currentProduct.reserved_stock : 0,
          orderId,
          reason,
          now
        ]);
      }

      // mark order as EXPIRED
      await client.query(`
        UPDATE orders
        SET status = 'EXPIRED', updated_at = $1
        WHERE id = $2;
      `, [now, orderId]);

      await client.query('COMMIT');
      return await this.getOrderById(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};
