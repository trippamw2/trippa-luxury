import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";
import { mapKeysToSnake, mapKeysToCamel } from "@/lib/api-helpers";
import { getSiteUrl } from "@/lib/site-url";
import { sendEmail } from "@/lib/email";

const TABLE = "admin_profiles";

/**
 * `admin_profiles` has no email column - emails live in auth.users, which
 * PostgREST does not expose. The admin UI shows each user's email, so it is
 * fetched server-side through the auth admin API and joined by id.
 */
async function fetchAuthEmails(supabase: ReturnType<typeof createAdminClient>) {
  const emailById = new Map<string, string>();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) {
      console.error("auth.admin.listUsers failed:", error.message);
      break;
    }
    const users = data?.users ?? [];
    for (const user of users) {
      if (user.email) emailById.set(user.id, user.email);
    }
    if (users.length < 100) break;
    page += 1;
    if (page > 50) break; // safety valve
  }
  return emailById;
}

export async function GET(request: NextRequest) {
  try {
    // Same guard handleGetList("admin_profiles") applied via TABLE_AUTH.
    await requireAdmin({ module: "users", minRole: "admin" });
    const supabase = createAdminClient();

    const limitParam = new URL(request.url).searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("full_name", { ascending: true });

    if (limit) query = query.limit(limit);

    const { data, error, count } = await query;

    if (error) {
      console.error(`Error fetching ${TABLE}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const emailById = await fetchAuthEmails(supabase);
    const rows = (data || []).map((row) => {
      const mapped = mapKeysToCamel<Record<string, unknown>>(row);
      return { ...mapped, email: emailById.get(row.id) ?? "" };
    });

    return NextResponse.json({ data: rows, count: count || 0 });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/users:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin({ module: "users", minRole: "admin" });
    const supabase = createAdminClient();
      const body = await request.json();

      // email/password belong to the auth user, NOT admin_profiles - sending
      // them to the profile insert fails with 42703 (column does not exist).
      const { password, email, ...profileFields } = body;

      if (!email || typeof email !== "string") {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }

      // A password is optional. Without one the account is created through an
      // emailed invite, so an admin never has to invent or transmit a password.
      const wantsInvite = typeof password !== "string" || password.length === 0;
      if (!wantsInvite && password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }

      const siteUrl = getSiteUrl();
      const redirectTo = `${siteUrl}/reset-password`;

      // ── Step 1. Create the Supabase Auth user ────────────────────────────
      let authUserId: string;
      let inviteLink: string | null = null;
      let authEmail: string = email;

      if (wantsInvite) {
        const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
          type: "invite",
          email,
          options: { redirectTo },
        });
        if (linkError || !link.user) {
          console.error("Error generating invite link:", linkError);
          return NextResponse.json(
            { error: linkError?.message ?? "Invite could not be created" },
            { status: 500 }
          );
        }
        authUserId = link.user.id;
        authEmail = link.user.email ?? email;
        inviteLink = link.properties?.action_link ?? null;
      } else {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (authError) {
          console.error("Error creating auth user:", authError);
          return NextResponse.json({ error: authError.message }, { status: 500 });
        }
        authUserId = authUser.user.id;
        authEmail = authUser.user.email ?? email;
      }

    // ── 2. Insert into admin_profiles ─────────────────────────────────
    const dbData = mapKeysToSnake({
      ...profileFields,
      id: authUserId, // Link profile to auth user
      ...(wantsInvite ? { invite_sent_at: new Date().toISOString() } : {}),
    });

    const { data, error } = await supabase
      .from(TABLE)
      .insert(dbData)
      .select()
      .single();

    if (error) {
      // Rollback: delete the auth user we just created
      await supabase.auth.admin.deleteUser(authUserId);
      console.error(`Error creating ${TABLE}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Invite mail is best-effort: the account exists even if Brevo is down, and
    // the admin can resend from the Users screen.
    let inviteEmail: { sent: boolean; error?: string } | null = null;
    if (wantsInvite && inviteLink) {
      try {
        await sendEmail({
          to: [{ email: authEmail }],
          subject: "You have been invited to the Kivara admin panel",
          htmlContent: staffInviteEmail(inviteLink),
        });
        inviteEmail = { sent: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Email failed";
        console.error(`Invite email to ${authEmail} failed:`, message);
        inviteEmail = { sent: false, error: message };
      }
    }

    // ── 3. Audit log ─────────────────────────────────────────────────
    await createAuditLog({
      tableName: TABLE,
      recordId: data?.id,
      action: "CREATE",
      newData: sanitizeForAudit({ ...data, invited: wantsInvite, invite_email_sent: inviteEmail?.sent ?? null }),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

      // The profile row has no email column; the auth user does.
      return NextResponse.json(
        mapKeysToCamel({ ...data, email: authEmail, inviteEmail }),
        { status: 201 },
      );
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in POST /api/admin/${TABLE}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Styled invite mail. The link is generated by Supabase, the delivery by Brevo. */
function staffInviteEmail(actionLink: string): string {
  return `
  <div style="background:#faf7f2;padding:32px;font-family:Georgia,'Times New Roman',serif;color:#2b2b2b">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e8e0d4;padding:32px">
      <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b08d57;margin:0 0 12px">Kivara · Staff console</p>
      <h1 style="font-size:22px;margin:0 0 16px;font-weight:normal">You have been invited</h1>
      <p style="font-size:14px;line-height:1.6">An administrator created a staff account for this address. Set a password to activate it.</p>
      <p style="margin:24px 0">
        <a href="${actionLink}" style="background:#2b2b2b;color:#faf7f2;padding:12px 20px;text-decoration:none;font-size:14px">Set your password</a>
      </p>
      <p style="font-size:12px;color:#6b6b6b;line-height:1.6">This link expires in 24 hours. If you were not expecting this invitation, ignore this email.</p>
    </div>
  </div>`;
}
