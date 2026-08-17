import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, inquiryReplyEmail } from "@/lib/email";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";

const TABLE = "inquiries";

/**
 * Sends a real concierge reply to the inquiry's email address via Brevo,
 * then updates the inquiry (status -> contacted, response tracking, SLA)
 * and logs the exchange on the linked guest profile's timeline.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await requireAdmin({ module: "inquiries", minRole: "agent" });
    const supabase = createAdminClient();
    const body = await request.json();

    const replyText: string = typeof body.replyText === "string" ? body.replyText.trim() : "";
    const subject: string = typeof body.subject === "string" ? body.subject.trim() : "";

    if (!replyText) {
      return NextResponse.json({ error: "Reply text is required" }, { status: 400 });
    }

    // ── Load the inquiry ─────────────────────────────────────────────
    const { data: inquiry, error: inquiryError } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (inquiryError || !inquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    if (!inquiry.email) {
      return NextResponse.json({ error: "Inquiry has no email address" }, { status: 400 });
    }

    // ── Send the email via Brevo ─────────────────────────────────────
    // Convert the plain-text reply to simple HTML (paragraph-safe).
    const replyHtml = replyText
      .split(/\n{2,}/)
      .map((p) => `<p style="margin: 0 0 12px;">${p.replace(/\n/g, "<br />")}</p>`)
      .join("");

    const template = inquiryReplyEmail({
      clientName: inquiry.full_name || "Traveler",
      replyHtml,
    });

    let emailError: string | null = null;
    try {
      await sendEmail({
        to: [{ email: inquiry.email }],
        subject: subject || template.subject,
        htmlContent: template.htmlContent,
      });
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Failed to send email";
    }

    if (emailError) {
      return NextResponse.json({ error: `Email could not be sent: ${emailError}` }, { status: 502 });
    }

    // ── Link a matching guest profile by email if not already linked ──
    let guestProfileId = inquiry.guest_profile_id;
    if (!guestProfileId) {
      const { data: match } = await supabase
        .from("guest_profiles")
        .select("id")
        .eq("email", inquiry.email)
        .maybeSingle();
      if (match) {
        guestProfileId = match.id;
      }
    }

    // ── Update the inquiry (response tracking + SLA) ─────────────────
    const now = new Date().toISOString();
    const slaDueAt = inquiry.sla_due_at ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: updated, error: updateError } = await supabase
      .from(TABLE)
      .update({
        status: "contacted",
        first_response_at: inquiry.first_response_at ?? now,
        response_count: (inquiry.response_count ?? 0) + 1,
        sla_due_at: slaDueAt,
        ...(guestProfileId ? { guest_profile_id: guestProfileId } : {}),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Inquiry updated but response tracking failed:", updateError);
    }

    // ── Log on the guest communication timeline ──────────────────────
    if (guestProfileId) {
      await supabase.from("guest_communications").insert({
        guest_profile_id: guestProfileId,
        channel: "email",
        direction: "outbound",
        subject: subject || template.subject,
        body: replyText,
        related_inquiry_id: id,
        admin_id: auth.profile.id,
      });
    }

    // Audit log
    createAuditLog({
      tableName: TABLE,
      recordId: id,
      action: "UPDATE",
      oldData: sanitizeForAudit({ ...inquiry, status: inquiry.status }),
      newData: sanitizeForAudit(updated ?? { status: "contacted", response_count: (inquiry.response_count ?? 0) + 1 }),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({
      success: true,
      data: updated
        ? {
            id: updated.id,
            status: updated.status,
            responseCount: updated.response_count,
            firstResponseAt: updated.first_response_at,
            slaDueAt: updated.sla_due_at,
            guestProfileId: updated.guest_profile_id,
          }
        : null,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in POST /api/admin/inquiries/${id}/reply:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
