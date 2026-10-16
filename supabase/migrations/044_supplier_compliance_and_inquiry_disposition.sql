-- ─── Supplier compliance ownership + enquiry disposition ─────────────────────
-- Closes two KORA audit findings on the record, not just in prose.
--
-- 1. "Suppliers are being used without complete compliance files"
--    `contract_on_file` / `insurance_on_file` already existed (migration 002)
--    but had no owner and nothing enforced them on the booking path. A named
--    owner per supplier makes the missing paperwork somebody's job; the booking
--    pipeline refuses to confirm a booking whose linked supplier lacks the
--    files (enforced in code, migration only carries the column).
--
-- 2. "Old enquiries are neither answered nor converted"
--    There was no terminal 'closed-lost' reason, and KORA's metrics reader
--    counted a closed enquiry as still open. A required reason on close turns
--    indefinite limbo into an explicit disposition.

-- ── 1. Supplier compliance ownership ────────────────────────────────────────
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS compliance_owner_id UUID REFERENCES admin_profiles(id) ON DELETE SET NULL;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS compliance_reviewed_at TIMESTAMPTZ;

COMMENT ON COLUMN suppliers.compliance_owner_id IS
  'Named owner responsible for completing this supplier''s contract/insurance file.';
COMMENT ON COLUMN suppliers.compliance_reviewed_at IS
  'When the compliance file was last reviewed. Null means never reviewed.';

-- ── 2. Enquiry close reason (the disposition for a closed-lost enquiry) ─────
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS lost_reason TEXT;

COMMENT ON COLUMN inquiries.lost_reason IS
  'Why a closed-lost enquiry was lost. Required whenever status = ''closed''.';

-- Enforce the requirement at the database boundary as well as the API, but
-- NOT VALID so the constraint governs new writes only: pre-existing closed rows
-- (recorded before this disposition existed) are left untouched rather than
-- failing the migration. The API is the primary guard; this is the backstop
-- for any future writer that bypasses it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_closed_reason_check'
  ) THEN
    ALTER TABLE inquiries
      ADD CONSTRAINT inquiries_closed_reason_check
      CHECK (status <> 'closed' OR (lost_reason IS NOT NULL AND btrim(lost_reason) <> ''))
      NOT VALID;
  END IF;
END $$;
