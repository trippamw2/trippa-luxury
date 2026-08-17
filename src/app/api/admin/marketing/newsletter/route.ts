import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, newsletterCampaignEmail } from "@/lib/email";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";

const TABLE = "newsletter_subscribers";

/**
 * GET  /api/admin/marketing/newsletter — list subscribers (active + total counts).
 * POST /api/admin/marketing/newsletter — send a campaign to all active subscribers via Brevo.
 */
export async function GET(_request: NextRequest) {
  try {
    await requireAdmin({ module: "marketing", minRole: "editor" });
    const supabase = createAdminClient();

    const { data, error, count } = await supabase
      .from(TABLE)
      .select("id, email, is_active, subscribed_at, unsubscribed_at", { count: "exact" })
      .order("subscribed_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { count: activeCount } = await supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    return NextResponse.json({
      data: (data ?? []).map((s) => ({
        id: s.id,
        email: s.email,
        isActive: s.is_active,
        subscribedAt: s.subscribed_at,
        unsubscribedAt: s.unsubscribed_at,
      })),
      count: count || 0,
      activeCount: activeCount || 0,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/marketing/newsletter:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin({ module: "marketing", minRole: "editor" });
    const supabase = createAdminClient();
    const body = await request.json();
    const id: string = typeof body.id === "string" ? body.id : "";

    if (!id) {
      return NextResponse.json({ error: "Subscriber id is required" }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from(TABLE)
      .select("id, email")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }

    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    createAuditLog({
      tableName: TABLE,
      action: "DELETE",
      oldData: sanitizeForAudit({ id: existing.id, email: existing.email }),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in DELETE /api/admin/marketing/newsletter:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin({ module: "marketing", minRole: "editor" });
    const supabase = createAdminClient();
    const body = await request.json();

    const subject: string = typeof body.subject === "string" ? body.subject.trim() : "";
    const bodyHtml: string = typeof body.bodyHtml === "string" ? body.bodyHtml.trim() : "";

    if (!subject || !bodyHtml) {
      return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
    }

    // Only send to opted-in subscribers.
    const { data: subscribers, error: listError } = await supabase
      .from(TABLE)
      .select("id, email")
      .eq("is_active", true)
      .limit(2000);

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const emails = (subscribers ?? []).map((s) => ({ email: s.email }));

    if (emails.length === 0) {
      return NextResponse.json({ error: "No active subscribers to send to" }, { status: 400 });
    }

    const template = newsletterCampaignEmail({ subject, bodyHtml });

    // Brevo accepts up to 1000 recipients per request — batch in chunks of 900.
    const BATCH = 900;
    let sent = 0;
    for (let i = 0; i < emails.length; i += BATCH) {
      const batch = emails.slice(i, i + BATCH);
      try {
        await sendEmail({
          to: batch,
          subject: template.subject,
          htmlContent: template.htmlContent,
        });
        sent += batch.length;
      } catch (emailError) {
        console.error("Campaign batch failed:", emailError);
        return NextResponse.json(
          { error: `Campaign failed after ${sent} email(s): ${emailError instanceof Error ? emailError.message : "unknown error"}` },
          { status: 502 }
        );
      }
    }

    createAuditLog({
      tableName: TABLE,
      action: "CAMPAIGN_SEND",
      newData: sanitizeForAudit({ subject, recipients: sent }),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({
      success: true,
      sent,
      message: `Campaign sent to ${sent} subscriber(s).`,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in POST /api/admin/marketing/newsletter:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
