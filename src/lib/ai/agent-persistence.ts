// src/lib/ai/agent-persistence.ts
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_SCOPES = new Set([
  "client", "journey", "supplier", "destination", "commercial", "operational", "brand", "moat",
]);

export interface PersistAgentReportInput {
  agent: string;
  scope: string;
  title: string;
  statement: string;
  report: Record<string, unknown>;
}

export async function persistAgentReport(input: PersistAgentReportInput): Promise<{ inserted: boolean; error?: string }> {
  if (!VALID_SCOPES.has(input.scope)) {
    return { inserted: false, error: "invalid_scope" };
  }
  try {
    const supabase = createAdminClient();

    // Dedupe: skip when an insights row with same agent+title exists newer than 24h.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("insights")
      .select("id")
      .eq("agent", input.agent)
      .eq("title", input.title)
      .gte("created_at", since)
      .limit(1);
    if (existing && existing.length > 0) {
      return { inserted: false };
    }

    const { error } = await supabase.from("insights").insert({
      scope: input.scope,
      title: input.title,
      statement: input.statement,
      source: "agent",
      agent: input.agent,
      report: input.report,
    });
    if (error) {
      console.error("persistAgentReport insert failed:", error.message);
      return { inserted: false, error: error.message };
    }
    return { inserted: true };
  } catch (err) {
    return { inserted: false, error: err instanceof Error ? err.message : "unknown" };
  }
}