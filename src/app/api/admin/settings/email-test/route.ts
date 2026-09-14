// ─── Kivara Email Diagnostics ────────────────────────────────────────────
// POST /api/admin/settings/email-test
// Admin-only endpoint that verifies the Brevo pipeline end-to-end and returns
// actionable guidance for each failure, so email misconfiguration is never a
// silent mystery again.
//
// Body:   { to: string }            — recipient for the test send (required)
// Steps:  1. key present?          2. key valid (GET /v3/account)?
//         3. sender configured?    4. test send via the real sendEmail path

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { sendEmail } from "@/lib/email";

const BREVO_ACCOUNT_ENDPOINT = "https://api.brevo.com/v3/account";

async function checkBrevoKey(key: string) {
  try {
    const res = await fetch(BREVO_ACCOUNT_ENDPOINT, {
      headers: { "api-key": key },
      cache: "no-store",
    });
    if (res.status === 200) {
      const account = (await res.json()) as { email?: string; companyName?: string };
      return {
        ok: true as const,
        account: account.email || "unknown",
        company: account.companyName || undefined,
        status: res.status,
      };
    }
    let hint = "The key was rejected. Generate a fresh key at https://app.brevo.com/settings/keys/api";
    if (res.status === 401) hint += " — check it was copied exactly (no spaces, full xkeysib-… string).";
    if (res.status === 403) hint += " — your Brevo account may be suspended or missing transactional email access.";
    if (res.status === 429) hint += " — rate limited, retry shortly.";
    return { ok: false as const, status: res.status, hint };
  } catch (err) {
    return { ok: false as const, status: 0, hint: `Network error reaching Brevo API: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth gate: only admins may run the diagnostic.
    await requireAdmin({ module: "settings", minRole: "admin" });

    let to: string | undefined;
    try {
      const body = (await request.json()) as { to?: string };
      const trimmed = body.to?.trim();
      if (trimmed) to = trimmed;
    } catch {
      // no body — recipient must come from the body
    }

    if (!to) {
      return NextResponse.json(
        { error: "No recipient provided — send { \"to\": \"you@example.com\" } in the request body." },
        { status: 400 }
      );
    }

    const diagnostics: {
      keyPresent: boolean;
      keyValid: boolean;
      keyDetail: { ok: boolean; status: number; hint?: string; account?: string; company?: string } | null;
      sender: { email: string; name: string } | null;
      testSend: { ok: boolean; messageId?: string | null; error?: string } | null;
      guidance: string[];
    } = {
      keyPresent: false,
      keyValid: false,
      keyDetail: null,
      sender: null,
      testSend: null,
      guidance: [],
    };

    // 1. Key presence
    const key = process.env.NEXT_BREVO_KEY || "";
    if (!key || key.trim() === "" || key.trim() === "xkeysib-xxxxxxxx") {
      diagnostics.keyPresent = false;
      diagnostics.guidance.push(
        "NEXT_BREVO_KEY is missing or still the template placeholder. " +
          "Create a key at https://app.brevo.com/settings/keys/api, then add NEXT_BREVO_KEY=… to .env.local and the deployment environment."
      );
      return NextResponse.json({ ok: false, ...diagnostics }, { status: 200 });
    }
    diagnostics.keyPresent = true;

    // 2. Key validity (live check against the exact endpoint the SDK calls)
    const keyCheck = await checkBrevoKey(key.trim());
    diagnostics.keyDetail = keyCheck;
    if (!keyCheck.ok) {
      diagnostics.guidance.push(`Brevo rejected the API key (HTTP ${keyCheck.status}). ${keyCheck.hint}`);
      return NextResponse.json({ ok: false, ...diagnostics }, { status: 200 });
    }
    diagnostics.keyValid = true;

    // 3. Sender identity
    const from = process.env.KIVARA_EMAIL_FROM || "concierge@kivara.africa";
    const fromName = process.env.KIVARA_EMAIL_FROM_NAME || "Kivara Concierge";
    diagnostics.sender = { email: from, name: fromName };

    // 4. Real test send through the shared sendEmail path
    try {
      const result = await sendEmail({
        to: [{ email: to }],
        subject: "Kivara email pipeline test",
        htmlContent:
          "<div style='font-family:Arial;padding:24px;'>" +
          "<h2 style='color:#1A1A1A;'>Email pipeline confirmed working</h2>" +
          "<p style='color:#555;'>If you are reading this, Brevo delivered a transactional email from " +
          `${escapeHtml(from)} on behalf of Kivara.</p>` +
          "<p style='color:#8B7D6B;font-size:12px;'>Sent via the diagnostics endpoint " +
          `${new Date().toISOString()}</p></div>`,
      });
      diagnostics.testSend = { ok: true, messageId: result.messageId || null };
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : String(sendError);
      diagnostics.testSend = { ok: false, error: message };
      diagnostics.guidance.push(
        "The send failed. Most likely causes: (a) the sender domain is not verified in Brevo — " +
          "add the SPF (v=spf1 include:spf.brevo.com ~all) + DKIM records from " +
          "https://app.brevo.com/senders/domains to your DNS, or set KIVARA_EMAIL_FROM to an already-verified sender address; " +
          `(b) the recipient hard-bounced. Detail: ${message}`
      );
    }

    const allPassed =
      diagnostics.keyPresent === true &&
      diagnostics.keyValid === true &&
      diagnostics.testSend?.ok === true;

    return NextResponse.json({ ok: allPassed, ...diagnostics }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in POST /api/admin/settings/email-test:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}