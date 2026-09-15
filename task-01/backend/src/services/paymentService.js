import { pool, getClient } from '../db.js';
import { orderService } from './orderService.js';
import { v4 as uuidv4 } from 'uuid';

// mock payment gateway with success, decline, and timeout simulation
export const paymentService = {
  async processPayment({ orderId, idempotencyKey, paymentMethod = 'Credit Card', simulatedOutcome = 'success' }) {
    if (!orderId) {
      const err = new Error('orderId is required');
      err.statusCode = 400;
      throw err;
    }

    if (!idempotencyKey) {
      const err = new Error('idempotencyKey is required to prevent duplicate charges');
      err.statusCode = 400;
      throw err;
    }

    // check if this payment was already processed (avoids double charging)
    const existingPaymentRes = await pool.query(
      'SELECT id, order_id, idempotency_key, CAST(amount AS DOUBLE PRECISION) AS amount, payment_method, gateway_transaction_id, outcome, error_message, created_at FROM payments WHERE idempotency_key = $1;',
      [idempotencyKey]
    );

    if (existingPaymentRes.rows.length > 0) {
      const existingPayment = existingPaymentRes.rows[0];
      const existingOrder = await orderService.getOrderById(existingPayment.order_id);
      return {
        isDuplicate: true,
        message: 'Duplicate payment request detected. Returning existing transaction result.',
        payment: existingPayment,
        order: existingOrder
      };
    }

    // make sure order exists
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      const err = new Error(`Order "${orderId}" not found`);
      err.statusCode = 404;
      throw err;
    }

    // only reserved orders can be paid
    if (order.status !== 'RESERVED') {
      const err = new Error(`Order is already in "${order.status}" status. Cannot process payment.`);
      err.statusCode = 400;
      throw err;
    }

    // check if 5 minutes ran out before payment was clicked
    if (parseInt(order.expires_at, 10) <= Date.now()) {
      await orderService.expireOrder(orderId, 'Payment attempted after 5-minute reservation expired');
      const err = new Error('Checkout reservation expired. Items have been released back to stock.');
      err.statusCode = 410;
      throw err;
    }

    // simulate a small network delay like real card machines
    await new Promise(resolve => setTimeout(resolve, 300));

    const paymentId = 'pay_' + uuidv4().substring(0, 8);
    const now = Date.now();
    const gatewayTxnId = 'gtw_' + Math.random().toString(36).substring(2, 12).toUpperCase();

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // double check status didn't change while waiting
      const lockedOrderRes = await client.query('SELECT status, expires_at FROM orders WHERE id = $1 FOR UPDATE;', [orderId]);
      if (lockedOrderRes.rows.length === 0 || lockedOrderRes.rows[0].status !== 'RESERVED') {
        const err = new Error(`Order was transitioned to "${lockedOrderRes.rows[0]?.status}" by another process.`);
        err.statusCode = 409;
        throw err;
      }

      const itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1;', [orderId]);
      const items = itemsRes.rows;

      if (simulatedOutcome === 'success') {
        // mark order paid
        await client.query(`
          UPDATE orders
          SET status = 'PAID', paid_at = $1, updated_at = $2
          WHERE id = $3;
        `, [now, now, orderId]);

        // permanently reduce stock
        for (const item of items) {
          await client.query(`
            UPDATE products
            SET 
              total_stock = total_stock - $1,
              reserved_stock = GREATEST(0, reserved_stock - $2),
              updated_at = $3
            WHERE id = $4;
          `, [item.quantity, item.quantity, now, item.product_id]);

          const prodRes = await client.query('SELECT total_stock, reserved_stock FROM products WHERE id = $1;', [item.product_id]);
          const updatedProd = prodRes.rows[0];

          await client.query(`
            INSERT INTO inventory_audit_log (id, product_id, product_name, action, quantity_change, new_total_stock, new_reserved_stock, reference_id, reason, created_at)
            VALUES ($1, $2, $3, 'DEDUCT', $4, $5, $6, $7, 'Order payment successful, stock deducted', $8);
          `, [
            uuidv4(),
            item.product_id,
            item.product_name,
            -item.quantity,
            updatedProd.total_stock,
            updatedProd.reserved_stock,
            orderId,
            now
          ]);
        }

        // record successful payment
        await client.query(`
          INSERT INTO payments (id, order_id, idempotency_key, amount, payment_method, gateway_transaction_id, outcome, error_message, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'SUCCESS', NULL, $7);
        `, [paymentId, orderId, idempotencyKey, order.total_amount, paymentMethod, gatewayTxnId, now]);

      } else if (simulatedOutcome === 'failure') {
        // card was declined: mark failed and return stock
        await client.query(`
          UPDATE orders
          SET status = 'FAILED', failed_at = $1, updated_at = $2
          WHERE id = $3;
        `, [now, now, orderId]);

        // give reserved stock back immediately
        for (const item of items) {
          await client.query(`
            UPDATE products
            SET 
              reserved_stock = GREATEST(0, reserved_stock - $1),
              updated_at = $2
            WHERE id = $3;
          `, [item.quantity, now, item.product_id]);

          const prodRes = await client.query('SELECT total_stock, reserved_stock FROM products WHERE id = $1;', [item.product_id]);
          const updatedProd = prodRes.rows[0];

          await client.query(`
            INSERT INTO inventory_audit_log (id, product_id, product_name, action, quantity_change, new_total_stock, new_reserved_stock, reference_id, reason, created_at)
            VALUES ($1, $2, $3, 'RELEASE', $4, $5, $6, $7, 'Payment failed, reservation restored', $8);
          `, [
            uuidv4(),
            item.product_id,
            item.product_name,
            -item.quantity,
            updatedProd.total_stock,
            updatedProd.reserved_stock,
            orderId,
            now
          ]);
        }

        // record declined payment
        await client.query(`
          INSERT INTO payments (id, order_id, idempotency_key, amount, payment_method, gateway_transaction_id, outcome, error_message, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'DECLINED', 'Simulated card decline / insufficient funds', $7);
        `, [paymentId, orderId, idempotencyKey, order.total_amount, paymentMethod, gatewayTxnId, now]);

      } else if (simulatedOutcome === 'timeout') {
        // gateway timed out: mark expired and return stock
        await client.query(`
          UPDATE orders
          SET status = 'EXPIRED', updated_at = $1
          WHERE id = $2;
        `, [now, orderId]);

        // release reserved stock
        for (const item of items) {
          await client.query(`
            UPDATE products
            SET 
              reserved_stock = GREATEST(0, reserved_stock - $1),
              updated_at = $2
            WHERE id = $3;
          `, [item.quantity, now, item.product_id]);

          const prodRes = await client.query('SELECT total_stock, reserved_stock FROM products WHERE id = $1;', [item.product_id]);
          const updatedProd = prodRes.rows[0];

          await client.query(`
            INSERT INTO inventory_audit_log (id, product_id, product_name, action, quantity_change, new_total_stock, new_reserved_stock, reference_id, reason, created_at)
            VALUES ($1, $2, $3, 'RELEASE', $4, $5, $6, $7, 'Payment timeout, reservation restored', $8);
          `, [
            uuidv4(),
            item.product_id,
            item.product_name,
            -item.quantity,
            updatedProd.total_stock,
            updatedProd.reserved_stock,
            orderId,
            now
          ]);
        }

        // record timeout
        await client.query(`
          INSERT INTO payments (id, order_id, idempotency_key, amount, payment_method, gateway_transaction_id, outcome, error_message, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'TIMEOUT', 'Payment gateway timed out after 30000ms', $7);
        `, [paymentId, orderId, idempotencyKey, order.total_amount, paymentMethod, gatewayTxnId, now]);

      } else {
        const err = new Error(`Unsupported simulated outcome: "${simulatedOutcome}"`);
        err.statusCode = 400;
        throw err;
      }

      await client.query('COMMIT');

      const updatedPaymentRes = await pool.query(`
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
        WHERE id = $1;
      `, [paymentId]);

      const updatedOrder = await orderService.getOrderById(orderId);

      return {
        isDuplicate: false,
        payment: updatedPaymentRes.rows[0],
        order: updatedOrder
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};
