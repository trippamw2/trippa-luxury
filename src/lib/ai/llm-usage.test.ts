/**
 * Automatic spend recording.
 *
 * The behaviour worth protecting is not "a row is written" but "a row cannot be
 * skipped": `callLlm` records at the choke point, so a call site cannot opt out
 * by forgetting to report. These tests pin that, and pin the other half of the
 * contract — bookkeeping that breaks a working product path would be worse than
 * no bookkeeping at all.
 */
const h = vi.hoisted(() => ({
  inserts: [] as Array<Record<string, unknown>>,
  insertError: null as unknown,
  adminThrows: false,
  governance: { llmEnabled: true } as { llmEnabled: boolean },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    if (h.adminThrows) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
    return {
      from: (table: string) => ({
        insert: (row: Record<string, unknown>) => {
          if (h.insertError) return Promise.resolve({ error: h.insertError });
          h.inserts.push({ table, ...row });
          return Promise.resolve({ error: null });
        },
      }),
    };
  },
}));

vi.mock("@/lib/ai/governance-settings", () => ({
  getGovernanceSettings: () => Promise.resolve(h.governance),
}));

import { estimateCostUsd, recordLlmUsage } from "@/lib/ai/llm-usage";

/** Let the fire-and-forget recording promise settle before asserting on it. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const USAGE = { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 };

beforeEach(() => {
  h.inserts = [];
  h.insertError = null;
  h.adminThrows = false;
  h.governance = { llmEnabled: true };
  vi.restoreAllMocks();
});

describe("estimateCostUsd", () => {
  it("prices prompt and completion tokens separately", () => {
    // Prompt and completion are billed at very different rates, so a single rate
    // would materially misstate cost. This mirrors agent-evaluation.ts.
    expect(estimateCostUsd(USAGE)).toBeCloseTo(1000 / 1000 * 0.00015 + 500 / 1000 * 0.0006, 10);
  });

  it("reports zero rather than throwing when the provider sent no usage", () => {
    // Not every provider response carries token counts. Unmeasured must be a
    // number in the ledger, never a crash on the recording path.
    expect(estimateCostUsd(undefined)).toBe(0);
  });
});

describe("recordLlmUsage", () => {
  it("writes provider, model, tokens, cost and latency", async () => {
    await recordLlmUsage({
      provider: "gemini",
      model: "gemini-2.5-flash",
      usage: USAGE,
      latencyMs: 812,
    });

    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0]).toMatchObject({
      table: "llm_call_usage",
      provider: "gemini",
      model: "gemini-2.5-flash",
      prompt_tokens: 1000,
      completion_tokens: 500,
      total_tokens: 1500,
      latency_ms: 812,
    });
    expect(h.inserts[0].estimated_cost_usd).toBeCloseTo(
      1000 / 1000 * 0.00015 + 500 / 1000 * 0.0006,
      10
    );
  });

  it("records a call with no reported usage instead of dropping it", async () => {
    // A provider that returns no usage block still consumed the call. Dropping
    // the row would let a real call be invisible, which is the bug this module
    // exists to close.
    await recordLlmUsage({ provider: "deepseek", model: "deepseek-chat", usage: undefined });
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0]).toMatchObject({ prompt_tokens: 0, total_tokens: 0, latency_ms: null });
  });

  it("does not throw when the insert fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    h.insertError = { message: "relation does not exist" };

    await expect(
      recordLlmUsage({ provider: "gemini", model: "m", usage: USAGE })
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
  });

  it("does not throw when the admin client is unavailable", async () => {
    // This is the build/test/no-env case. Unmeasured spend is a problem to log,
    // not a reason to fail the request that spent it.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    h.adminThrows = true;

    await expect(
      recordLlmUsage({ provider: "gemini", model: "m", usage: USAGE })
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
  });
});

describe("callLlm records spend automatically", () => {
  const providerBody = {
    choices: [{ message: { content: "hello", role: "assistant" }, finish_reason: "stop" }],
    model: "deepseek-chat",
    usage: { prompt_tokens: 120, completion_tokens: 80, total_tokens: 200 },
  };

  it("writes a usage row without the caller asking for one", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => providerBody,
      })
    );

    const { callLlm } = await import("@/lib/ai/llm");
    const response = await callLlm([{ role: "user", content: "hi" }]);

    expect(response.content).toBe("hello");
    await flush();

    // The point of the whole exercise: the caller did nothing to cause this row.
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0]).toMatchObject({
      table: "llm_call_usage",
      model: "deepseek-chat",
      total_tokens: 200,
    });
    expect(typeof h.inserts[0].latency_ms).toBe("number");

    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("still returns the answer when the ledger write fails", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => providerBody })
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    h.insertError = { message: "insert failed" };

    const { callLlm } = await import("@/lib/ai/llm");
    const response = await callLlm([{ role: "user", content: "hi" }]);

    expect(response.content).toBe("hello");
    await flush();
    expect(h.inserts).toHaveLength(0);

    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
});