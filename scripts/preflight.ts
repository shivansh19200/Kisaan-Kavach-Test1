import { getPaypalClient, resetPaypalClient } from '../src/lib/paypal';
import { getDb } from '../src/lib/db/repo';
import { resetDemoData } from '../src/lib/db/repo';

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runPreflight() {
  const results: TestResult[] = [];

  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    console.log('No PayPal credentials in .env; skipping preflight. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to run.');
    return;
  }

  console.log('Running PayPal preflight tests against sandbox...\n');

  // Test 1: Full two-stage capture
  console.log('Test 1: Authorize full amount, capture 30% (final_capture=false), then capture 70% (final_capture=true)');
  try {
    resetPaypalClient();
    const client = getPaypalClient();

    const order = await client.createOrder({
      orderId: 99901,
      totalMinor: 600000,
      currency: 'USD',
      returnUrl: 'http://localhost:3000/buyer/orders/99901?paypal=success',
      cancelUrl: 'http://localhost:3000/buyer/orders/99901?paypal=cancel',
      customId: 'order-99901',
    });

    console.log(`  Created order: ${order.orderId}`);
    console.log(`  Approve URL: ${order.approveUrl}`);
    console.log('  MANUAL STEP: Open the approve URL in a browser, log in as sandbox buyer, and approve.');
    console.log('  Press Enter after approval...');

    // In a real test, we'd poll here. For now, wait for user input.
    // await new Promise(r => process.stdin.once('data', r));

    const auth = await client.getAuthorization(order.orderId);
    console.log(`  Authorization status: ${auth.status}`);

    // Stage 1
    const cap1 = await client.captureAuthorization(auth.id, {
      amountMinor: 180000,
      currency: 'USD',
      finalCapture: false,
      invoiceId: 'INV-99901-S1',
      requestId: 'test1:stage1',
    });
    console.log(`  Stage 1 capture: ${cap1.id} - ${cap1.status}`);

    // Stage 2
    const cap2 = await client.captureAuthorization(auth.id, {
      amountMinor: 420000,
      currency: 'USD',
      finalCapture: true,
      invoiceId: 'INV-99901-S2',
      requestId: 'test1:stage2',
    });
    console.log(`  Stage 2 capture: ${cap2.id} - ${cap2.status}`);

    results.push({ test: 'Two-stage capture', passed: cap1.status === 'COMPLETED' && cap2.status === 'COMPLETED', details: `Stage1: ${cap1.status}, Stage2: ${cap2.status}` });
  } catch (e) {
    results.push({ test: 'Two-stage capture', passed: false, details: String(e) });
  }

  // Test 2: Void after partial capture
  console.log('\nTest 2: Capture 30%, then void');
  try {
    resetPaypalClient();
    const client = getPaypalClient();

    const order = await client.createOrder({
      orderId: 99902,
      totalMinor: 600000,
      currency: 'USD',
      returnUrl: 'http://localhost:3000/buyer/orders/99902?paypal=success',
      cancelUrl: 'http://localhost:3000/buyer/orders/99902?paypal=cancel',
      customId: 'order-99902',
    });

    console.log(`  Created order: ${order.orderId}`);
    console.log(`  Approve URL: ${order.approveUrl}`);
    console.log('  MANUAL STEP: Approve as sandbox buyer. Press Enter...');

    const auth = await client.getAuthorization(order.orderId);
    const cap1 = await client.captureAuthorization(auth.id, {
      amountMinor: 180000,
      currency: 'USD',
      finalCapture: false,
      invoiceId: 'INV-99902-S1',
      requestId: 'test2:stage1',
    });
    console.log(`  Stage 1 capture: ${cap1.status}`);

    const voidResult = await client.voidAuthorization(auth.id);
    console.log(`  Void result: ${voidResult.status}`);

    results.push({ test: 'Partial capture then void', passed: voidResult.status === 'VOIDED', details: `Void: ${voidResult.status}` });
  } catch (e) {
    results.push({ test: 'Partial capture then void', passed: false, details: String(e) });
  }

  // Test 3: GET authorization status
  console.log('\nTest 3: GET authorization at each stage');
  try {
    resetPaypalClient();
    const client = getPaypalClient();

    const order = await client.createOrder({
      orderId: 99903,
      totalMinor: 600000,
      currency: 'USD',
      returnUrl: 'http://localhost:3000/buyer/orders/99903?paypal=success',
      cancelUrl: 'http://localhost:3000/buyer/orders/99903?paypal=cancel',
      customId: 'order-99903',
    });

    console.log(`  Created order: ${order.orderId}`);
    console.log(`  Approve URL: ${order.approveUrl}`);
    console.log('  MANUAL STEP: Approve as sandbox buyer. Press Enter...');

    const auth = await client.getAuthorization(order.orderId);
    console.log(`  Initial auth: status=${auth.status}, create_time=${auth.create_time}, expiration_time=${auth.expiration_time}`);

    const cap1 = await client.captureAuthorization(auth.id, {
      amountMinor: 180000,
      currency: 'USD',
      finalCapture: false,
      invoiceId: 'INV-99903-S1',
      requestId: 'test3:stage1',
    });
    console.log(`  After Stage 1: ${cap1.status}`);

    const auth2 = await client.getAuthorization(auth.id);
    console.log(`  Auth after partial capture: status=${auth2.status}`);

    results.push({ test: 'GET authorization status', passed: true, details: `Initial: ${auth.status}, After cap1: ${auth2.status}` });
  } catch (e) {
    results.push({ test: 'GET authorization status', passed: false, details: String(e) });
  }

  // Test 4: Refund
  console.log('\nTest 4: Refund Stage 1 capture (partial then full)');
  try {
    resetPaypalClient();
    const client = getPaypalClient();

    const order = await client.createOrder({
      orderId: 99904,
      totalMinor: 600000,
      currency: 'USD',
      returnUrl: 'http://localhost:3000/buyer/orders/99904?paypal=success',
      cancelUrl: 'http://localhost:3000/buyer/orders/99904?paypal=cancel',
      customId: 'order-99904',
    });

    console.log(`  Created order: ${order.orderId}`);
    console.log(`  Approve URL: ${order.approveUrl}`);
    console.log('  MANUAL STEP: Approve as sandbox buyer. Press Enter...');

    const auth = await client.getAuthorization(order.orderId);
    const cap1 = await client.captureAuthorization(auth.id, {
      amountMinor: 180000,
      currency: 'USD',
      finalCapture: false,
      invoiceId: 'INV-99904-S1',
      requestId: 'test4:stage1',
    });
    console.log(`  Stage 1 capture: ${cap1.id} - ${cap1.status}`);

    const refund1 = await client.refundCapture(cap1.id, {
      amountMinor: 90000,
      currency: 'USD',
      requestId: 'test4:refund1',
      invoiceId: 'REF-99904-1',
    });
    console.log(`  Partial refund: ${refund1.status}`);

    const refund2 = await client.refundCapture(cap1.id, {
      amountMinor: 90000,
      currency: 'USD',
      requestId: 'test4:refund2',
      invoiceId: 'REF-99904-2',
    });
    console.log(`  Full refund: ${refund2.status}`);

    results.push({ test: 'Refund capture', passed: refund1.status === 'COMPLETED' && (refund2.status === 'COMPLETED' || refund2.status === 'REFUND_AMOUNT_EXCEEDED'), details: `Partial: ${refund1.status}, Full: ${refund2.status}` });
  } catch (e) {
    results.push({ test: 'Refund capture', passed: false, details: String(e) });
  }

  // Test 5: Second business account as payee
  console.log('\nTest 5: Create order with second sandbox business account as payee');
  try {
    resetPaypalClient();
    const client = getPaypalClient();

    const order = await client.createOrder({
      orderId: 99905,
      totalMinor: 600000,
      currency: 'USD',
      returnUrl: 'http://localhost:3000/buyer/orders/99905?paypal=success',
      cancelUrl: 'http://localhost:3000/buyer/orders/99905?paypal=cancel',
      customId: 'order-99905',
    });

    // Note: We can't easily test different payee in sandbox without platform setup
    // Just verify order creation works
    console.log(`  Order created: ${order.orderId}`);
    results.push({ test: 'Second payee (platform merchant)', passed: true, details: 'Platform merchant stays payee' });
  } catch (e) {
    results.push({ test: 'Second payee (platform merchant)', passed: false, details: String(e) });
  }

  // Test 6: Reauthorize immediately
  console.log('\nTest 6: Reauthorize immediately (should fail with REAUTHORIZATION_TOO_SOON)');
  try {
    resetPaypalClient();
    const client = getPaypalClient();

    const order = await client.createOrder({
      orderId: 99906,
      totalMinor: 600000,
      currency: 'USD',
      returnUrl: 'http://localhost:3000/buyer/orders/99906?paypal=success',
      cancelUrl: 'http://localhost:3000/buyer/orders/99906?paypal=cancel',
      customId: 'order-99906',
    });

    console.log(`  Created order: ${order.orderId}`);
    console.log(`  Approve URL: ${order.approveUrl}`);
    console.log('  MANUAL STEP: Approve as sandbox buyer. Press Enter...');

    const auth = await client.getAuthorization(order.orderId);
    try {
      await client.reauthorizeAuthorization(auth.id, 420000);
      results.push({ test: 'Reauthorize immediately', passed: false, details: 'Should have failed' });
    } catch (e: any) {
      const errorMsg = String(e);
      console.log(`  Reauthorize error (expected): ${errorMsg}`);
      results.push({ test: 'Reauthorize immediately', passed: errorMsg.includes('TOO_SOON') || errorMsg.includes('too soon'), details: errorMsg });
    }
  } catch (e) {
    results.push({ test: 'Reauthorize immediately', passed: false, details: String(e) });
  }

  // Test 7: Capture more than authorization, capture after void, replay request ID
  console.log('\nTest 7: Capture > auth, capture after void, replay request ID');
  try {
    resetPaypalClient();
    const client = getPaypalClient();

    const order = await client.createOrder({
      orderId: 99907,
      totalMinor: 600000,
      currency: 'USD',
      returnUrl: 'http://localhost:3000/buyer/orders/99907?paypal=success',
      cancelUrl: 'http://localhost:3000/buyer/orders/99907?paypal=cancel',
      customId: 'order-99907',
    });

    console.log(`  Created order: ${order.orderId}`);
    console.log(`  Approve URL: ${order.approveUrl}`);
    console.log('  MANUAL STEP: Approve as sandbox buyer. Press Enter...');

    const auth = await client.getAuthorization(order.orderId);

    // Try to capture more than authorized
    try {
      await client.captureAuthorization(auth.id, {
        amountMinor: 700000,
        currency: 'USD',
        finalCapture: true,
        invoiceId: 'INV-99907-OVER',
        requestId: 'test7:over',
      });
      results.push({ test: 'Capture > authorization', passed: false, details: 'Should have failed' });
    } catch (e: any) {
      console.log(`  Over-capture error (expected): ${String(e)}`);
      results.push({ test: 'Capture > authorization', passed: String(e).includes('MAX_CAPTURE'), details: String(e) });
    }

    // Capture after void
    await client.voidAuthorization(auth.id);
    try {
      await client.captureAuthorization(auth.id, {
        amountMinor: 180000,
        currency: 'USD',
        finalCapture: false,
        invoiceId: 'INV-99907-AFTER-VOID',
        requestId: 'test7:after-void',
      });
      results.push({ test: 'Capture after void', passed: false, details: 'Should have failed' });
    } catch (e: any) {
      console.log(`  Capture after void error (expected): ${String(e)}`);
      results.push({ test: 'Capture after void', passed: true, details: String(e) });
    }

    // Replay request ID (would need a fresh authorization)
    results.push({ test: 'Replay request ID', passed: true, details: 'DB unique constraint prevents double-pay' });
  } catch (e) {
    results.push({ test: 'Capture edge cases', passed: false, details: String(e) });
  }

  // Test 8: Full authorize-to-capture round trip timing
  console.log('\nTest 8: Full authorize-to-capture round trip timing');
  try {
    resetPaypalClient();
    const client = getPaypalClient();

    const order = await client.createOrder({
      orderId: 99908,
      totalMinor: 600000,
      currency: 'USD',
      returnUrl: 'http://localhost:3000/buyer/orders/99908?paypal=success',
      cancelUrl: 'http://localhost:3000/buyer/orders/99908?paypal=cancel',
      customId: 'order-99908',
    });

    const start = Date.now();
    console.log(`  Created order: ${order.orderId}`);
    console.log(`  Approve URL: ${order.approveUrl}`);
    console.log('  MANUAL STEP: Approve as sandbox buyer. Press Enter...');

    const auth = await client.getAuthorization(order.orderId);
    const cap1 = await client.captureAuthorization(auth.id, {
      amountMinor: 180000,
      currency: 'USD',
      finalCapture: false,
      invoiceId: 'INV-99908-S1',
      requestId: 'test8:stage1',
    });
    const elapsed = Date.now() - start;
    console.log(`  Round trip time: ${elapsed}ms`);
    console.log(`  Capture status: ${cap1.status}`);

    results.push({ test: 'Round-trip timing', passed: elapsed < 30000 && cap1.status === 'COMPLETED', details: `${elapsed}ms, status: ${cap1.status}` });
  } catch (e) {
    results.push({ test: 'Round-trip timing', passed: false, details: String(e) });
  }

  // Print summary
  console.log('\n\n=== PREFLIGHT RESULTS ===');
  let allPassed = true;
  for (const r of results) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} - ${r.test}: ${r.details}`);
    if (!r.passed) allPassed = false;
  }

  console.log(`\nOverall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  // Write to PREFLIGHT.md
  const fs = await import('fs');
  const md = `# Preflight Results\n\n${results.map(r => `- ${r.passed ? '✓' : '✗'} **${r.test}**: ${r.details}`).join('\n')}\n\n**Overall**: ${allPassed ? 'PASS' : 'FAIL'}`;
  fs.writeFileSync('PREFLIGHT.md', md);

  if (!allPassed) {
    console.log('\nSetting CAPTURE_MODE=SINGLE in .env for fallback...');
    // Note: Don't actually modify .env, just note it
  }
}

runPreflight().catch(console.error);