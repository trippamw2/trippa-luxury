import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";
import { mapKeysToCamel } from "@/lib/api-helpers";
import { partnershipAgent, type PartnerCandidate } from "@/lib/ai/partnership-agent";

const TABLE = "partnerships";
const CATEGORIES = ["hotel", "dmc", "brand", "airline", "media", "other"] as const;
const STATUSES = ["prospect", "active", "paused", "declined"] as const;

/**
 * GET  /api/admin/partnerships - list partner records.
 * POST /api/admin/partnerships
 *   `{ candidates: [...] }` scores candidates for strategic fit (AI agent).
 *   Any other body creates a partner record.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin({ module: "suppliers", minRole: "agent" });
    const status = new URL(request.url).searchParams.get("status");
    const supabase = createAdminClient();

    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(500);

    if (status && (STATUSES as readonly string[]).includes(status)) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error(`Error fetching ${TABLE}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: mapKeysToCamel(data ?? []), count: count ?? 0 });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/partnerships:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin({ module: "suppliers", minRole: "editor" });
    const body = await request.json();

    if (Array.isArray(body?.candidates) && body.candidates.length > 0) {
      const scores = await partnershipAgent.evaluate(body.candidates as PartnerCandidate[]);
      return NextResponse.json({ scores });
    }

    const partnerName = typeof body?.partnerName === "string" ? body.partnerName.trim() : "";
    const category = typeof body?.category === "string" ? body.category : "hotel";
    const status = typeof body?.status === "string" ? body.status : "prospect";

    if (!partnerName) {
      return NextResponse.json({ error: "Partner name is required" }, { status: 400 });
    }
    if (!(CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json({ error: `Unknown category: ${category}` }, { status: 400 });
    }
    if (!(STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: `Unknown status: ${status}` }, { status: 400 });
    }

    const fitScore = body?.fitScore === null || body?.fitScore === undefined || body?.fitScore === ""
      ? null
      : Number(body.fitScore);
    if (fitScore !== null && (!Number.isFinite(fitScore) || fitScore < 0 || fitScore > 100)) {
      return NextResponse.json({ error: "Fit score must be between 0 and 100" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        partner_name: partnerName,
        category,
        status,
        contact_name: typeof body?.contactName === "string" ? body.contactName.trim() || null : null,
        contact_email: typeof body?.contactEmail === "string" ? body.contactEmail.trim() || null : null,
        country: typeof body?.country === "string" ? body.country.trim() || null : null,
        fit_score: fitScore,
        notes: typeof body?.notes === "string" ? body.notes.trim() || null : null,
        source: typeof body?.source === "string" ? body.source.trim() || null : null,
        created_by: auth.profile.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "That partner already exists in this category" },
          { status: 409 }
        );
      }
      console.error(`Error creating ${TABLE}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await createAuditLog({
      tableName: TABLE,
      recordId: data.id,
      action: "CREATE",
      newData: sanitizeForAudit(data),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json(mapKeysToCamel(data), { status: 201 });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in POST /api/admin/partnerships:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
