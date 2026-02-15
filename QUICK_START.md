# ⚡ Quick Start - Stripe Recovery MVP

**Get up and running in 5 minutes.**

---

## 📦 Clone & Install

```bash
git clone https://github.com/ezra-anchovy/stripe-recovery-mvp.git
cd stripe-recovery-mvp
npm install
```

---

## 🚀 Option 1: Deploy to Cloudflare (Recommended)

```bash
# One-click setup
./setup.sh

# Follow prompts to:
# 1. Login to Cloudflare
# 2. Create D1 database
# 3. Create KV namespace

# Update wrangler.toml with the IDs shown

# Initialize database
npx wrangler d1 execute stripe_recovery --file=./src/schema.sql

# Set secrets
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
npx wrangler secret put TWILIO_WHATSAPP_NUMBER
npx wrangler secret put OPENAI_API_KEY

# Deploy!
npm run deploy
```

**Your URL:** `https://stripe-recovery-mvp.<subdomain>.workers.dev`

---

## 🧪 Option 2: Test Locally First

```bash
# Start dev server
npm run dev

# In another terminal, send test webhook
npm test

# Open dashboard
open http://localhost:8787/dashboard

# Open landing page
open http://localhost:8787/
```

---

## 🔗 Configure Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. URL: `https://your-worker.workers.dev/webhook/stripe`
4. Events: `invoice.payment_failed`, `invoice.payment_succeeded`
5. Copy signing secret → `wrangler secret put STRIPE_WEBHOOK_SECRET`

---

## ✅ Test It

```bash
# Send test event
stripe trigger invoice.payment_failed

# Check dashboard
open https://your-worker.workers.dev/dashboard

# Should see:
# - New failed payment
# - AI message generated
# - Twilio API called
# - Stats updated
```

---

## 📊 What You Get

**Endpoints:**
- `/` → Landing page with ROI calculator
- `/dashboard` → Real-time analytics
- `/webhook/stripe` → Stripe webhook handler
- `/api/stats` → JSON stats
- `/api/payments` → JSON payments list

**Features:**
- ✅ Soft decline detection (7 failure codes)
- ✅ AI-powered personalized messages
- ✅ WhatsApp + SMS (automatic fallback)
- ✅ Real-time dashboard
- ✅ Recovery tracking
- ✅ Manual retry

---

## 💰 Pricing Calculator

**Example SaaS ($10K MRR):**
```
Lost to failed payments: $2,500/mo (25% fail rate)
Recovered with AI messages: $1,000/mo (40% recovery)
Cost: $19 + ($1,000 × 0.05) = $69
Net gain: $931/mo
Annual: $11,172
```

**Try it:** Open `/` and use the interactive calculator

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| **README.md** | Complete documentation |
| **DEPLOY.md** | Step-by-step deployment guide |
| **TEST_REPORT.md** | Test results (17/18 passing) |
| **DEMO.md** | Demo script & talking points |
| **DELIVERABLES.md** | Full project summary |
| **MISSION_COMPLETE.md** | Final mission report |

---

## 🆘 Troubleshooting

**"Database not found"**
```bash
wrangler d1 create stripe_recovery
# Update database_id in wrangler.toml
wrangler d1 execute stripe_recovery --file=./src/schema.sql
```

**"Webhook not receiving events"**
```bash
# Check Stripe dashboard for delivery attempts
# Test locally:
stripe listen --forward-to http://localhost:8787/webhook/stripe
```

**"AI messages not generating"**
```bash
# Verify secret is set
wrangler secret list
# If missing:
wrangler secret put OPENAI_API_KEY
```

**"Twilio not sending"**
```bash
# Check Twilio console for errors
# Verify phone format:
# WhatsApp: whatsapp:+14155238886
# SMS: +14155238886
```

---

## 📈 Next Steps

1. ✅ Deploy MVP
2. ✅ Configure Stripe webhook
3. ✅ Test with dummy events
4. ✅ Monitor dashboard
5. ✅ Adjust AI prompts (optional)
6. ✅ Calculate actual ROI
7. ✅ Share results!

---

## 🔗 Links

**GitHub:** https://github.com/ezra-anchovy/stripe-recovery-mvp  
**Issues:** https://github.com/ezra-anchovy/stripe-recovery-mvp/issues  
**Email:** ezra@anchovylabs.ai

---

**Built by Anchovy Labs** 🐟  
**License:** MIT  
**Ship fast, iterate later.** ✨
