import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, getIpFromRequest } from "@/lib/audit";
import { getSiteUrl } from "@/lib/site-url";
import { sendEmail } from "@/lib/email";

const TABLE = "admin_profiles";

/**
 * POST /api/admin/users/[id]/reset
 *
 * Emails a password-setting link to an existing staff account. The link is
 * generated with the service role (recovery, falling back to a magic link for
 * accounts that never confirmed an invite) and delivered through Brevo, so it
 * uses the same sender as every other transactional email.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await requireAdmin({ module: "users", minRole: "admin" });
    const supabase = createAdminClient();

    const { data: profile, error: profileError } = await supabase
      .from(TABLE)
      .select("id, full_name, is_active")
      .eq("id", id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (profile.is_active === false) {
      return NextResponse.json(
        { error: "Reactivate the account before sending a password link" },
        { status: 400 }
      );
    }

    const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(id);
    const email = authUser?.user?.email;
    if (userError || !email) {
      return NextResponse.json(
        { error: "This profile has no sign-in email" },
        { status: 400 }
      );
    }

    const redirectTo = `${getSiteUrl()}/reset-password`;

    let actionLink: string | null = null;
    const recovery = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    actionLink = recovery.data?.properties?.action_link ?? null;

    if (recovery.error || !actionLink) {
      const magic = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });
      actionLink = magic.data?.properties?.action_link ?? null;
      if (magic.error || !actionLink) {
        console.error("Password link generation failed:", recovery.error ?? magic.error);
        return NextResponse.json(
          { error: "Could not generate a password link for this account" },
          { status: 500 }
        );
      }
    }

    try {
      await sendEmail({
        to: [{ email, name: profile.full_name ?? undefined }],
        subject: "Set a new password for your Kivara admin account",
        htmlContent: passwordEmail(actionLink),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email failed";
      console.error(`Password email to ${email} failed:`, message);
      return NextResponse.json(
        { error: `The link was generated but the email could not be sent: ${message}` },
        { status: 502 }
      );
    }

    await createAuditLog({
      tableName: TABLE,
      recordId: id,
      action: "UPDATE",
      newData: { password_link_emailed_to: email },
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({ success: true, emailedTo: email });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in POST /api/admin/users/${id}/reset:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

function passwordEmail(actionLink: string): string {
  return `
  <div style="background:#faf7f2;padding:32px;font-family:Georgia,'Times New Roman',serif;color:#2b2b2b">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e8e0d4;padding:32px">
      <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b08d57;margin:0 0 12px">Kivara · Staff console</p>
      <h1 style="font-size:22px;margin:0 0 16px;font-weight:normal">Set a new password</h1>
      <p style="font-size:14px;line-height:1.6">An administrator asked us to send you a fresh password link for the Kivara admin panel.</p>
      <p style="margin:24px 0">
        <a href="${actionLink}" style="background:#2b2b2b;color:#faf7f2;padding:12px 20px;text-decoration:none;font-size:14px">Choose a new password</a>
      </p>
      <p style="font-size:12px;color:#6b6b6b;line-height:1.6">This link expires in 24 hours and can only be used once. Your current password keeps working until you set a new one.</p>
    </div>
  </div>`;
}
