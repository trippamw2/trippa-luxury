import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import {
  DEFAULT_GOVERNANCE_SETTINGS,
  GOVERNANCE_DOC_VERSION,
  GOVERNANCE_RATIFICATION_PHRASE,
  getGovernanceSettings,
  isRatificationStale,
  ratifyGovernance,
  setGovernanceSettings,
} from "@/lib/ai/governance-settings";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdmin({ module: "settings", minRole: "admin" });
    const supabase = createAdminClient();

    const { data: settings } = await supabase
      .from("platform_settings")
      .select("key, value");

    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: { key: string; value: string }) => { settingsMap[s.key] = s.value; });

    // Read through the governance layer rather than re-deriving from the raw
    // map, so the admin screen shows the dial and switches actually in force —
    // including any environment override, which the raw rows would hide.
    const governance = await getGovernanceSettings();

    return NextResponse.json({
      siteName: settingsMap.site_name || "Kivara",
      whatsapp: settingsMap.whatsapp_number || "",
      email: settingsMap.contact_email || "",
      currency: settingsMap.default_currency || "USD",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      supabaseConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      brevoConfigured: !!process.env.NEXT_BREVO_KEY,
      // `inForce` is what the runtime is really enforcing right now. `stored` is
      // what the database holds, which differ whenever the environment overrides.
      governance: {
        inForce: governance,
        stored: governance,
        defaults: DEFAULT_GOVERNANCE_SETTINGS,
        docVersion: GOVERNANCE_DOC_VERSION,
        ratificationPhrase: GOVERNANCE_RATIFICATION_PHRASE,
        stale: await isRatificationStale(),
      },
      bankDetails: {
        bankName: settingsMap.bank_name || "",
        accountName: settingsMap.bank_account_name || "",
        accountNumber: settingsMap.bank_account_number || "",
        iban: settingsMap.bank_iban || "",
        swiftCode: settingsMap.bank_swift_code || "",
        routingNumber: settingsMap.bank_routing_number || "",
        sortCode: settingsMap.bank_sort_code || "",
        bankCurrency: settingsMap.bank_currency || "USD",
        bankCountry: settingsMap.bank_country || "",
      },
      transferPricing: {
        charterLbyMfu: settingsMap.charter_lby_mfu || "1850",
        charterMfuZnz: settingsMap.charter_mfu_znz || "1450",
        charterLbyZnz: settingsMap.charter_lby_znz || "1650",
        charterInternal: settingsMap.charter_internal || "350",
        exitCharter: settingsMap.exit_charter || "750",
        roadTransfer: settingsMap.road_transfer || "120",
        parkFeesPerDay: settingsMap.park_fees_per_day || "120",
      },
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { profile } = await requireAdmin({ module: "settings", minRole: "admin" });
    const body = await request.json();
    const supabase = createAdminClient();

    const entries: { key: string; value: string }[] = [];
    if (body.siteName !== undefined) entries.push({ key: "site_name", value: body.siteName });
    if (body.whatsapp !== undefined) entries.push({ key: "whatsapp_number", value: body.whatsapp });
    if (body.email !== undefined) entries.push({ key: "contact_email", value: body.email });
    if (body.currency !== undefined) entries.push({ key: "default_currency", value: body.currency });

    // Bank details
    if (body.bankDetails) {
      const bd = body.bankDetails;
      if (bd.bankName !== undefined) entries.push({ key: "bank_name", value: bd.bankName });
      if (bd.accountName !== undefined) entries.push({ key: "bank_account_name", value: bd.accountName });
      if (bd.accountNumber !== undefined) entries.push({ key: "bank_account_number", value: bd.accountNumber });
      if (bd.iban !== undefined) entries.push({ key: "bank_iban", value: bd.iban });
      if (bd.swiftCode !== undefined) entries.push({ key: "bank_swift_code", value: bd.swiftCode });
      if (bd.routingNumber !== undefined) entries.push({ key: "bank_routing_number", value: bd.routingNumber });
      if (bd.sortCode !== undefined) entries.push({ key: "bank_sort_code", value: bd.sortCode });
      if (bd.bankCurrency !== undefined) entries.push({ key: "bank_currency", value: bd.bankCurrency });
      if (bd.bankCountry !== undefined) entries.push({ key: "bank_country", value: bd.bankCountry });
    }

    // Transfer pricing
    if (body.transferPricing) {
      const tp = body.transferPricing;
      if (tp.charterLbyMfu !== undefined) entries.push({ key: "charter_lby_mfu", value: String(tp.charterLbyMfu) });
      if (tp.charterMfuZnz !== undefined) entries.push({ key: "charter_mfu_znz", value: String(tp.charterMfuZnz) });
      if (tp.charterLbyZnz !== undefined) entries.push({ key: "charter_lby_znz", value: String(tp.charterLbyZnz) });
      if (tp.charterInternal !== undefined) entries.push({ key: "charter_internal", value: String(tp.charterInternal) });
      if (tp.exitCharter !== undefined) entries.push({ key: "exit_charter", value: String(tp.exitCharter) });
      if (tp.roadTransfer !== undefined) entries.push({ key: "road_transfer", value: String(tp.roadTransfer) });
      if (tp.parkFeesPerDay !== undefined) entries.push({ key: "park_fees_per_day", value: String(tp.parkFeesPerDay) });
    }

    for (const entry of entries) {
      await supabase.from("platform_settings").upsert(
        { key: entry.key, value: entry.value },
        { onConflict: "key" }
      );
    }

    // ── Governance controls ────────────────────────────────────────────────
    // Routed through `setGovernanceSettings` rather than the raw upsert above so
    // the runtime cache is invalidated and the change is attributed. Writing the
    // rows directly here would persist a new dial that the running process keeps
    // ignoring for up to the cache TTL, which is exactly the kind of "I changed
    // the setting and nothing happened" failure that erodes trust in a kill switch.
    let governanceResult: Awaited<ReturnType<typeof setGovernanceSettings>> | null = null;
    let ratificationResult: Awaited<ReturnType<typeof ratifyGovernance>> | null = null;

    if (body.governance !== undefined) {
      const g = body.governance;

      if (g.autonomyLevel !== undefined && typeof g.autonomyLevel !== "number") {
        return NextResponse.json({ error: "governance.autonomyLevel must be a number" }, { status: 400 });
      }
      for (const flag of ["llmEnabled", "outboundEnabled", "internalWritesEnabled"] as const) {
        if (g[flag] !== undefined && typeof g[flag] !== "boolean") {
          return NextResponse.json({ error: `governance.${flag} must be a boolean` }, { status: 400 });
        }
      }

      const before = await getGovernanceSettings();
      governanceResult = await setGovernanceSettings(
        {
          autonomyLevel: g.autonomyLevel,
          llmEnabled: g.llmEnabled,
          outboundEnabled: g.outboundEnabled,
          internalWritesEnabled: g.internalWritesEnabled,
        },
        { performedBy: profile.id }
      );

      // A governance change is the most consequential write this endpoint can
      // make, so it is recorded with before/after state rather than a bare flag.
      await createAuditLog({
        tableName: "platform_settings",
        recordId: "governance",
        action: "UPDATE",
        oldData: {
          autonomyLevel: before.autonomyLevel,
          llmEnabled: before.llmEnabled,
          outboundEnabled: before.outboundEnabled,
          internalWritesEnabled: before.internalWritesEnabled,
        },
        newData: {
          autonomyLevel: governanceResult.autonomyLevel,
          llmEnabled: governanceResult.llmEnabled,
          outboundEnabled: governanceResult.outboundEnabled,
          internalWritesEnabled: governanceResult.internalWritesEnabled,
        },
        performedBy: profile.id,
      });
    }

    // Ratification is a separate concern from the operating dial: it signs the
    // document, it does not set it. `ratifyGovernance` rejects a request that has
    // not typed the exact acknowledgement phrase, so a stray or automated PUT
    // cannot ratify on an operator's behalf.
    if (body.ratify === true) {
      ratificationResult = await ratifyGovernance({
        performedBy: profile.id,
        acknowledgement: typeof body.ratificationAcknowledgement === "string" ? body.ratificationAcknowledgement : "",
      });

      await createAuditLog({
        tableName: "platform_settings",
        recordId: "governance",
        action: "UPDATE",
        oldData: { ratifiedAt: null, note: "ratification event" },
        newData: {
          ratifiedAt: ratificationResult.settings.ratifiedAt,
          ratifiedBy: ratificationResult.settings.ratifiedBy,
          ratifiedDocVersion: ratificationResult.settings.ratifiedDocVersion,
          firstRatification: ratificationResult.firstRatification,
          reRatification: ratificationResult.reRatification,
        },
        performedBy: profile.id,
      });
    }

    return NextResponse.json({
      ok: true,
      governance: governanceResult,
      ratification: ratificationResult
        ? {
            ratifiedAt: ratificationResult.settings.ratifiedAt,
            ratifiedBy: ratificationResult.settings.ratifiedBy,
            ratifiedDocVersion: ratificationResult.settings.ratifiedDocVersion,
            firstRatification: ratificationResult.firstRatification,
            reRatification: ratificationResult.reRatification,
          }
        : undefined,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
