// ─── Kivara Learning Layer ───────────────────────────────────────────────────
// Turns Kivara's accumulated institutional memory into prompt-time context and
// captures new lessons from outcomes, so every LLM call is grounded in what
// has actually worked before.
//
// This is retrieval-augmented learning, not weight updates: the underlying
// models are unchanged, but each call receives the relevant past lessons
// (successful proposals, completed trips, guest feedback, supplier outcomes)
// as few-shot context, and new lessons are persisted for future calls.
//
// Two responsibilities:
//   1. retrieveLessons(domain, query) — fetch the most relevant recent lessons
//      from the `insights` table (and high-value JOURNEY_LEARNED events).
//   2. recordLesson(...) — persist a new lesson, deduped against recent ones.
//
// Nothing here throws: a learning-store blip must never fail an LLM call.

import { createAdminClient } from "@/lib/supabase/admin";
import { persistAgentReport } from "./agent-persistence";

export type LearningDomain =
  | "travel"
  | "journey"
  | "supplier"
  | "customer"
  | "marketing"
  | "finance"
  | "operations"
  | "general";

const SCOPE_BY_DOMAIN: Record<LearningDomain, string> = {
  travel: "destination",
  journey: "journey",
  supplier: "supplier",
  customer: "client",
  marketing: "commercial",
  finance: "commercial",
  operations: "operational",
  general: "brand",
};

export interface Lesson {
  id?: string;
  domain: LearningDomain;
  title: string;
  statement: string;
  createdAt?: string;
}

const MAX_LESSONS = 6;
const MAX_STATEMENT_CHARS = 400;

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

/**
 * Fetch the most recent lessons for a domain. Falls back to cross-domain
 * lessons when the domain has none, so a cold start still benefits from
 * whatever institutional memory exists.
 */
export async function retrieveLessons(
  domain: LearningDomain = "general",
  limit: number = MAX_LESSONS
): Promise<Lesson[]> {
  try {
    const supabase = createAdminClient();
    const scope = SCOPE_BY_DOMAIN[domain];

    // Primary: lessons scoped to this domain.
    const { data: scoped } = await supabase
      .from("insights")
      .select("id, title, statement, created_at, scope")
      .eq("source", "agent")
      .eq("scope", scope)
      .order("created_at", { ascending: false })
      .limit(limit);

    let rows = scoped ?? [];
    if (rows.length === 0 && domain !== "general") {
      // Fall back to any agent insight so early deployments still learn.
      const { data: anyRows } = await supabase
        .from("insights")
        .select("id, title, statement, created_at, scope")
        .eq("source", "agent")
        .order("created_at", { ascending: false })
        .limit(limit);
      rows = anyRows ?? [];
    }

    return rows.map((r: Record<string, unknown>) => ({
      id: typeof r.id === "string" ? r.id : undefined,
      domain,
      title: String(r.title ?? ""),
      statement: truncate(String(r.statement ?? ""), MAX_STATEMENT_CHARS),
      createdAt: typeof r.created_at === "string" ? r.created_at : undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Persist a new lesson. Deduped by agent+title within 24h (handled by
 * persistAgentReport). Never throws.
 */
export async function recordLesson(input: {
  domain: LearningDomain;
  agent: string;
  title: string;
  statement: string;
  report?: Record<string, unknown>;
}): Promise<{ inserted: boolean; error?: string }> {
  try {
    return await persistAgentReport({
      agent: input.agent,
      scope: SCOPE_BY_DOMAIN[input.domain],
      title: input.title,
      statement: input.statement,
      report: input.report ?? { domain: input.domain, recordedAt: new Date().toISOString() },
    });
  } catch (err) {
    return { inserted: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

/**
 * Render lessons as a compact few-shot block for injection into a prompt.
 * Returns an empty string when there are no lessons, so callers can append
 * it unconditionally.
 */
export function formatLessonsForPrompt(lessons: Lesson[]): string {
  if (lessons.length === 0) return "";
  const lines = lessons.map((l, i) => `${i + 1}. ${l.title}: ${l.statement}`);
  return [
    "## Learned from past Kivara outcomes",
    "Apply these when they are relevant; ignore them when they are not.",
    ...lines,
  ].join("\n");
}

/**
 * Build the KIVARA LLM identity block. Always present so every call is
 * branded and constrained to Kivara's domain.
 */
export function kivaraIdentity(domain: LearningDomain = "general"): string {
  return [
    "You are KIVARA LLM, the intelligence layer for Kivara — a luxury romance travel company.",
    "You specialise in travel experience design, guest profiling, proposal writing, supplier matching, marketing copy, and operational planning.",
    "You are warm, precise, and on-brand. You never invent prices, availability, or supplier commitments; you only use the data provided.",
    `Current focus domain: ${domain}.`,
  ].join(" ");
}
