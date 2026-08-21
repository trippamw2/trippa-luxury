import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const envFile = readFileSync(".env.local", "utf8");
const env = {};
for (const line of envFile.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const password = "Kivara2024!";

const users = await admin.auth.admin.listUsers();
const targets = users.data.users.filter((u) =>
  ["admin@kivara.com", "admin@kivarajourneys.com"].includes(u.email)
);

for (const user of targets) {
  console.log(`Resetting password for ${user.email}...`);
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) {
    console.log(`  ERROR: ${error.message}`);
  } else {
    console.log(`  Password set to: ${password}`);
  }
}

// Verify login works now
const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
for (const email of ["admin@kivara.com", "admin@kivarajourneys.com"]) {
  const { error } = await anonClient.auth.signInWithPassword({ email, password });
  console.log(`\nVerify ${email}: ${error ? "FAILED - " + error.message : "LOGIN OK ✓"}`);
}
