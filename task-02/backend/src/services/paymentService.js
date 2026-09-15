// Mock payment gateway with success, decline, timeout simulation, and idempotency cache
// Supports both PostgreSQL database and in-memory fallback.

const crypto = require('crypto');
const db = require('../db/db');

// In-memory idempotency cache fallback
// Key: idempotencyKey -> { status: 'PENDING' | 'COMPLETED', response, timestamp }
const idempotencyStore = new Map();

/**
 * Process a mock payment with simulated outcomes and idempotency checks
 */
async function processPayment({
  idempotencyKey,
  reservationId,
  amount,
  simulationMode = 'SUCCESS',
  paymentDetails = {}
}) {
  // 1. Check idempotency: check PostgreSQL first if connected
  if (idempotencyKey && db.isConnected()) {
    try {
      const rowRes = await db.query(
        'SELECT response_json FROM idempotency_records WHERE key = $1',
        [idempotencyKey]
      );
      if (rowRes.rows.length > 0) {
        console.log(`[PostgreSQL Payment] Idempotent hit: Returning cached result for key ${idempotencyKey}.`);
        const cached = JSON.parse(rowRes.rows[0].response_json);
        return {
          ...cached,
          isDuplicate: true
        };
      }
    } catch (err) {
      console.warn('[PostgreSQL Idempotency Check Error]:', err.message);
    }
  }

  // Fallback: in-memory idempotency check
  if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
    const cached = idempotencyStore.get(idempotencyKey);
    if (cached.status === 'PENDING') {
      console.log(`[Payment] Idempotency conflict: Key ${idempotencyKey} is still processing.`);
      return {
        isDuplicate: true,
        success: false,
        error: 'A payment request with this session is already processing. Please wait.'
      };
    }

    console.log(`[Payment] Idempotent hit: Returning cached result for key ${idempotencyKey}.`);
    return {
      ...cached.response,
      isDuplicate: true
    };
  }

  // Mark key as PENDING in memory while processing
  if (idempotencyKey) {
    idempotencyStore.set(idempotencyKey, {
      status: 'PENDING',
      timestamp: Date.now()
    });
  }

  // Helper to save idempotency response to DB and memory
  const saveAndReturn = async (result) => {
    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, {
        status: 'COMPLETED',
        response: result,
        timestamp: Date.now()
      });

      if (db.isConnected()) {
        try {
          await db.query(
            `INSERT INTO idempotency_records (key, response_json)
             VALUES ($1, $2)
             ON CONFLICT (key) DO UPDATE SET response_json = $2`,
            [idempotencyKey, JSON.stringify(result)]
          );
        } catch (e) {
          console.warn('[PostgreSQL Save Idempotency Error]:', e.message);
        }
      }
    }
    return result;
  };

  console.log(`[Payment] Processing charge of Rs. ${amount} in "${simulationMode}" mode.`);

  // 2. Handle simulated TIMEOUT scenario
  if (simulationMode === 'TIMEOUT') {
    console.log('[Payment] Simulating payment gateway timeout (stalled network)...');
    await new Promise(resolve => setTimeout(resolve, 4000));

    const timeoutResult = {
      success: false,
      status: 'GATEWAY_TIMEOUT',
      transactionId: null,
      error: 'Gateway Timeout: The payment processor took too long to respond. No funds were captured. Please check your connection and retry.',
      amount,
      currency: 'LKR',
      timestamp: new Date().toISOString()
    };

    return saveAndReturn(timeoutResult);
  }

  // Realistic small processing delay (800ms)
  await new Promise(resolve => setTimeout(resolve, 800));

  // 3. Handle simulated FAILURE scenario
  if (simulationMode === 'FAILURE') {
    const failReasons = [
      'Card declined: Insufficient funds in bank account.',
      'Card declined: Transaction flagged by issuer anti-fraud checks.',
      'Card expired or invalid CVV security code.'
    ];
    const reason = failReasons[0];

    console.log(`[Payment] Simulated payment failure: ${reason}`);
    const failureResult = {
      success: false,
      status: 'DECLINED',
      transactionId: null,
      error: reason,
      amount,
      currency: 'LKR',
      timestamp: new Date().toISOString()
    };

    return saveAndReturn(failureResult);
  }

  // 4. Handle simulated SUCCESS scenario
  const transactionId = 'TXN_' + crypto.randomUUID().slice(0, 12).toUpperCase();
  console.log(`[Payment] Payment succeeded! Transaction ID: ${transactionId}`);

  const maskedCard = paymentDetails.cardNumber
    ? '•••• •••• •••• ' + paymentDetails.cardNumber.slice(-4)
    : '•••• •••• •••• 4242';

  const successResult = {
    success: true,
    status: 'SUCCEEDED',
    transactionId,
    amount,
    currency: 'LKR',
    paymentMethod: {
      type: paymentDetails.method || 'Credit/Debit Card',
      cardLast4: maskedCard,
      cardHolder: paymentDetails.cardHolder || 'Customer'
    },
    message: 'Payment authorized and captured successfully.',
    timestamp: new Date().toISOString()
  };

  return saveAndReturn(successResult);
}

/**
 * Simulate refunding a transaction
 */
async function processRefund({ transactionId, amount, reason = 'Order cancelled by customer' }) {
  console.log(`[Payment] Issuing mock refund of Rs. ${amount} for transaction ${transactionId}.`);
  await new Promise(resolve => setTimeout(resolve, 500));

  const refundId = 'REF_' + crypto.randomUUID().slice(0, 10).toUpperCase();

  return {
    success: true,
    refundId,
    transactionId,
    amount,
    currency: 'LKR',
    status: 'REFUNDED',
    reason,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  processPayment,
  processRefund
};
