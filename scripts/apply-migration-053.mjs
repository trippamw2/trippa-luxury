// Apply a SQL migration via the Supabase Management API.
// Usage: $env:SUPABASE_ACCESS_TOKEN = Get-Content $HOME\.supabase\access-token; node scripts/apply-migration-053.mjs

import { readFile } from "node:fs/promises";

const SUPABASE_PROJECT_REF = "lgpdnmtauvkpkgmyyjcr";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_ACCESS_TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN env var");
  process.exit(1);
}

const sql = await readFile(
  new URL("../supabase/migrations/053_lifecycle_and_partnerships.sql", import.meta.url),
  "utf8"
);

async function query(statement) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: statement }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Migration failed (${response.status}): ${text}`);
  }
  return response.json();
}

console.log("Applying migration 053 (lifecycle and partnerships)...");
await query(sql);

// Record it so the migration history matches the files in the repo.
await query(`
  INSERT INTO supabase_migrations.schema_migrations (version, name)
  VALUES ('053', 'lifecycle_and_partnerships')
  ON CONFLICT (version) DO NOTHING;
`);

console.log("Migration 053 applied and recorded.");
