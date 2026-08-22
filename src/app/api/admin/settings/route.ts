import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

export async function GET() {
  try {
    await requireAdmin({ module: "settings", minRole: "admin" });
    const supabase = createAdminClient();

    const { data: settings } = await supabase
      .from("platform_settings")
      .select("key, value");

    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: { key: string; value: string }) => { settingsMap[s.key] = s.value; });

    return NextResponse.json({
      siteName: settingsMap.site_name || "Kivara",
      whatsapp: settingsMap.whatsapp_number || "",
      email: settingsMap.contact_email || "",
      currency: settingsMap.default_currency || "USD",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      supabaseConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      brevoConfigured: !!process.env.NEXT_BREVO_KEY,
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
    await requireAdmin({ module: "settings", minRole: "admin" });
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

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
