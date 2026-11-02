-- 051: Normalize booking status slugs to underscore form.
UPDATE bookings SET status = 'deposit_paid' WHERE status = 'deposit-paid';
UPDATE bookings SET status = 'balance_due' WHERE status = 'balance-due';
UPDATE bookings SET status = 'in_progress' WHERE status = 'in-progress';

-- Prevent future mixed forms at the DB level.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_slug_check'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_status_slug_check
      CHECK (status IN ('provisional','deposit_paid','confirmed','balance_due','paid','in_progress','completed','cancelled','refunded'));
  END IF;
END;
$$;