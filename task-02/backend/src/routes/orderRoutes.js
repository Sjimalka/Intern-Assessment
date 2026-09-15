// Orders, payment processing, and refund API routes

const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');

// POST /api/orders - Place order and process payment (mock gateway with idempotency)
router.post('/', async (req, res) => {
  try {
    const {
      reservationId,
      customer,
      paymentDetails,
      simulationMode = 'SUCCESS',
      idempotencyKey
    } = req.body;

    if (!reservationId) {
      return res.status(400).json({
        success: false,
        error: 'reservationId is required to place an order.'
      });
    }

    if (!customer || !customer.fullName || !customer.address) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in required shipping details (name and address).'
      });
    }

    const result = await orderService.placeOrder({
      reservationId,
      customer,
      paymentDetails,
      simulationMode,
      idempotencyKey
    });

    if (!result.success) {
      // Return 402 Payment Required or 504 Gateway Timeout if payment failed
      const statusCode = result.status === 'GATEWAY_TIMEOUT' ? 504 : 402;
      return res.status(statusCode).json(result);
    }

    res.status(201).json(result);
  } catch (err) {
    console.error('[Order Placement Error]:', err.message);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// GET /api/orders - Retrieve customer order history
router.get('/', async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not fetch order history.' });
  }
});

// GET /api/orders/:id - Get specific order details
router.get('/:id', async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not fetch order.' });
  }
});

// POST /api/orders/:id/cancel - Cancel order, refund money, and restock items
router.post('/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await orderService.cancelOrder(req.params.id, reason);
    res.json(result);
  } catch (err) {
    console.error('[Order Cancellation Error]:', err.message);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
