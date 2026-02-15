#!/bin/bash
set -e

echo "🚀 Stripe Recovery MVP - Quick Setup"
echo "===================================="
echo ""

# Check for wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler not found. Installing..."
    npm install -g wrangler
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Login to Cloudflare
echo ""
echo "🔐 Logging in to Cloudflare..."
wrangler login

# Create D1 database
echo ""
echo "💾 Creating D1 database..."
DB_OUTPUT=$(wrangler d1 create stripe_recovery 2>&1)
DB_ID=$(echo "$DB_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$DB_ID" ]; then
    echo "⚠️  Database might already exist. Check wrangler.toml"
else
    echo "✅ Database created: $DB_ID"
    echo ""
    echo "Update wrangler.toml:"
    echo "  database_id = \"$DB_ID\""
fi

# Create KV namespace
echo ""
echo "🗄️  Creating KV namespace..."
KV_OUTPUT=$(wrangler kv:namespace create "KV" 2>&1)
KV_ID=$(echo "$KV_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$KV_ID" ]; then
    echo "⚠️  KV namespace might already exist. Check wrangler.toml"
else
    echo "✅ KV namespace created: $KV_ID"
    echo ""
    echo "Update wrangler.toml:"
    echo "  id = \"$KV_ID\""
fi

echo ""
echo "📝 Next steps:"
echo "1. Update wrangler.toml with database_id and KV id (see above)"
echo "2. Initialize database:"
echo "   wrangler d1 execute stripe_recovery --file=./src/schema.sql"
echo "3. Set secrets:"
echo "   wrangler secret put STRIPE_WEBHOOK_SECRET"
echo "   wrangler secret put TWILIO_ACCOUNT_SID"
echo "   wrangler secret put TWILIO_AUTH_TOKEN"
echo "   wrangler secret put TWILIO_WHATSAPP_NUMBER"
echo "   wrangler secret put OPENAI_API_KEY"
echo "4. Deploy:"
echo "   npm run deploy"
echo ""
echo "✅ Setup complete!"
