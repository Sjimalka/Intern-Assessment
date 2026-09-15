import express from 'express';
import { inventoryService } from '../services/inventoryService.js';
import { orderService } from '../services/orderService.js';
import { paymentService } from '../services/paymentService.js';
import { resetDatabase, getDatabaseStatus } from '../db.js';
import { checkAndExpireStaleReservations } from '../workers/expiryWorker.js';

const router = express.Router();

// get all products with current stock counts
router.get('/products', async (req, res, next) => {
  try {
    const products = await inventoryService.getAllProducts();
    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    next(err);
  }
});

// get single product by id
router.get('/products/:id', async (req, res, next) => {
  try {
    const product = await inventoryService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// add a new product
router.post('/products', async (req, res, next) => {
  try {
    const { name, sku, category, price, total_stock, image_url } = req.body;
    if (!name || !sku || price === undefined) {
      return res.status(400).json({ success: false, error: 'Name, SKU, and price are required' });
    }
    const created = await inventoryService.createProduct({ name, sku, category, price, total_stock, image_url });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// update product details or stock
router.put('/products/:id', async (req, res, next) => {
  try {
    const updated = await inventoryService.updateProduct(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// delete product (only if no active checkout reservations)
router.delete('/products/:id', async (req, res, next) => {
  try {
    const result = await inventoryService.deleteProduct(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// checkout handler
const handleCheckout = async (req, res, next) => {
  try {
    const { items, customerName, customerEmail, durationMs } = req.body;
    const order = await orderService.createOrderFromCart({
      items,
      customerName,
      customerEmail,
      durationMs
    });
    res.status(201).json({
      success: true,
      message: 'Stock reserved successfully for 5 minutes',
      data: order,
      order
    });
  } catch (err) {
    next(err);
  }
};

// support /checkout, /orders, and /orders/checkout
router.post('/checkout', handleCheckout);
router.post('/orders/checkout', handleCheckout);
router.post('/orders', handleCheckout);

// get all orders (can filter by status e.g. PAID, RESERVED)
router.get('/orders', async (req, res, next) => {
  try {
    const { status, limit } = req.query;
    const orders = await orderService.getAllOrders(status || null, limit ? parseInt(limit, 10) : 50);
    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
});

// get single order details
router.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// cancel order and give stock back to inventory
router.post('/orders/:id/cancel', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const cancelledOrder = await orderService.cancelOrder(req.params.id, reason || 'User requested cancellation');
    res.json({
      success: true,
      message: 'Order cancelled and reserved stock restored',
      data: cancelledOrder
    });
  } catch (err) {
    next(err);
  }
});

// test route: expire order right now without waiting 5 minutes
router.post('/orders/:id/expire', async (req, res, next) => {
  try {
    const expiredOrder = await orderService.expireOrder(req.params.id, 'Manual test expiry trigger');
    if (!expiredOrder) {
      return res.status(400).json({ success: false, error: 'Order is not in RESERVED status or not found' });
    }
    res.json({
      success: true,
      message: 'Order expired and reserved stock restored',
      data: expiredOrder
    });
  } catch (err) {
    next(err);
  }
});

// process payment (handles success, card decline, or gateway timeout)
router.post('/payments/process', async (req, res, next) => {
  try {
    const { orderId, idempotencyKey, paymentMethod, simulatedOutcome } = req.body;
    const result = await paymentService.processPayment({
      orderId,
      idempotencyKey,
      paymentMethod,
      simulatedOutcome: simulatedOutcome || 'success'
    });

    // if already paid or duplicate request, return existing result
    if (result.isDuplicate) {
      return res.status(200).json({
        success: true,
        isDuplicate: true,
        message: result.message,
        data: result
      });
    }

    res.status(200).json({
      success: true,
      message: `Payment processed with outcome: ${result.payment.outcome}`,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// get stock movement history
router.get('/inventory/audit', async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
    const logs = await inventoryService.getAuditLogs(limit);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    next(err);
  }
});

// reset database back to original sample products
router.post('/system/reset', async (req, res, next) => {
  try {
    await resetDatabase();
    res.json({ success: true, message: 'Database reset to default seed data successfully' });
  } catch (err) {
    next(err);
  }
});

// force check for expired orders right now
router.post('/system/trigger-expiry-check', async (req, res, next) => {
  try {
    await checkAndExpireStaleReservations();
    res.json({ success: true, message: 'Expiry check executed' });
  } catch (err) {
    next(err);
  }
});

// get active database engine status
router.get('/system/db-status', (req, res) => {
  res.json({ success: true, ...getDatabaseStatus() });
});

export default router;
