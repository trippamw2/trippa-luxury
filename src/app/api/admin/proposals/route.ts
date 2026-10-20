import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleCreate, joinSingle, mapKeysToCamel, mapKeysToSnake } from "@/lib/api-helpers";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

const TABLE = "proposals";

/**
 * customer_name / journey_name are not columns on `proposals` - the admin UI
 * displays both, so they are resolved through the lead and journey relations
 * here instead of being faked client-side.
 */
const SELECT_WITH_RELATIONS =
  "id, proposal_reference, title, slug, status, total_investment, deposit_amount, balance_amount, currency, sent_date, viewed_date, accepted_date, expiry_date, sent_to_email, cover_image, created_at, updated_at, lead_id, journey_id, customer_id, leads(full_name), journeys(journey_name)";

type ProposalRow = Record<string, unknown> & {
  leads?: { full_name?: string } | null;
  journeys?: { journey_name?: string } | null;
};

function mapRow(item: ProposalRow) {
  return {
    ...mapKeysToCamel(item),
    customerName: joinSingle(item.leads)?.full_name ?? null,
    journeyName: joinSingle(item.journeys)?.journey_name ?? null,
  };
}

/**
 * Real, client-settable `proposals` columns. Everything else in the body is
 * dropped rather than forwarded to PostgREST, so a stray key can never abort
 * the insert. Server-managed columns (`id`, `created_at`, `updated_at`,
 * `created_by`) and `proposal_reference` are deliberately absent - the
 * reference is allocated separately below because it is UNIQUE NOT NULL.
 */
const PROPOSAL_INSERTABLE_COLUMNS = [
  "title",
  "slug",
  "journey_id",
  "customer_id",
  "lead_id",
  "journey_summary",
  "itinerary_description",
  "accommodation",
  "experiences",
  "inclusions",
  "exclusions",
  "important_notes",
  "terms_and_conditions",
  "kivara_contact_details",
  "total_investment",
  "deposit_amount",
  "balance_amount",
  "currency",
  "payment_terms",
  "cancellation_terms",
  "supplier_cost",
  "gross_profit",
  "gross_margin",
  "commission",
  "status",
  "expiry_date",
  "sent_to_email",
  "cover_image",
  "branding",
] as const;

/**
 * `proposal_reference` is UNIQUE NOT NULL with no default, so it is allocated
 * here rather than by the client. The old form used Math.random() in the
 * browser, which could collide and had no way to retry. Returns null only if
 * every attempt is already taken.
 */
async function nextProposalReference(): Promise<string | null> {
  const supabase = createAdminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = `KIV-${Math.floor(100000 + Math.random() * 900000)}`;
    const { data, error } = await supabase
      .from(TABLE)
      .select("id")
      .eq("proposal_reference", reference)
      .limit(1);
    // If the probe itself fails, hand the reference to the insert and let it
    // surface the real error rather than swallowing it here.
    if (error || !data || data.length === 0) return reference;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    // Same guard handleGetList("proposals") applied via TABLE_AUTH.
    await requireAdmin({ module: "proposals", minRole: "agent" });
    const supabase = createAdminClient();

    const limitParam = new URL(request.url).searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    let query = supabase
      .from(TABLE)
      .select(SELECT_WITH_RELATIONS, { count: "exact" })
      .order("created_at", { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching proposals:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: (data || []).map((row) => mapRow(row as ProposalRow)),
      count: count || 0,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/proposals:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Accept camelCase or snake_case input, then let the allowlist below work on
  // the canonical column names.
  const input = mapKeysToSnake<Record<string, unknown>>(body);

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "A proposal title is required." }, { status: 400 });
  }

  // Only real `proposals` columns are insertable. The admin form used to send
  // `customer_name` / `journey_name`, which are not columns at all — they are
  // resolved from the `leads` / `journeys` joins on read — so PostgREST
  // rejected the insert before it ever reached the table.
  const payload: Record<string, unknown> = {};
  for (const key of PROPOSAL_INSERTABLE_COLUMNS) {
    if (input[key] !== undefined && input[key] !== null) {
      payload[key] = input[key];
    }
  }
  payload.title = title;
  if (payload.status === undefined) payload.status = "draft";

  if (typeof payload.proposal_reference === "string" && payload.proposal_reference.trim()) {
    payload.proposal_reference = payload.proposal_reference.trim();
  } else {
    const reference = await nextProposalReference();
    if (!reference) {
      return NextResponse.json(
        { error: "Could not allocate a unique proposal reference. Please try again." },
        { status: 409 }
      );
    }
    payload.proposal_reference = reference;
  }

  return handleCreate(TABLE, payload, request);
}
