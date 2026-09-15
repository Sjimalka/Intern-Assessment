import 'dotenv/config';
import { initSchema, resetDatabase, pool } from './src/db.js';
import { inventoryService } from './src/services/inventoryService.js';
import { orderService } from './src/services/orderService.js';
import { paymentService } from './src/services/paymentService.js';

console.log('Running POS Concurrency & Stock Tests on PostgreSQL...');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  PASS: ${message}`);
      passed++;
    } else {
      console.error(`  FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // set up fresh database
    await initSchema();
    await resetDatabase();

    // test 1: 25 buyers trying to buy 5 items at the same time
    console.log('\n[Test 1] Concurrency & Overselling Test:');
    
    // create test item with only 5 in stock
    const testProd = await inventoryService.createProduct({
      name: 'Ultra Rare Collector Watch',
      sku: 'WATCH-RARE-' + Date.now(),
      category: 'Jewelry',
      price: 999.00,
      total_stock: 5
    });

    console.log(`  Created test item "${testProd.name}" with stock = 5.`);
    console.log(`  Launching 25 simultaneous checkout requests (each requesting 1 unit)...`);

    // send 25 requests all at once
    const concurrencyLevel = 25;
    const checkoutPromises = Array.from({ length: concurrencyLevel }).map(async (_, i) => {
      try {
        const order = await orderService.createOrderFromCart({
          items: [{ productId: testProd.id, quantity: 1 }],
          customerName: `Concurrent Buyer #${i + 1}`,
          durationMs: 60000 // 1 minute
        });
        return { success: true, orderId: order.id, buyer: `Buyer #${i + 1}` };
      } catch (err) {
        return { success: false, error: err.message, statusCode: err.statusCode };
      }
    });

    const results = await Promise.all(checkoutPromises);

    const successful = results.filter(r => r.success);
    const rejected = results.filter(r => !r.success);

    console.log(`  -> Successful reservations: ${successful.length}`);
    console.log(`  -> Rejected (Conflict 409): ${rejected.length}`);

    const updatedProd = await inventoryService.getProductById(testProd.id);
    console.log(`  -> Final Product State: Total=${updatedProd.total_stock}, Reserved=${updatedProd.reserved_stock}, Available=${updatedProd.available_stock}`);

    assert(successful.length === 5, 'Exactly 5 buyers successfully reserved the 5 available items');
    assert(rejected.length === 20, 'Remaining 20 buyers were rejected with 409 Conflict');
    assert(updatedProd.available_stock === 0, 'Available stock is exactly 0 (no overselling)');
    assert(updatedProd.reserved_stock === 5, 'Reserved stock is exactly 5');
    assert(updatedProd.total_stock === 5, 'Total stock remains intact at 5 until payment');

    // test 2: successful payment permanently deducts stock
    console.log('\n[Test 2] Payment Success Test:');
    const orderToPay = successful[0].orderId;
    const paymentResult = await paymentService.processPayment({
      orderId: orderToPay,
      idempotencyKey: 'idemp_key_' + orderToPay,
      paymentMethod: 'Credit Card',
      simulatedOutcome: 'success'
    });

    const orderAfterPay = await orderService.getOrderById(orderToPay);
    const prodAfterPay = await inventoryService.getProductById(testProd.id);

    assert(orderAfterPay.status === 'PAID', 'Order transitioned to PAID status');
    assert(paymentResult.payment.outcome === 'SUCCESS', 'Payment record has SUCCESS outcome');
    assert(prodAfterPay.total_stock === 4, 'Total physical stock decremented to 4');
    assert(prodAfterPay.reserved_stock === 4, 'Reserved stock decremented from 5 to 4');

    // test 3: duplicate payment request with same idempotency key
    console.log('\n[Test 3] Idempotency & Duplicate Payment Test:');
    const duplicateAttempt = await paymentService.processPayment({
      orderId: orderToPay,
      idempotencyKey: 'idemp_key_' + orderToPay, // same key
      paymentMethod: 'Credit Card',
      simulatedOutcome: 'success'
    });

    const prodAfterDuplicate = await inventoryService.getProductById(testProd.id);
    assert(duplicateAttempt.isDuplicate === true, 'Duplicate payment detected via idempotency key');
    assert(prodAfterDuplicate.total_stock === 4, 'Total stock was NOT double-decremented');

    // test 4: failed payment releases reserved stock immediately
    console.log('\n[Test 4] Payment Decline Test:');
    const orderToFail = successful[1].orderId;
    const failResult = await paymentService.processPayment({
      orderId: orderToFail,
      idempotencyKey: 'idemp_fail_' + orderToFail,
      paymentMethod: 'Debit Card',
      simulatedOutcome: 'failure'
    });

    const orderAfterFail = await orderService.getOrderById(orderToFail);
    const prodAfterFail = await inventoryService.getProductById(testProd.id);

    assert(orderAfterFail.status === 'FAILED', 'Order transitioned to FAILED status');
    assert(failResult.payment.outcome === 'DECLINED', 'Payment record has DECLINED outcome');
    assert(prodAfterFail.reserved_stock === 3, 'Reserved stock released from 4 to 3');
    assert(prodAfterFail.available_stock === 1, 'Available stock restored to 1');

    // test 5: cancelling an order restores stock
    console.log('\n[Test 5] Order Cancellation Test:');
    const orderToCancel = successful[2].orderId;
    const cancelResult = await orderService.cancelOrder(orderToCancel, 'Customer changed mind');
    const prodAfterCancel = await inventoryService.getProductById(testProd.id);

    assert(cancelResult.status === 'CANCELLED', 'Order transitioned to CANCELLED status');
    assert(prodAfterCancel.reserved_stock === 2, 'Reserved stock decreased from 3 to 2');
    assert(prodAfterCancel.available_stock === 2, 'Available stock increased from 1 to 2');

    // test 6: expired reservation releases stock automatically
    console.log('\n[Test 6] Reservation Expiry Test:');
    const orderToExpire = successful[3].orderId;
    const expireResult = await orderService.expireOrder(orderToExpire, '5-minute window elapsed');
    const prodAfterExpire = await inventoryService.getProductById(testProd.id);

    assert(expireResult.status === 'EXPIRED', 'Order transitioned to EXPIRED status');
    assert(prodAfterExpire.reserved_stock === 1, 'Reserved stock released from 2 to 1');
    assert(prodAfterExpire.available_stock === 3, 'Available stock increased from 2 to 3');

    // test summary
    console.log(`\nTest results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      console.log('All tests passed!\n');
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch {}
  }
}

runTests();
