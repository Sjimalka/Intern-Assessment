// Checkout and stock reservation API routes

const express = require('express');
const router = express.Router();
const inventoryService = require('../services/inventoryService');

// POST /api/checkout/reserve - Lock stock for cart items for 10 minutes
router.post('/reserve', async (req, res) => {
  try {
    const { items, ttlSeconds = 600 } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Your cart is empty. Please add items before checking out.'
      });
    }

    const reservation = await inventoryService.createReservation(items, ttlSeconds);
    res.status(201).json({
      success: true,
      reservation,
      message: `Stock reserved successfully for ${ttlSeconds / 60} minutes.`
    });
  } catch (err) {
    console.error('[Checkout Reserve Error]:', err.message);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// GET /api/checkout/reserve/:id - Check remaining time & status of a reservation
router.get('/reserve/:id', async (req, res) => {
  try {
    const reservation = await inventoryService.getReservation(req.params.id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found or has expired.'
      });
    }

    const remainingMs = Math.max(0, reservation.expiresAt - Date.now());
    const remainingSeconds = Math.floor(remainingMs / 1000);

    res.json({
      success: true,
      reservation: {
        ...reservation,
        remainingSeconds,
        isExpired: remainingSeconds <= 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not fetch reservation.' });
  }
});

// POST /api/checkout/release - Manually release reservation hold
router.post('/release', async (req, res) => {
  try {
    const { reservationId } = req.body;
    if (!reservationId) {
      return res.status(400).json({ success: false, error: 'reservationId is required.' });
    }

    const released = await inventoryService.releaseReservation(reservationId);
    res.json({
      success: true,
      released,
      message: released ? 'Stock hold released back to store.' : 'Reservation already inactive.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not release reservation.' });
  }
});

module.exports = router;
