# 🚀 Deployment Guide

Complete step-by-step guide to deploy Stripe Recovery MVP.

## Method 1: Cloudflare Workers (Recommended - Free)

### Prerequisites
- Cloudflare account (free tier includes 100K requests/day)
- Stripe account
- Twilio account
- OpenAI or Anthropic API key

### Step 1: Clone & Setup

```bash
git clone https://github.com/ezra-anchovy/stripe-recovery-mvp.git
cd stripe-recovery-mvp
npm install
```

### Step 2: Automated Setup

```bash
./setup.sh
```

This script will:
- Install Wrangler CLI
- Login to Cloudflare
- Create D1 database
- Create KV namespace
- Show you the IDs to update in `wrangler.toml`

### Step 3: Update wrangler.toml

Replace the placeholder IDs with your actual IDs:

```toml
[[d1_databases]]
binding = "DB"
database_name = "stripe_recovery"
database_id = "your-database-id-here"  # From setup.sh output

[[kv_namespaces]]
binding = "KV"
id = "your-kv-id-here"  # From setup.sh output
```

### Step 4: Initialize Database

```bash
wrangler d1 execute stripe_recovery --file=./src/schema.sql
```

Verify:
```bash
wrangler d1 execute stripe_recovery --command="SELECT name FROM sqlite_master WHERE type='table';"
```

Should show: `failed_payments`, `messages_sent`, `recovery_stats`

### Step 5: Configure Secrets

```bash
# Stripe webhook secret (from Stripe Dashboard → Webhooks)
wrangler secret put STRIPE_WEBHOOK_SECRET

# Twilio credentials
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_WHATSAPP_NUMBER  # e.g., whatsapp:+14155238886

# AI provider (choose one)
wrangler secret put OPENAI_API_KEY
# OR
wrangler secret put ANTHROPIC_API_KEY
```

### Step 6: Deploy

```bash
npm run deploy
```

You'll get a URL like: `https://stripe-recovery-mvp.<your-subdomain>.workers.dev`

### Step 7: Configure Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. URL: `https://your-worker.workers.dev/webhook/stripe`
4. Events to send: `invoice.payment_failed`, `invoice.payment_succeeded`
5. Copy the signing secret
6. Update worker secret: `wrangler secret put STRIPE_WEBHOOK_SECRET`

### Step 8: Test

```bash
# Send test webhook
stripe trigger invoice.payment_failed

# Check dashboard
open https://your-worker.workers.dev/dashboard
```

## Method 2: Railway (One-Click Deploy)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/ezra-anchovy/stripe-recovery-mvp)

1. Click the button above
2. Connect your GitHub account
3. Set environment variables:
   - `STRIPE_WEBHOOK_SECRET`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_NUMBER`
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
4. Deploy!
5. Get your Railway URL (e.g., `https://stripe-recovery-production.up.railway.app`)
6. Configure Stripe webhook (see Step 7 above)

**Note:** Railway has a free tier but may require a credit card for verification.

## Method 3: Self-Hosted (Node.js)

### Convert Worker to Express

```bash
npm install express body-parser better-sqlite3
```

Create `server.js`:

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');

const app = express();
const db = new Database('stripe_recovery.db');

// Initialize database
const schema = require('fs').readFileSync('./src/schema.sql', 'utf8');
db.exec(schema);

app.use(bodyParser.json());

// Port worker code here (adapt fetch handlers to Express routes)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Run:
```bash
node server.js
```

Deploy to any Node.js host (Heroku, DigitalOcean, AWS, etc.)

## Troubleshooting

### Database Not Created

```bash
# List D1 databases
wrangler d1 list

# Create manually
wrangler d1 create stripe_recovery

# Initialize
wrangler d1 execute stripe_recovery --file=./src/schema.sql
```

### Secrets Not Working

```bash
# List secrets
wrangler secret list

# Delete and recreate
wrangler secret delete SECRET_NAME
wrangler secret put SECRET_NAME
```

### Webhook Not Receiving Events

1. Check Stripe webhook dashboard for delivery attempts
2. Check worker logs: `wrangler tail`
3. Verify webhook URL is correct
4. Test with Stripe CLI:
   ```bash
   stripe listen --forward-to https://your-worker.workers.dev/webhook/stripe
   stripe trigger invoice.payment_failed
   ```

### AI Messages Not Generating

1. Verify API key is set: `wrangler secret list`
2. Check worker logs for errors
3. Test with manual retry from dashboard
4. Verify you have either `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` set

### Twilio Not Sending Messages

1. Verify Twilio credentials
2. Check Twilio console for error logs
3. Ensure phone number format is correct:
   - WhatsApp: `whatsapp:+14155238886`
   - SMS: `+14155238886`
4. Verify Twilio account has credits

## Cost Estimates

### Cloudflare Workers (Free Tier)
- **Free:** 100,000 requests/day
- **Paid:** $5/mo for 10M requests

### Cloudflare D1 (Free Tier)
- **Free:** 5GB storage, 5M reads/day, 100K writes/day
- **Paid:** $5/mo for 50M reads

### Twilio
- **WhatsApp:** $0.005/message
- **SMS:** $0.0075/message (US)
- Example: 100 messages/day = ~$15/mo

### AI (OpenAI)
- **GPT-4o-mini:** $0.15/1M input tokens, $0.60/1M output
- Example: 100 messages/day = ~$0.50/mo

**Total estimate for 100 messages/day:**
- Cloudflare: Free (under limits)
- Twilio: $15/mo
- OpenAI: $0.50/mo
- **Total: ~$15-20/mo**

## Production Checklist

- [ ] Set all required secrets
- [ ] Initialize database with schema
- [ ] Configure Stripe webhook
- [ ] Test with `stripe trigger`
- [ ] Verify messages send to Twilio
- [ ] Check dashboard shows data
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Configure custom domain (optional)
- [ ] Enable rate limiting (if needed)
- [ ] Set up backup/export of D1 data

## Monitoring

### View Logs
```bash
wrangler tail
```

### Check Database
```bash
wrangler d1 execute stripe_recovery --command="SELECT COUNT(*) FROM failed_payments;"
```

### Export Data
```bash
wrangler d1 export stripe_recovery --output=backup.sql
```

## Scaling

### When to Upgrade

If you exceed free tier limits:
- 100K requests/day → Upgrade to Workers Paid ($5/mo)
- 5M reads/day → Upgrade to D1 Paid ($5/mo)

### High Volume Setup

For enterprise scale (1000+ messages/day):
1. Use Cloudflare Workers Paid plan
2. Add Redis cache for user activity checks
3. Implement message queuing with Cloudflare Queues
4. Set up monitoring with Datadog/New Relic
5. Add multi-region redundancy

## Support

- **Issues:** [GitHub Issues](https://github.com/ezra-anchovy/stripe-recovery-mvp/issues)
- **Email:** ezra@anchovylabs.ai
- **Docs:** README.md, this file

## Next Steps

After deployment:
1. Monitor dashboard for first week
2. Adjust AI message prompts based on feedback
3. Track recovery rate vs baseline
4. Calculate ROI
5. Share results!

---

**Happy deploying! 🚀**
