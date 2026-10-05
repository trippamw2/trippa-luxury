/**
 * Automatic accounting for model spend.
 *
 * `callLlm` is the single choke point every model call passes through (that is
 * where the governance kill switch is enforced). Recording usage here is
 * deliberate: it means a route cannot spend money without that spend being
 * recorded, because the code that spends it is the code that reports it. The
 * previous arrangement — call sites POSTing their own token counts to
 * /api/admin/agent-evaluation — could only ever report the calls someone
 * remembered to report.
 *
 * Two rules govern this module:
 *
 * 1. **It never breaks a model call.** A guest-facing request does not fail
 *    because a bookkeeping insert did. Errors are logged and swallowed, which is
 *    the same contract `action-gate.ts` uses for its ledger writes.
 * 2. **It measures, it does not authorize.** Nothing here decides whether a call
 *    was allowed. That is the kill switch's job in `llm.ts`. Keeping measurement
 *    and permission separate means a broken ledger can never accidentally grant
 *    or deny authority.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type { LlmResponse } from "@/lib/ai/llm";

/**
 * Per-1K-token rates in USD, used only to turn a token count into a comparable
 * number. These mirror the constants in `agent-evaluation.ts`; they are a rough
 * planning figure, NOT billing truth (the provider invoice is). Keeping one rate
 * pair rather than a per-model table is an honesty choice: a confident-looking
 * table of per-model prices would drift as providers change them, and a wrong
 * number in a cost report is worse than an acknowledged approximation. Verify
 * these against current provider pricing before using them for anything financial.
 */
const USD_PER_1K_PROMPT = 0.00015;
const USD_PER_1K_COMPLETION = 0.0006;

export interface LlmUsageRecord {
  /** The provider that actually answered, not the one that was tried first. */
  provider: string;
  /** The model that actually ran, as reported in the response. */
  model: string;
  /** Token counts exactly as the provider reported them. */
  usage: NonNullable<LlmResponse["usage"]> | undefined;
  /** Wall-clock duration of the call in milliseconds. */
  latencyMs?: number;
}

/** Convert provider token counts into a comparable USD figure. */
export function estimateCostUsd(
  usage: NonNullable<LlmResponse["usage"]> | undefined
): number {
  if (!usage) return 0;
  return (
    (usage.promptTokens / 1000) * USD_PER_1K_PROMPT +
    (usage.completionTokens / 1000) * USD_PER_1K_COMPLETION
  );
}

/**
 * Persist one successful model call to the `llm_call_usage` ledger.
 *
 * Never throws. A failure here means a call went unmeasured, which is worth
 * logging loudly, but it must not propagate into the caller and turn a working
 * product path into an error response.
 */
export async function recordLlmUsage(record: LlmUsageRecord): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("llm_call_usage").insert({
      provider: record.provider,
      model: record.model,
      prompt_tokens: record.usage?.promptTokens ?? 0,
      completion_tokens: record.usage?.completionTokens ?? 0,
      total_tokens: record.usage?.totalTokens ?? 0,
      estimated_cost_usd: estimateCostUsd(record.usage),
      latency_ms: record.latencyMs ?? null,
    });

    if (error) {
      console.error("LLM usage ledger write failed:", error.message);
    }
  } catch (err) {
    // createAdminClient throws when env vars are absent (e.g. a build step or a
    // test). That is the ledger being unavailable, not the model call failing.
    console.error(
      "LLM usage ledger unavailable:",
      err instanceof Error ? err.message : String(err)
    );
  }
}