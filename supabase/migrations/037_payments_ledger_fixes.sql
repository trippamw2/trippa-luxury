-- Kivara Luxury Travel Platform - Ledger fixes
--
-- Two root causes found tracing the money path:
--
-- 1. confirm-payment writes transactions with payment_method = 'wire_transfer',
--    but transactions.payment_method references payment_methods(slug), and no
--    such slug existed. The FK rejected the row and the route went on without
--    checking. Insert the slug so the ledger write can succeed.
--
-- 2. The payments table (018) was write-orphaned: no route wrote to it, so the
--    AI finance modules read an empty table. The execute route and the webhook
--    now both write a row per PayPal capture, so captures must be idempotent.
--    A unique (partial) index on paypal_transaction_id lets the second writer
--    of the same capture be rejected instead of double-counted. NULLs (wire
--    and card rows carry no capture id) remain allowed.

-- 1. wire_transfer payment method, the FK target for confirm-payment.
INSERT INTO payment_methods (slug, name)
VALUES ('wire_transfer', 'Wire Transfer')
ON CONFLICT (slug) DO NOTHING;

-- 2. At most one ledger row per PayPal capture.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_paypal_transaction_id_unique
  ON payments(paypal_transaction_id)
  WHERE paypal_transaction_id IS NOT NULL;