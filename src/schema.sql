-- Stripe Recovery MVP Database Schema

CREATE TABLE IF NOT EXISTS failed_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  failure_code TEXT,
  failure_message TEXT,
  decline_type TEXT, -- 'soft' or 'hard'
  user_active BOOLEAN DEFAULT 1, -- Whether user is still active in app
  created_at INTEGER NOT NULL, -- Unix timestamp
  resolved_at INTEGER, -- Unix timestamp when payment succeeded
  status TEXT DEFAULT 'pending' -- 'pending', 'contacted', 'resolved', 'churned'
);

CREATE TABLE IF NOT EXISTS messages_sent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  failed_payment_id INTEGER NOT NULL,
  message_type TEXT NOT NULL, -- 'whatsapp' or 'sms'
  message_content TEXT NOT NULL,
  twilio_sid TEXT,
  sent_at INTEGER NOT NULL,
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'failed'
  FOREIGN KEY (failed_payment_id) REFERENCES failed_payments(id)
);

CREATE TABLE IF NOT EXISTS recovery_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL, -- YYYY-MM-DD
  total_failures INTEGER DEFAULT 0,
  soft_declines INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  recoveries INTEGER DEFAULT 0,
  recovered_amount_cents INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_customer_email ON failed_payments(customer_email);
CREATE INDEX IF NOT EXISTS idx_status ON failed_payments(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON failed_payments(created_at);
