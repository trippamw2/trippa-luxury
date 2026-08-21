import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Parse .env.local manually
const envFile = readFileSync(".env.local", "utf8");
const env = {};
for (const line of envFile.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase URL or service role key in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = "admin@kivara.com";
const password = "Kivara2024!";

console.log(`Creating admin user: ${email}`);

// 1. Create auth user
const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  // If user already exists, fetch them
  if (error.message.includes("already") || error.message.includes("registered")) {
    console.log("User already exists, looking up...");
    const { data: users } = await admin.auth.admin.listUsers();
    const existing = users?.users?.find((u) => u.email === email);
    if (existing) {
      console.log(`User ID: ${existing.id}`);
      // Ensure admin profile exists
      const { error: profErr } = await admin
        .from("admin_profiles")
        .upsert(
          { id: existing.id, role: "owner", is_active: true, permissions: {} },
          { onConflict: "id" }
        );
      if (profErr) {
        console.error("Profile upsert error:", profErr.message);
      } else {
        console.log("Admin profile ensured.");
      }
      console.log(`\nLogin credentials:\n  Email:    ${email}\n  Password: ${password}`);
      process.exit(0);
    }
    console.error("User exists but could not be found in listing.");
    process.exit(1);
  }
  console.error("Error creating user:", error.message);
  process.exit(1);
}

console.log(`User created: ${data.user.id}`);

// 2. Create admin profile
const { error: profileError } = await admin.from("admin_profiles").insert({
  id: data.user.id,
  role: "owner",
  is_active: true,
  permissions: {},
});

if (profileError) {
  console.error("Profile error:", profileError.message);
  process.exit(1);
}

console.log("Admin profile created.");

console.log(`\n========================================`);
console.log(`  LOGIN CREDENTIALS`);
console.log(`========================================`);
console.log(`  Email:    ${email}`);
console.log(`  Password: ${password}`);
console.log(`========================================`);
