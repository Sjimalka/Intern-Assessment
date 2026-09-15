import { pool } from '../db.js';
import { orderService } from '../services/orderService.js';

let workerIntervalId = null;

let lastLoggedError = null;

// scans for orders older than 5 minutes and gives stock back
export async function checkAndExpireStaleReservations() {
  const now = Date.now();
  try {
    // find any checkout order that passed its 5-minute expiry time
    const res = await pool.query(`
      SELECT id, order_number, expires_at 
      FROM orders 
      WHERE status = 'RESERVED' AND expires_at <= $1;
    `, [now]);

    // reset error tracking if query succeeded
    lastLoggedError = null;

    const expiredOrders = res.rows;

    if (expiredOrders.length > 0) {
      console.log(`[ExpiryWorker] Found ${expiredOrders.length} expired reservation(s). Restoring stock...`);
      for (const ord of expiredOrders) {
        await orderService.expireOrder(ord.id, 'Automatic 5-minute checkout window expiry');
        console.log(`[ExpiryWorker] Order ${ord.order_number} expired. Stock released.`);
      }
    }
  } catch (err) {
    const msg = err.message || err.code || 'Database connection error';
    if (lastLoggedError !== msg) {
      console.error('[ExpiryWorker] Waiting for PostgreSQL connection:', msg);
      lastLoggedError = msg;
    }
  }
}

// start polling every 5 seconds
export function startExpiryWorker(intervalMs = 5000) {
  if (workerIntervalId) return;

  // check right away once on startup
  checkAndExpireStaleReservations().catch(() => {});

  // repeat every 5 seconds
  workerIntervalId = setInterval(() => {
    checkAndExpireStaleReservations().catch(() => {});
  }, intervalMs);
  console.log(`[ExpiryWorker] Checking for expired orders every ${intervalMs / 1000}s`);
}

// stop the background interval
export function stopExpiryWorker() {
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
    console.log('[ExpiryWorker] Stopped background worker');
  }
}
