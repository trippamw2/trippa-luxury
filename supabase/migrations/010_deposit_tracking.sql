-- Trippa Luxury Travel Platform - Deposit Tracking
-- Adds SWIFT confirmation and payment method tracking to bookings

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_method VARCHAR(50) CHECK (deposit_method IN ('swift', 'credit_card', 'bank_transfer', 'cash', 'other'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_confirmed_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS swift_confirmation_code VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS swift_confirmed_at TIMESTAMPTZ;
