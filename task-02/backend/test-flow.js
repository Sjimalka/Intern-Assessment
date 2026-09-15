// Automated test suite for inventory, stock holds, mock payments, and refunds

const inventoryService = require('./src/services/inventoryService');
const paymentService = require('./src/services/paymentService');
const orderService = require('./src/services/orderService');
const { initDb, isConnected } = require('./src/db/db');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('--- STARTING BACKEND INTEGRATION TESTS ---\n');

  // Attempt DB initialization if available
  await initDb();
  console.log(`[Tests] Running with backend storage: ${isConnected() ? 'PostgreSQL' : 'in-memory-fallback'}\n`);

  // 1. Products & Discovery
  const allProducts = await inventoryService.getProducts();
  assert(allProducts.length >= 10, `Loaded ${allProducts.length} products`);
  assert(allProducts[0].price > 0, `Product has price in LKR: Rs. ${allProducts[0].price}`);

  const teaProducts = await inventoryService.getProducts({ category: 'Tea & Spices' });
  assert(teaProducts.length > 0, `Filtered ${teaProducts.length} Tea & Spices products`);

  const searchResults = await inventoryService.getProducts({ search: 'Cinnamon' });
  assert(searchResults.length >= 1, `Found ${searchResults.length} product(s) matching "Cinnamon"`);

  // 2. Stock Reservation
  const targetProduct = allProducts[0]; // prod-1
  const initialAvailable = targetProduct.availableStock;
  const initialTotal = targetProduct.totalStock;

  console.log(`\nTesting stock reservation on "${targetProduct.name}" (Initial available: ${initialAvailable})...`);

  const reservation = await inventoryService.createReservation([
    { productId: targetProduct.id, quantity: 2 }
  ], 600);

  assert(reservation && reservation.id.startsWith('res_'), `Reservation created: ${reservation.id}`);

  const afterReserve = await inventoryService.getProductById(targetProduct.id);
  assert(afterReserve.availableStock === initialAvailable - 2, `Available stock reduced from ${initialAvailable} to ${afterReserve.availableStock}`);
  assert(afterReserve.reservedStock === 2, `Reserved stock is 2`);

  // 3. Over-reservation attempt
  console.log('\nTesting out-of-stock guard...');
  let overReserveFailed = false;
  try {
    await inventoryService.createReservation([
      { productId: targetProduct.id, quantity: 9999 }
    ]);
  } catch (err) {
    overReserveFailed = true;
    console.log(`Caught expected error: "${err.message}"`);
  }
  assert(overReserveFailed, 'Out-of-stock reservation correctly rejected');

  // 4. Payment Failure Simulation
  console.log('\nTesting Payment Failure simulation (Card Declined)...');
  const failPayment = await paymentService.processPayment({
    reservationId: reservation.id,
    amount: 9700,
    simulationMode: 'FAILURE'
  });
  assert(!failPayment.success, 'Payment failure returned success: false');
  assert(failPayment.status === 'DECLINED', 'Payment status is DECLINED');

  // 5. Payment Timeout Simulation
  console.log('\nTesting Payment Timeout simulation...');
  const timeoutPayment = await paymentService.processPayment({
    reservationId: reservation.id,
    amount: 9700,
    simulationMode: 'TIMEOUT'
  });
  assert(!timeoutPayment.success, 'Payment timeout returned success: false');
  assert(timeoutPayment.status === 'GATEWAY_TIMEOUT', 'Payment status is GATEWAY_TIMEOUT');

  // 6. Payment Success & Order Placement
  console.log('\nTesting Payment Success & Order Placement...');
  const idempotencyKey = 'idem-test-uuid-' + Date.now();
  const orderResult = await orderService.placeOrder({
    reservationId: reservation.id,
    customer: {
      fullName: 'Kamal Perera',
      email: 'kamal@example.lk',
      phone: '+94 77 987 6543',
      address: '45 Lotus Road',
      city: 'Colombo',
      district: 'Western'
    },
    paymentDetails: {
      cardNumber: '4242424242424242',
      cardHolder: 'Kamal Perera',
      method: 'Visa'
    },
    simulationMode: 'SUCCESS',
    idempotencyKey
  });

  assert(orderResult.success, 'Order placed successfully');
  assert(orderResult.order.id.startsWith('ORD-'), `Order ID generated: ${orderResult.order.id}`);
  assert(orderResult.order.payment.status === 'PAID', 'Order payment status is PAID');

  const afterCommit = await inventoryService.getProductById(targetProduct.id);
  assert(afterCommit.totalStock === initialTotal - 2, `Total warehouse stock decremented to ${afterCommit.totalStock}`);
  assert(afterCommit.reservedStock === 0, `Reserved stock returned to 0 after commit`);

  // 7. Idempotency Test - Duplicate Request
  console.log('\nTesting Idempotency: duplicate request with same key...');
  const duplicateResult = await orderService.placeOrder({
    reservationId: reservation.id,
    customer: { fullName: 'Kamal Perera', address: '45 Lotus Road' },
    simulationMode: 'SUCCESS',
    idempotencyKey
  });

  assert(duplicateResult.success, 'Duplicate request returned success');
  assert(duplicateResult.isDuplicate === true, 'Detected duplicate idempotency request');
  assert(duplicateResult.order.id === orderResult.order.id, 'Returned original order without creating a new one');

  // 8. Order Cancellation & Refund with Restock
  console.log('\nTesting Order Cancellation & Refund...');
  const orderId = orderResult.order.id;
  const cancelResult = await orderService.cancelOrder(orderId, 'Customer changed mind');

  assert(cancelResult.success, 'Order cancellation succeeded');
  assert(cancelResult.order.status === 'REFUNDED', 'Order status updated to REFUNDED');
  assert(cancelResult.refund && cancelResult.refund.refundId.startsWith('REF_'), `Refund ID generated: ${cancelResult.refund.refundId}`);

  const afterRefund = await inventoryService.getProductById(targetProduct.id);
  assert(afterRefund.totalStock === initialTotal, `Stock fully restored to ${initialTotal} after refund`);

  console.log('\n=============================================');
  console.log('🎉 ALL BACKEND INTEGRATION TESTS PASSED!');
  console.log('=============================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
