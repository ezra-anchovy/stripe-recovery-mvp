#!/usr/bin/env node
/**
 * Test webhook script - sends a dummy Stripe webhook event
 */

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';

const testEvent = {
  type: 'invoice.payment_failed',
  data: {
    object: {
      id: 'in_test_' + Date.now(),
      customer: 'cus_test_123',
      customer_email: 'test@example.com',
      customer_phone: '+15551234567',
      customer_name: 'Test Customer',
      amount_due: 4999, // $49.99
      amount_paid: 0,
      currency: 'usd',
      status: 'open',
      charge: {
        failure_code: 'insufficient_funds',
        failure_message: 'Your card has insufficient funds.'
      }
    }
  }
};

async function sendWebhook() {
  console.log('📤 Sending test webhook to:', WORKER_URL);
  console.log('Event type:', testEvent.type);
  console.log('Customer:', testEvent.data.object.customer_email);
  console.log('Amount:', testEvent.data.object.amount_due / 100, testEvent.data.object.currency.toUpperCase());
  console.log('Failure:', testEvent.data.object.charge.failure_code);
  console.log('');

  try {
    const response = await fetch(`${WORKER_URL}/webhook/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify(testEvent)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Webhook sent successfully!');
      console.log('Response:', result);
    } else {
      console.log('❌ Webhook failed');
      console.log('Status:', response.status);
      console.log('Response:', result);
    }
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
    console.log('');
    console.log('Make sure the worker is running:');
    console.log('  npm run dev');
  }
}

sendWebhook();
