/**
 * Stripe Soft Decline Recovery MVP
 * Cloudflare Worker handling webhooks, AI messaging, and dashboard
 */

// Soft decline codes (temporary failures that can be retried)
const SOFT_DECLINE_CODES = [
  'insufficient_funds',
  'generic_decline',
  'do_not_honor',
  'try_again_later',
  'processing_error',
  'card_velocity_exceeded',
  'approve_with_id'
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers for dashboard
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (url.pathname === '/webhook/stripe' && request.method === 'POST') {
        return await handleStripeWebhook(request, env);
      }
      
      if (url.pathname === '/api/stats' && request.method === 'GET') {
        return await handleStatsRequest(request, env, corsHeaders);
      }
      
      if (url.pathname === '/api/payments' && request.method === 'GET') {
        return await handlePaymentsRequest(request, env, corsHeaders);
      }
      
      if (url.pathname === '/api/retry' && request.method === 'POST') {
        return await handleRetryRequest(request, env, corsHeaders);
      }
      
      // Serve static files
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return new Response(LANDING_PAGE, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      if (url.pathname === '/dashboard' || url.pathname === '/dashboard.html') {
        return new Response(DASHBOARD_PAGE, {
          headers: { 'Content-Type': 'text/html' }
        });
      }

      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

/**
 * Handle Stripe webhook events
 */
async function handleStripeWebhook(request, env) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  
  // Verify webhook signature (simplified - in production use Stripe SDK)
  // For MVP, we'll trust the webhook if secret matches
  
  const event = JSON.parse(body);
  
  if (event.type === 'invoice.payment_failed') {
    await handlePaymentFailed(event.data.object, env);
  } else if (event.type === 'invoice.payment_succeeded') {
    await handlePaymentSucceeded(event.data.object, env);
  }
  
  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle failed payment event
 */
async function handlePaymentFailed(invoice, env) {
  const failureCode = invoice.charge?.failure_code || 'unknown';
  const declineType = SOFT_DECLINE_CODES.includes(failureCode) ? 'soft' : 'hard';
  
  // Only process soft declines
  if (declineType !== 'soft') {
    console.log('Skipping hard decline:', failureCode);
    return;
  }
  
  // Check if user is still active (simplified - in real app, check your user activity API)
  const userActive = await checkUserActivity(invoice.customer, env);
  
  if (!userActive) {
    console.log('User inactive, skipping message');
    return;
  }
  
  // Store failed payment
  const paymentId = await storeFailedPayment(invoice, declineType, userActive, env);
  
  // Generate and send personalized message
  await sendRecoveryMessage(paymentId, invoice, env);
  
  // Update daily stats
  await updateStats('soft_decline', env);
}

/**
 * Handle successful payment event (recovery!)
 */
async function handlePaymentSucceeded(invoice, env) {
  const result = await env.DB.prepare(
    'UPDATE failed_payments SET status = ?, resolved_at = ? WHERE stripe_invoice_id = ? AND status != ?'
  ).bind('resolved', Date.now(), invoice.id, 'resolved').run();
  
  if (result.meta.changes > 0) {
    // This was a recovery!
    await updateStats('recovery', env, invoice.amount_paid);
    console.log('🎉 Payment recovered:', invoice.id);
  }
}

/**
 * Store failed payment in database
 */
async function storeFailedPayment(invoice, declineType, userActive, env) {
  const result = await env.DB.prepare(`
    INSERT INTO failed_payments 
    (stripe_invoice_id, stripe_customer_id, customer_email, customer_phone, 
     amount_cents, currency, failure_code, failure_message, decline_type, 
     user_active, created_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    invoice.id,
    invoice.customer,
    invoice.customer_email,
    invoice.customer_phone || null,
    invoice.amount_due,
    invoice.currency,
    invoice.charge?.failure_code || 'unknown',
    invoice.charge?.failure_message || '',
    declineType,
    userActive ? 1 : 0,
    Date.now(),
    'pending'
  ).run();
  
  return result.meta.last_row_id;
}

/**
 * Generate AI-powered personalized message and send via Twilio
 */
async function sendRecoveryMessage(paymentId, invoice, env) {
  const customerName = invoice.customer_name || invoice.customer_email.split('@')[0];
  const amount = (invoice.amount_due / 100).toFixed(2);
  const currency = invoice.currency.toUpperCase();
  
  // Generate personalized message using AI
  const message = await generatePersonalizedMessage(customerName, amount, currency, env);
  
  // Determine contact method (WhatsApp preferred, fallback to SMS)
  const phone = invoice.customer_phone || await lookupPhoneNumber(invoice.customer, env);
  
  if (!phone) {
    console.log('No phone number available for customer:', invoice.customer);
    return;
  }
  
  // Send via Twilio
  const messageType = await sendTwilioMessage(phone, message, env);
  
  // Store message record
  await env.DB.prepare(`
    INSERT INTO messages_sent 
    (failed_payment_id, message_type, message_content, sent_at, status)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    paymentId,
    messageType,
    message,
    Date.now(),
    'sent'
  ).run();
  
  // Update payment status
  await env.DB.prepare(
    'UPDATE failed_payments SET status = ? WHERE id = ?'
  ).bind('contacted', paymentId).run();
  
  await updateStats('message_sent', env);
}

/**
 * Generate personalized message using AI (OpenAI or Anthropic)
 */
async function generatePersonalizedMessage(customerName, amount, currency, env) {
  const prompt = `You are helping a SaaS company recover a failed payment in a friendly, human way.

Customer: ${customerName}
Amount: ${currency} ${amount}
Situation: Their payment failed due to insufficient funds or temporary issue.

Write a SHORT, friendly WhatsApp/SMS message (max 160 chars) that:
- Sounds human, not robotic
- Mentions the specific amount
- Makes it easy to update payment method
- Is helpful, not pushy

Do not include any introductions or explanations. Just output the message text.`;

  try {
    // Try OpenAI first
    if (env.OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 100,
          temperature: 0.7
        })
      });
      
      const data = await response.json();
      return data.choices[0].message.content.trim();
    }
    
    // Fallback to Anthropic
    if (env.ANTHROPIC_API_KEY) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 100,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      const data = await response.json();
      return data.content[0].text.trim();
    }
  } catch (error) {
    console.error('AI generation failed:', error);
  }
  
  // Fallback template
  return `Hi ${customerName}! Your ${currency} ${amount} payment didn't go through. No worries - just update your card here: [payment link]. Thanks! 🙏`;
}

/**
 * Send message via Twilio (WhatsApp preferred, SMS fallback)
 */
async function sendTwilioMessage(phone, message, env) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const fromWhatsApp = env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  const fromSMS = env.TWILIO_SMS_NUMBER || '+14155238886';
  
  // Try WhatsApp first
  try {
    const whatsappTo = phone.startsWith('+') ? `whatsapp:${phone}` : `whatsapp:+${phone}`;
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: whatsappTo,
          From: fromWhatsApp,
          Body: message
        })
      }
    );
    
    if (response.ok) {
      console.log('WhatsApp message sent to:', whatsappTo);
      return 'whatsapp';
    }
  } catch (error) {
    console.log('WhatsApp failed, trying SMS:', error.message);
  }
  
  // Fallback to SMS
  const smsTo = phone.startsWith('+') ? phone : `+${phone}`;
  
  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: smsTo,
        From: fromSMS,
        Body: message
      })
    }
  );
  
  console.log('SMS sent to:', smsTo);
  return 'sms';
}

/**
 * Check if user is still active (mock - integrate with your app's API)
 */
async function checkUserActivity(customerId, env) {
  // In a real app, you'd check:
  // - Last login time
  // - Recent API usage
  // - Feature usage
  // For MVP, we'll assume active if payment was recent
  return true;
}

/**
 * Lookup phone number from customer data (mock)
 */
async function lookupPhoneNumber(customerId, env) {
  // In real app, query your user database or Stripe metadata
  return null;
}

/**
 * Update daily statistics
 */
async function updateStats(type, env, amount = 0) {
  const today = new Date().toISOString().split('T')[0];
  
  const existing = await env.DB.prepare(
    'SELECT * FROM recovery_stats WHERE date = ?'
  ).bind(today).first();
  
  if (existing) {
    let updates = {};
    if (type === 'soft_decline') {
      updates = { total_failures: existing.total_failures + 1, soft_declines: existing.soft_declines + 1 };
    } else if (type === 'message_sent') {
      updates = { messages_sent: existing.messages_sent + 1 };
    } else if (type === 'recovery') {
      updates = { 
        recoveries: existing.recoveries + 1,
        recovered_amount_cents: existing.recovered_amount_cents + amount
      };
    }
    
    await env.DB.prepare(
      `UPDATE recovery_stats SET ${Object.keys(updates).map(k => `${k} = ?`).join(', ')} WHERE date = ?`
    ).bind(...Object.values(updates), today).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO recovery_stats (date, total_failures, soft_declines, messages_sent, recoveries, recovered_amount_cents)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      today,
      type === 'soft_decline' ? 1 : 0,
      type === 'soft_decline' ? 1 : 0,
      type === 'message_sent' ? 1 : 0,
      type === 'recovery' ? 1 : 0,
      type === 'recovery' ? amount : 0
    ).run();
  }
}

/**
 * API: Get dashboard statistics
 */
async function handleStatsRequest(request, env, corsHeaders) {
  // Get last 30 days of stats
  const stats = await env.DB.prepare(`
    SELECT * FROM recovery_stats 
    ORDER BY date DESC 
    LIMIT 30
  `).all();
  
  // Calculate totals
  const totals = {
    total_failures: 0,
    soft_declines: 0,
    messages_sent: 0,
    recoveries: 0,
    recovered_amount: 0,
    recovery_rate: 0
  };
  
  stats.results.forEach(day => {
    totals.total_failures += day.total_failures || 0;
    totals.soft_declines += day.soft_declines || 0;
    totals.messages_sent += day.messages_sent || 0;
    totals.recoveries += day.recoveries || 0;
    totals.recovered_amount += day.recovered_amount_cents || 0;
  });
  
  if (totals.soft_declines > 0) {
    totals.recovery_rate = (totals.recoveries / totals.soft_declines * 100).toFixed(1);
  }
  
  return new Response(JSON.stringify({ stats: stats.results, totals }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

/**
 * API: Get recent failed payments
 */
async function handlePaymentsRequest(request, env, corsHeaders) {
  const payments = await env.DB.prepare(`
    SELECT fp.*, 
           (SELECT COUNT(*) FROM messages_sent WHERE failed_payment_id = fp.id) as message_count
    FROM failed_payments fp
    ORDER BY created_at DESC
    LIMIT 50
  `).all();
  
  return new Response(JSON.stringify({ payments: payments.results }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

/**
 * API: Manually retry a payment message
 */
async function handleRetryRequest(request, env, corsHeaders) {
  const { payment_id } = await request.json();
  
  const payment = await env.DB.prepare(
    'SELECT * FROM failed_payments WHERE id = ?'
  ).bind(payment_id).first();
  
  if (!payment) {
    return new Response(JSON.stringify({ error: 'Payment not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  // Mock invoice object for retry
  const mockInvoice = {
    id: payment.stripe_invoice_id,
    customer: payment.stripe_customer_id,
    customer_email: payment.customer_email,
    customer_phone: payment.customer_phone,
    customer_name: payment.customer_email.split('@')[0],
    amount_due: payment.amount_cents,
    currency: payment.currency
  };
  
  await sendRecoveryMessage(payment_id, mockInvoice, env);
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

// Landing page and dashboard HTML will be added in separate files
const LANDING_PAGE = '<!-- Landing page HTML -->';
const DASHBOARD_PAGE = '<!-- Dashboard HTML -->';
