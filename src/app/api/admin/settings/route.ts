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
