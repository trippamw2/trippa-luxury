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

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL:", url);
console.log("");

// Simulate login with anon client (what the browser does)
const anonClient = createClient(url, anonKey);
console.log("=== Testing login: admin@kivara.com ===");
const { data: loginData, error: loginError } = await anonClient.auth.signInWithPassword({
  email: "admin@kivara.com",
  password: "Kivara2024!",
});

if (loginError) {
  console.log("LOGIN FAILED:", loginError.message);
} else {
  console.log("LOGIN SUCCESS - User ID:", loginData.user.id);
  console.log("Email:", loginData.user.email);
  
  // Now check admin_profiles with service role (like the fixed login route does)
  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  
  const { data: profile, error: profileError } = await adminClient
    .from("admin_profiles")
    .select("id, role, permissions, is_active")
    .eq("id", loginData.user.id)
    .maybeSingle();
  
  if (profileError) {
    console.log("PROFILE LOOKUP ERROR:", profileError.message);
  } else if (!profile) {
    console.log("NO PROFILE FOUND for user ID:", loginData.user.id);
  } else {
    console.log("Profile found:");
    console.log("  Role:", profile.role);
    console.log("  Active:", profile.is_active);
    console.log("  Permissions:", JSON.stringify(profile.permissions));
    if (!profile.is_active) {
      console.log("  WARNING: Profile is NOT active - login will be blocked!");
    } else {
      console.log("  LOGIN SHOULD SUCCEED ✓");
    }
  }
}

// Also test the second admin account
console.log("");
console.log("=== Testing login: admin@kivarajourneys.com ===");
const anonClient2 = createClient(url, anonKey);
const { data: login2, error: err2 } = await anonClient2.auth.signInWithPassword({
  email: "admin@kivarajourneys.com",
  password: "Kivara2024!",
});

if (err2) {
  console.log("LOGIN FAILED:", err2.message);
  console.log("  (password for this account may be different)");
} else {
  console.log("LOGIN SUCCESS - User ID:", login2.user.id);
  
  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: prof2 } = await adminClient
    .from("admin_profiles")
    .select("id, role, is_active")
    .eq("id", login2.user.id)
    .maybeSingle();
  
  if (prof2) {
    console.log("  Profile: role=" + prof2.role + ", active=" + prof2.is_active);
    if (prof2.is_active) console.log("  LOGIN SHOULD SUCCEED ✓");
  }
}
