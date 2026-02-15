# 🎬 Demo Guide - Stripe Recovery MVP

## Quick Demo (5 Minutes)

### 1. Landing Page Preview

**URL:** `https://your-worker.workers.dev/`

**Key Features to Show:**
- Hero section with clear value prop
- Stats showing the problem (20-40% loss, $2K+/mo)
- Interactive ROI calculator
- Feature grid (6 key differentiators)
- Simple pricing ($19/mo + 5% recovered)

**Demo Script:**
```
"Look at this - most SaaS companies are losing 20-40% of conversions to soft declines.

Standard Stripe dunning emails? Ignored. Spam folder.

This tool:
1. Detects ONLY soft declines (recoverable)
2. Generates AI messages that sound human
3. Sends via WhatsApp/SMS (98% open rate vs 20% email)
4. Only messages active users

Let me show you the ROI calculator..."

[Enter demo numbers]
Revenue: $10,000/mo
Fail Rate: 25%
Recovery Rate: 40%

"See? You're losing $2,500/mo, but we can recover $1,000.
Cost is only $69 (base + performance fee).
Net gain: $931/mo. Almost $12K/year."
```

### 2. Dashboard Preview

**URL:** `https://your-worker.workers.dev/dashboard`

**Key Metrics:**
- Soft Declines count
- Messages Sent
- Recoveries (with % rate)
- Recovered Revenue

**Table Columns:**
- Date/Time
- Customer email + Stripe ID
- Amount + Currency
- Failure Reason
- Status badge (pending, contacted, resolved, churned)
- Message count
- Manual retry button

**Demo Script:**
```
"Here's the dashboard. Real-time monitoring.

You can see:
- Every soft decline as it happens
- AI-generated messages sent
- Recovery rate (this example: 42%)
- Total revenue recovered

See this customer? Payment failed yesterday.
System detected it's a soft decline (insufficient funds).
User is still active in the app.
AI generated a personalized message.
Sent via WhatsApp.
Today? Payment went through. Recovered."
```

### 3. Test Webhook Flow

**Live Demo:**

```bash
# Terminal 1: Start worker
npm run dev

# Terminal 2: Send test webhook
npm test
```

**What Happens (show in real-time):**

1. **Webhook received** ✅
   ```
   📥 Webhook: invoice.payment_failed
   Customer: test@example.com
   Amount: $49.99
   Failure: insufficient_funds
   ```

2. **Soft decline detected** ✅
   ```
   ✅ Soft decline: insufficient_funds
   🔍 Checking user activity...
   ✅ User active
   ```

3. **AI message generated** ✅
   ```
   🤖 Generating personalized message...
   ✅ "Hi Test! Your $49.99 payment didn't go through..."
   ```

4. **Twilio sends** ✅
   ```
   📱 Trying WhatsApp...
   ✅ WhatsApp message sent: SM123456
   ```

5. **Database updated** ✅
   ```
   💾 Stored in database (ID: 1)
   📊 Stats updated
   ```

6. **Dashboard refreshes** ✅
   ```
   Dashboard shows new payment
   Status: contacted
   Messages: 1
   ```

### 4. Recovery Simulation

**Show the full cycle:**

```bash
# Step 1: Payment fails (soft decline)
stripe trigger invoice.payment_failed

# Check dashboard - see new "pending" payment

# Step 2: AI message sent automatically

# Step 3: Payment succeeds (recovery!)
stripe trigger invoice.payment_succeeded --override invoice:id=in_test_123

# Dashboard updates:
# - Status: resolved ✅
# - Recovery count: +1
# - Recovered revenue: +$49.99
# - Recovery rate updates
```

## Screenshots Guide

### 1. Landing Page

**Top Section:**
- Gradient hero (purple/blue)
- "Stop losing 20-40% of your revenue to soft declines"
- CTA button: "Calculate Your Savings"

**Stats Section:**
- 3 cards: "20-40%", "$2K+", "84%"
- Visual impact

**Features Grid:**
- 6 cards with emojis
- Clean, scannable

**ROI Calculator:**
- Dark purple background
- Interactive sliders
- Real-time calculations
- Big number: "Net Monthly Gain"

### 2. Dashboard

**Stats Cards (Top):**
- 4 cards in a row
- Colored left border
- Big numbers
- Subtle shadows

**Payments Table:**
- Clean design
- Status badges with colors
- Hover effect on rows
- Action buttons

### 3. Code Quality

**Show:**
- Clean file structure
- Commented code
- Type safety (where possible)
- Error handling

```javascript
// Example: Smart soft decline detection
const SOFT_DECLINE_CODES = [
  'insufficient_funds',    // User needs to add funds
  'generic_decline',       // Bank declined, retry later
  'try_again_later',       // Temporary issue
  // ... more codes
];

if (!SOFT_DECLINE_CODES.includes(failureCode)) {
  console.log('Hard decline, skipping');
  return; // Don't message - can't recover
}
```

## Demo Talking Points

### Problem
- "20-40% of trial-to-paid conversions fail"
- "Not because they don't want your product"
- "Because their card has insufficient funds, or bank declined temporarily"
- "Standard Stripe dunning? 84% ignore it. Email fatigue."

### Solution
- "WhatsApp/SMS instead of email (98% open rate)"
- "AI-powered personalization - not robotic templates"
- "Smart detection - only soft declines"
- "Activity check - only message active users"

### Differentiation
- "Other tools email-only, treat all declines the same"
- "We focus on the recoverable ones"
- "We reach them where they actually check messages"
- "We sound human, not like a bot"

### ROI
- "Performance-based pricing"
- "Only pay extra when we recover money for you"
- "$19 base, 5% of recovered revenue"
- "If we recover $0, you pay $19"
- "Average customer recovers $1,000/mo, pays $69, nets $931"

### Technical
- "Cloudflare Workers - edge network, zero cold starts"
- "D1 database - fast, free tier is generous"
- "OpenAI or Anthropic for messages"
- "Twilio for delivery"
- "Built in a day, ready for production"

## Live Demo Checklist

Before demo:
- [ ] Worker deployed
- [ ] Dashboard accessible
- [ ] Webhook URL configured in Stripe test mode
- [ ] Twilio sandbox configured
- [ ] Test data in database (optional)
- [ ] Stripe CLI installed
- [ ] Terminal ready for live webhook test

During demo:
- [ ] Show landing page first (hook with ROI)
- [ ] Walk through features
- [ ] Open dashboard
- [ ] Trigger test webhook LIVE
- [ ] Show real-time processing
- [ ] Refresh dashboard to show new data
- [ ] Simulate recovery
- [ ] Show final stats

After demo:
- [ ] Share GitHub link
- [ ] Share live deployment URL
- [ ] Offer to deploy for them
- [ ] Collect feedback
- [ ] Schedule follow-up

## Common Questions & Answers

**Q: How do you get phone numbers?**  
A: From Stripe customer metadata, or integrate with your user database API. We show both methods in the docs.

**Q: What if user doesn't have WhatsApp?**  
A: Automatically falls back to SMS. Best of both worlds.

**Q: Won't this annoy customers?**  
A: No! We only message active users (still using your app), and only for soft declines (recoverable). Plus messages are friendly, not pushy.

**Q: What about GDPR/privacy?**  
A: You own all data. Runs on your Cloudflare account. Twilio is GDPR compliant. Messages sent on your behalf.

**Q: Can I customize messages?**  
A: Yes! Edit the AI prompt in `src/index.js`. Match your brand voice.

**Q: How much does it cost to run?**  
A: Cloudflare free tier covers most small SaaS. Twilio ~$0.005/message. AI ~$0.005/message. Total: ~$15-20/mo for 100 messages/day.

**Q: What's the setup time?**  
A: 5-10 minutes. Run setup script, configure secrets, add webhook to Stripe. Done.

**Q: Does it work with Stripe test mode?**  
A: Yes! Perfect for testing before going live.

**Q: Can I use it with other payment processors?**  
A: Currently Stripe-only, but architecture is modular. Easy to add PayPal, etc.

**Q: What about email integration?**  
A: Intentionally WhatsApp/SMS only. Email is saturated. If you want email, Stripe dunning already does that.

---

**Demo Length:** 5 minutes (quick) to 15 minutes (detailed)  
**Best For:** SaaS founders, product teams, payment ops  
**Wow Factor:** Live webhook → AI message → Twilio send in < 5 seconds

🚀 **Ready to demo!**
