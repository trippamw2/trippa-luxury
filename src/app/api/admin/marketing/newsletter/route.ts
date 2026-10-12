import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  newsletterCampaignEmail,
  recordEmailDeliveries,
} from "@/lib/email";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";
import { partitionSuppressed, normalizeEmail } from "@/lib/email-consent";
import type { SupabaseClient } from "@supabase/supabase-js";

const TABLE = "newsletter_subscribers";
const FROM_EMAIL = process.env.KIVARA_EMAIL_FROM || "concierge@kivara.africa";
/** Brevo accepts up to 1000 recipients per request; stay under it. */
const BATCH = 900;
/** Upper bound on a single resolved audience. */
const RECIPIENT_LIMIT = 5000;

type AudienceSource = "newsletter" | "guests";

interface Audience {
  source: AudienceSource;
  tags: string[];
  vipOnly: boolean;
}

interface Recipient {
  email: string;
  name?: string;
}

/**
 * GET  /api/admin/marketing/newsletter — list subscribers (active + total counts).
 * POST /api/admin/marketing/newsletter — send a campaign to a resolved audience.
 * DELETE — remove a subscriber row.
 */

function parseAudience(body: unknown): Audience {
  const raw =
    body && typeof body === "object"
      ? ((body as Record<string, unknown>).audience as Record<string, unknown> | undefined)
      : undefined;

  return {
    source: raw?.source === "guests" ? "guests" : "newsletter",
    tags: Array.isArray(raw?.tags)
      ? (raw?.tags as unknown[]).filter(
          (t): t is string => typeof t === "string" && t.trim() !== ""
        )
      : [],
    vipOnly: raw?.vipOnly === true,
  };
}

/**
 * Resolve an audience to candidate recipients. This is the segmentation step:
 * the newsletter list, or consented guests narrowed by tags / VIP flag. Consent
 * (`email_opt_in`) is applied here; the do-not-email list is applied by the
 * caller so it can also be reported to the operator.
 */
async function resolveRecipients(
  supabase: SupabaseClient,
  audience: Audience
): Promise<Recipient[]> {
  if (audience.source === "guests") {
    let query = supabase
      .from("guest_profiles")
      .select("full_name, email")
      .eq("email_opt_in", true)
      .not("email", "is", null);

    if (audience.vipOnly) query = query.eq("is_vip", true);
    if (audience.tags.length > 0) query = query.contains("tags", audience.tags);

    const { data, error } = await query.limit(RECIPIENT_LIMIT);
    if (error) throw new Error(error.message);
    return (data ?? []).map((g) => ({
      email: String(g.email),
      name: (g.full_name as string) || undefined,
    }));
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("email")
    .eq("is_active", true)
    .limit(RECIPIENT_LIMIT);

  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({ email: String(s.email) }));
}

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

    await createAuditLog({
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
    const preview: boolean = body.preview === true;

    if (!subject || !bodyHtml) {
      return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
    }

    const audience = parseAudience(body);

    // 1. Resolve the audience (segmentation + consent).
    const candidates = await resolveRecipients(supabase, audience);
    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "No recipients match this audience" },
        { status: 400 }
      );
    }

    // 2. De-duplicate by normalized address before it reaches the provider.
    const seen = new Set<string>();
    const unique = candidates.filter((c) => {
      const key = normalizeEmail(c.email);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 3. Apply the global do-not-email list. Fail closed: if the list cannot be
    // read, nothing is sent rather than risking mail to someone who opted out.
    let allowed: string[];
    let blocked: string[];
    try {
      const part = await partitionSuppressed(
        unique.map((c) => c.email),
        "marketing"
      );
      allowed = part.allowed;
      blocked = part.blocked;
    } catch (err) {
      console.error("Campaign suppression lookup failed:", err);
      return NextResponse.json(
        { error: "Could not verify the do-not-email list; nothing was sent." },
        { status: 503 }
      );
    }

    const allowedSet = new Set(allowed.map(normalizeEmail));
    const recipients = unique.filter((c) => allowedSet.has(normalizeEmail(c.email)));

    // 4. A preview reports the resolved audience without sending.
    if (preview) {
      return NextResponse.json({
        success: true,
        preview: true,
        audience,
        matched: unique.length,
        suppressed: blocked.length,
        recipients: recipients.length,
      });
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "Every matching recipient is on the do-not-email list" },
        { status: 400 }
      );
    }

    const template = newsletterCampaignEmail({ subject, bodyHtml });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const headers = {
      // Presence of List-Unsubscribe is what most receivers require of bulk mail.
      "List-Unsubscribe": `<mailto:${FROM_EMAIL}?subject=unsubscribe>, <${siteUrl}/unsubscribe>`,
    };

    let sent = 0;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      try {
        const result = await sendEmail({
          to: batch.map((r) => ({ email: r.email, name: r.name })),
          subject: template.subject,
          htmlContent: template.htmlContent,
          headers,
          // This send spans many recipients; record each one individually below.
          log: false,
        });

        await recordEmailDeliveries(
          batch.map((r) => ({
            status: "sent" as const,
            toEmail: r.email,
            toName: r.name,
            subject: template.subject,
            messageId: result.messageId,
            meta: { campaign: true, audience: audience.source },
          }))
        );
        sent += batch.length;
      } catch (emailError) {
        const message =
          emailError instanceof Error ? emailError.message : "unknown error";
        // Record the failed batch per recipient too, so the failure is as
        // observable as a success.
        await recordEmailDeliveries(
          batch.map((r) => ({
            status: "failed" as const,
            toEmail: r.email,
            toName: r.name,
            subject: template.subject,
            error: message,
            meta: { campaign: true, audience: audience.source },
          }))
        );
        await createAuditLog({
          tableName: TABLE,
          action: "CAMPAIGN_SEND",
          newData: sanitizeForAudit({
            subject,
            audience,
            sent,
            failed_at_recipient: batch[0]?.email,
            error: message,
          }),
          performedBy: auth.profile.id,
          ipAddress: getIpFromRequest(request),
        });
        return NextResponse.json(
          { error: `Campaign failed after ${sent} email(s): ${message}` },
          { status: 502 }
        );
      }
    }

    await createAuditLog({
      tableName: TABLE,
      action: "CAMPAIGN_SEND",
      newData: sanitizeForAudit({
        subject,
        audience,
        recipients: sent,
        suppressed: blocked.length,
      }),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({
      success: true,
      sent,
      suppressed: blocked.length,
      message: `Campaign sent to ${sent} recipient(s)${
        blocked.length ? `; ${blocked.length} suppressed` : ""
      }.`,
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
