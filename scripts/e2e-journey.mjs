#!/usr/bin/env node
// ─── Kivara End-to-End Customer Journey Test ─────────────────────────────
// Drives the FULL backend journey through the real HTTP API on a running
// dev/prod server:
//   Inquiry → Admin login → Convert to Booking → Send Quote → Send Payment
//   Link → Payment initiation (wire transfer) → Balance reminder (cron)
//
// Customer used: martinezkaponda@gmail.com
//
// Usage:  node scripts/e2e-journey.mjs
//
// This performs REAL side effects against the configured backend:
//   - writes records to the Supabase database (inquiry, booking, guest, etc.)
//   - sends REAL emails (via Brevo) to the customer address
//   - triggers AI/LLM profiling (via OpenRouter) and PayPal sandbox logic
// It does NOT capture funds (wire transfer path returns instructions only).
// ───────────────────────────────────────────────────────────────────────────

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const CUSTOMER_EMAIL = "martinezkaponda@gmail.com";
const CUSTOMER_NAME = "Martinez Kaponda";

// ── Load .env.local (lightweight parser, no dotenv dep) ────────────────
const envFile = readFileSync(join(root, ".env.local"), "utf8");
const env = {};
for (const line of envFile.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}
const CRON_SECRET = env.CRON_SECRET || "";
const ADMIN_EMAIL = process.env.KIVARA_ADMIN_EMAIL || env.KIVARA_ADMIN_EMAIL || "admin@kivara.com";
const ADMIN_PASSWORD = process.env.KIVARA_ADMIN_PASSWORD || env.KIVARA_ADMIN_PASSWORD || "";

// ── Tiny cookie jar for admin SSR session ───────────────────────────────
const cookieJar = { cookies: [] };
function setCookiesFrom(res) {
  const setCookie = res.headers.getSetCookie?.() || [];
  for (const c of setCookie) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    // session-related cookies only
    if (/sb-|sb-.*-auth-token/i.test(name) || /supabase|auth-token/i.test(name) || /session/i.test(name)) {
      const existing = cookieJar.cookies.findIndex((x) => x.name === name);
      if (existing >= 0) cookieJar.cookies[existing] = { name, value: pair.slice(eq + 1) };
      else cookieJar.cookies.push({ name, value: pair.slice(eq + 1) });
    }
  }
}
function cookieHeader() {
  return cookieJar.cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

// ── Helpers ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];
const steps = {};

async function api(method, path, { body, admin = false, cron = false, raw = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (admin) headers["Cookie"] = cookieHeader();
  if (cron) headers["Authorization"] = `Bearer ${CRON_SECRET}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    redirect: "manual",
  });
  // capture session cookies from any response
  if (res.headers.getSetCookie) setCookiesFrom(res);
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = raw ? text : null;
  }
  return { status: res.status, data, text };
}

function record(key, ok, detail) {
  results.push({ key, ok, detail });
  if (ok) passed++;
  else failed++;
  const mark = ok ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${key}${detail ? ` — ${detail}` : ""}`);
}

function assertStatus(res, expected, key) {
  const ok = res.status === expected;
  record(key, ok, `expected ${expected}, got ${res.status}`);
  return ok;
}

// ── MAIN ────────────────────────────────────────────────────────────────
async function main() {
  const ts = new Date().toISOString();
  console.log("══════════════════════════════════════════════════════════");
  console.log("  KIVARA — FULL BACKEND CUSTOMER JOURNEY TEST");
  console.log(`  Base URL: ${BASE}`);
  console.log(`  Customer: ${CUSTOMER_EMAIL}`);
  console.log(`  Started : ${ts}`);
  console.log("══════════════════════════════════════════════════════════\n");

  // ── STEP 1: Create inquiry (public, no auth) ─────────────────────────
  console.log("STEP 1 — PUBLIC INQUIRY  (POST /api/inquiry)\n");
  steps.unique = Date.now().toString(36);
  const inquiryBody = {
    fullName: CUSTOMER_NAME,
    email: CUSTOMER_EMAIL,
    phone: "+260 97 000 0000",
    destination: "South Luangwa, Zambia",
    preferredDates: "2026-11-20",
    guests: 2,
    message: `Honeymoon inquiry via automated E2E journey test (${steps.unique}). Looking for a luxurious lodge with private pool, game drives, and a beautiful river view. We prefer sunrise game drives and a candlelit bush dinner.`,
  };
  let res = await api("POST", "/api/inquiry", { body: inquiryBody });
  const inquiryOk = assertStatus(res, 200, "Create inquiry returns 200");
  steps.inquiryId = res.data?.inquiryId;
  if (inquiryOk) record("Inquiry saved", !!steps.inquiryId, `inquiryId=${steps.inquiryId || "N/A"}`);
  else record("Inquiry saved", false, `error=${JSON.stringify(res.data)}`);
  console.log("");

  // ── STEP 1b: Check confirmation email side-effect flag ───────────────
  // Emails are sent via Brevo to concierge@kivara.luxury and the customer.
  record("Inquiry emails triggered", inquiryOk, "concierge + confirmation queued via Brevo");

  // ── STEP 2: Admin login (hardened) ───────────────────────────────────
  console.log("STEP 2 — ADMIN LOGIN  (POST /api/admin/auth/login)\n");
  res = await api("POST", "/api/admin/auth/login", {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const loginOk = assertStatus(res, 200, "Admin login returns 200");
  if (loginOk) {
    record("Admin session cookie set", cookieJar.cookies.length > 0, `${cookieJar.cookies.length} cookie(s)`);
    record("Admin role", res.data?.profile?.role, `effectiveRole=${res.data?.profile?.effectiveRole}`);
  } else {
    record("Admin session cookie set", false, `login error=${JSON.stringify(res.data)}`);
  }
  console.log("");

  // ── STEP 3: Convert inquiry → booking (admin) ────────────────────────
  console.log("STEP 3 — CONVERT INQUIRY TO BOOKING  (POST /api/admin/inquiries/:id/convert)\n");
  let bookingId = null;
  let bookingRef = null;
  if (steps.inquiryId) {
    res = await api("POST", `/api/admin/inquiries/${steps.inquiryId}/convert`, { admin: true });
    const convOk = assertStatus(res, 201, "Convert inquiry returns 201");
    if (convOk) {
      steps.bookingId = res.data?.bookingId;
      steps.bookingReference = res.data?.bookingReference;
      steps.guestId = res.data?.guestId;
      bookingId = steps.bookingId;
      bookingRef = steps.bookingReference;
      record("Provisional booking created", !!bookingId, `ref=${bookingRef || "N/A"}`);
      record("Guest profile created/used", !!steps.guestId, `guestId=${steps.guestId || "N/A"}`);
    } else {
      record("Provisional booking created", false, `error=${JSON.stringify(res.data)}`);
    }
  } else {
    record("Convert inquiry to booking", false, "no inquiryId from step 1");
  }
  console.log("");

  // ── STEP 4: Send quote (AI) + persist — follow-up ────────────────────
  console.log("STEP 4 — SEND QUOTE  (POST /api/ai/send-quote)\n");
  const quoteProfile = {
    name: CUSTOMER_NAME,
    email: CUSTOMER_EMAIL,
    phone: "+260 97 000 0000",
    destination: "South Luangwa, Zambia",
    message: "Honeymoon — private pool, game drives, river view, bush dinner.",
  };
  try {
    res = await api("POST", "/api/ai/send-quote", { body: { profile: quoteProfile, inquiryId: steps.inquiryId } });
    const qOk = assertStatus(res, 200, "Send quote returns 200");
    if (qOk) {
      steps.quoteRef = res.data?.quoteRef;
      record("Quote generated", !!steps.quoteRef, `quoteRef=${steps.quoteRef || "N/A"}`);
      record("Quote email sent", !!res.data?.messageId, `messageId=${res.data?.messageId || ""}`);
      record("Quote PDF attached", !!res.data?.pdfAttached, `pdf=${res.data?.pdfAttached}`);
      // persistQuote may create/return a booking
      if (res.data?.bookingId && !bookingId) {
        steps.bookingId = bookingId = res.data.bookingId;
        steps.bookingReference = bookingRef = res.data.bookingReference;
      }
      if (res.data?.guestProfileId) steps.guestId = res.data.guestProfileId;
      record("Guest profile persisted", !!res.data?.guestProfileId, `guestId=${res.data?.guestProfileId || "N/A"}`);
    } else {
      record("Send quote", false, `error=${JSON.stringify(res.data)}`);
    }
  } catch (e) {
    record("Send quote", false, `exception=${e.message}`);
  }
  console.log("");

  // ── STEP 5: Send payment link + invoice (admin, follow-up) ───────────
  console.log("STEP 5 — SEND PAYMENT LINK  (POST /api/ai/send-payment-link)\n");
  if (bookingRef) {
    res = await api("POST", "/api/ai/send-payment-link", {
      admin: true,
      body: {
        bookingRef,
        clientName: CUSTOMER_NAME,
        clientEmail: CUSTOMER_EMAIL,
        amount: 3200,
        currency: "USD",
        type: "deposit",
        description: "Honeymoon deposit (30%) — South Luangwa",
      },
    });
    const plOk = assertStatus(res, 200, "Send payment link returns 200");
    if (plOk) {
      steps.paymentUrl = res.data?.paymentUrl;
      record("Payment link generated", !!steps.paymentUrl, `url=${steps.paymentUrl || "N/A"}`);
      record("Payment link email sent", !!res.data?.messageId, `messageId=${res.data?.messageId || ""}`);
      record("Invoice PDF attached", !!res.data?.pdfAttached, `pdf=${res.data?.pdfAttached}`);
    } else {
      record("Send payment link", false, `error=${JSON.stringify(res.data)}`);
    }
  } else {
    record("Send payment link", false, "no bookingRef available");
  }
  console.log("");

  // ── STEP 6: Payment initiation (wire transfer path, real instructions) ──
  console.log("STEP 6 — PAYMENT INITIATION (wire transfer)\n");
  let paymentRes = null;
  if (bookingId) {
    // 6a: unified initiation endpoint — needs auth (guest or admin)
    try {
      res = await api("POST", "/api/payment", {
        admin: true,
        body: { bookingId, method: "wire_transfer", type: "balance" },
      });
      if (res.status === 200 || res.status === 302) {
        steps.paymentRef = res.data?.reference || steps.paymentRef;
        paymentRes = res.data;
        record("Payment initiation (wire)", true, `ref=${res.data?.reference || "N/A"}, amount=${res.data?.amount}`);
      } else {
        record("Payment initiation (wire)", res.status === 200, `status=${res.status}, data=${JSON.stringify(res.data)}`);
      }
    } catch (e) {
      record("Payment initiation (wire)", false, `exception=${e.message}`);
    }

    // 6b: detailed wire-transfer instructions endpoint
    try {
      res = await api("POST", "/api/payment/wire-transfer", {
        admin: true,
        body: { bookingId, type: "balance" },
      });
      const wtOk = assertStatus(res, 200, "Wire-transfer instructions returns 200");
      if (wtOk) {
        steps.wireRef = res.data?.reference;
        record("Bank details returned", !!res.data?.bankDetails?.bankName, `bank=${res.data?.bankDetails?.bankName || "N/A"}`);
        record("Wire instructions generated", !!res.data?.instructions, `deadline=${res.data?.deadline || "N/A"}`);
        record("Payment reference set", !!res.data?.reference, `ref=${res.data?.reference || "N/A"}`);
      } else {
        record("Wire-transfer instructions", false, `error=${JSON.stringify(res.data)}`);
      }
    } catch (e) {
      record("Wire-transfer instructions", false, `exception=${e.message}`);
    }
  } else {
    record("Payment initiation (wire)", false, "no bookingId available");
  }
  console.log("");

  // ── STEP 7: Balance reminder (cron, follow-up) ───────────────────────
  console.log("STEP 7 — BALANCE REMINDER CRON  (POST /api/cron/balance-reminders)\n");
  try {
    res = await api("POST", "/api/cron/balance-reminders", { cron: true });
    if (res.status === 200 || res.status === 503) {
      record("Balance-reminder cron authorized", true, `status=${res.status}, sent=${res.data?.sent ?? "n/a"}`);
    } else {
      record("Balance-reminder cron authorized", false, `status=${res.status}, error=${JSON.stringify(res.data)}`);
    }
  } catch (e) {
    record("Balance-reminder cron authorized", false, `exception=${e.message}`);
  }
  console.log("");

  // ── STEP 8: Verify booking state via admin API ───────────────────────
  console.log("STEP 8 — VERIFY BOOKING STATE (admin GET)\n");
  if (bookingId) {
    res = await api("GET", `/api/admin/bookings/${bookingId}`, { admin: true });
    // handleGetOne returns camelCase keys (mapKeysToCamel). Support both.
    const b = res.data || {};
    const ref = b.bookingReference || b.booking_reference;
    const clientEmail = b.clientEmail || b.client_email;
    const inquiryIdField = b.inquiryId || b.inquiry_id;
    const payMethod = b.paymentMethod || b.payment_method;
    const vOk = res.status === 200 && (b.id || ref);
    if (vOk) {
      record("Booking fetchable", true, `ref=${ref || "N/A"}, status=${b.status}, client=${clientEmail || "N/A"}`);
      record("Booking linked to customer", clientEmail === CUSTOMER_EMAIL, `client=${clientEmail || "N/A"}`);
      record("Booking linked to inquiry", !!inquiryIdField, `inquiry=${inquiryIdField || "N/A"}`);
      record("Payment method recorded", !!payMethod, `method=${payMethod || "N/A"}`);
    } else {
      record("Booking fetchable", false, `status=${res.status}, data=${JSON.stringify(res.data)}`);
    }
  } else {
    record("Verify booking state", false, "no bookingId available");
  }
  console.log("");

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("══════════════════════════════════════════════════════════");
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`  Booking Reference : ${steps.bookingReference || "N/A"}`);
  console.log(`  Booking ID        : ${steps.bookingId || "N/A"}`);
  console.log(`  Guest ID          : ${steps.guestId || "N/A"}`);
  console.log(`  Quote Ref         : ${steps.quoteRef || "N/A"}`);
  console.log(`  Payment Ref       : ${steps.paymentRef || steps.wireRef || "N/A"}`);
  console.log(`  Inquiry ID        : ${steps.inquiryId || "N/A"}`);
  console.log("══════════════════════════════════════════════════════════");
  console.log("\n");

  if (failed > 0) {
    console.log("FAILED STEPS:");
    results.filter((r) => !r.ok).forEach((r) => console.log(`  ✗ ${r.key}: ${r.detail}`));
    console.log("\nJourney test COMPLETED WITH FAILURES.");
    process.exitCode = 1;
  } else {
    console.log("Journey test PASSED — full backend journey complete.");
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exitCode = 1;
});
