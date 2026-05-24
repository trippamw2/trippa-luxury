// Apply migration 010 via Supabase Management API
// Usage: node scripts/apply-migration-010.mjs

const SUPABASE_PROJECT_REF = "lgpdnmtauvkpkgmyyjcr";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_ACCESS_TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN env var");
  process.exit(1);
}

const sql = `
-- Trippa Luxury Travel Platform - Deposit Tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_method VARCHAR(50) CHECK (deposit_method IN ('swift', 'credit_card', 'bank_transfer', 'cash', 'other'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_confirmed_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS swift_confirmation_code VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS swift_confirmed_at TIMESTAMPTZ;
`;

async function applyMigration() {
  console.log("Applying migration 010 (deposit tracking)...");
  
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`Migration failed (${response.status}):`, text);
    process.exit(1);
  }

  console.log("Migration 010 applied successfully!");
}

applyMigration().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
