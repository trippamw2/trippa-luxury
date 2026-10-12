import { NextRequest, NextResponse } from "next/server";
import { handleGetList, handleCreate, mapKeysToCamel } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { ilikeSubstring } from "@/lib/postgrest-filter";
import {
  registerJourneyFromSavedJourney,
  registerSupplierMatchesForJourney,
  registerJourneyPricing,
} from "@/lib/pipeline/register";

const TABLE = "saved_journeys";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin({ module: "journeys", minRole: "editor" });
    const url = new URL(request.url);
    const search = url.searchParams.get("search");

    if (search) {
      // Support searching by guest name or email
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from(TABLE)
        .select("*", { count: "exact" })
        .or(`guest_name.ilike.${ilikeSubstring(search)},guest_email.ilike.${ilikeSubstring(search)}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error searching journeys:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        data: mapKeysToCamel(data || []),
        count: data?.length || 0,
      });
    }

    return handleGetList(TABLE, request, { orderBy: { column: "created_at", direction: "desc" } });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/journeys:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const inquiryId =
    typeof body.inquiryId === "string" && body.inquiryId ? body.inquiryId : null;

  const response = await handleCreate(TABLE, body);
  if (response.status !== 201) return response;

  const created = await response.clone().json();

  if (created?.id) {
    // Automated pipeline: saved journey -> operational journey + itinerary +
    // proposal draft -> supplier match + margin pricing. Never fails the
    // save; each step is best-effort and returns its own errors for logging.
    const pipelineErrors: string[] = [];
    const result = await registerJourneyFromSavedJourney(created.id, { inquiryId });
    if (result.error) {
      pipelineErrors.push(`journey: ${result.error}`);
      console.error("Journey registration issue:", result.error);
    }

    let proposalId: string | null = result.proposalId;
    let supplierMatchCount = 0;
    let totalSupplierCost = 0;
    let grossProfit = 0;
    let grossMargin = 0;

    if (result.journeyId) {
      const supplierMatch = await registerSupplierMatchesForJourney(result.journeyId, {
        correlationId: inquiryId,
      });
      supplierMatchCount = supplierMatch.matchedCount;
      if (supplierMatch.error) {
        pipelineErrors.push(`suppliers: ${supplierMatch.error}`);
        console.error("Supplier match issue:", supplierMatch.error);
      }

      const pricing = await registerJourneyPricing(result.journeyId, { correlationId: inquiryId });
      proposalId = pricing.proposalId ?? proposalId;
      totalSupplierCost = pricing.totalSupplierCost;
      grossProfit = pricing.grossProfit;
      grossMargin = pricing.grossMargin;
      if (pricing.error) {
        pipelineErrors.push(`pricing: ${pricing.error}`);
        console.error("Journey pricing issue:", pricing.error);
      }
    }

    return NextResponse.json(
      {
        ...created,
        journeyId: result.journeyId,
        proposalId,
        itineraryItemCount: result.itineraryItemCount,
        supplierMatchCount,
        totalSupplierCost,
        grossProfit,
        grossMargin,
        pipelineRegistered: result.registered,
        pipelineError: pipelineErrors.length > 0 ? pipelineErrors.join("; ") : null,
      },
      { status: 201 }
    );
  }

  return response;
}
