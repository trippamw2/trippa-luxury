import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ─────────────────────────────────────────────────────────────────
// The settings store is the only I/O here, so a small hand-rolled client keeps
// these tests honest about *what was asked of the database*, which is what the
// precedence rules actually depend on.
const h = vi.hoisted(() => ({
  rows: [] as Array<{ key: string; value: string }>,
  selectError: null as unknown,
  upsertError: null as unknown,
  selectKeyFilters: [] as string[][],
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (_table: string) => ({
      select: (_columns: string) => ({
        in: (_column: string, keys: string[]) => {
          h.selectKeyFilters.push(keys);
          if (h.selectError) return Promise.resolve({ data: null, error: h.selectError });
          return Promise.resolve({
            data: h.rows.filter((row) => keys.includes(row.key)),
            error: null,
          });
        },
      }),
      upsert: (rows: Array<{ key: string; value: string }>) => {
        if (h.upsertError) return Promise.resolve({ error: h.upsertError });
        for (const row of rows) {
          const index = h.rows.findIndex((existing) => existing.key === row.key);
          if (index >= 0) h.rows[index] = row;
          else h.rows.push(row);
        }
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

import {
  DEFAULT_GOVERNANCE_SETTINGS,
  GOVERNANCE_CACHE_TTL_MS,
  GOVERNANCE_DOC_VERSION,
  GOVERNANCE_RATIFICATION_PHRASE,
  getGovernanceSettings,
  isRatificationStale,
  isRatified,
  parseBooleanFlag,
  ratifyGovernance,
  resetGovernanceCache,
  setGovernanceSettings,
} from "@/lib/ai/governance-settings";

const ENV_KEYS = [
  "GOVERNANCE_LLM_ENABLED",
  "GOVERNANCE_AUTONOMY_LEVEL",
  "GOVERNANCE_AI_OUTBOUND_ENABLED",
  "GOVERNANCE_AI_INTERNAL_WRITES_ENABLED",
];

/** Store a raw settings row, bypassing any coercion, as a real deployment would. */
function store(key: string, value: string): void {
  h.rows.push({ key, value });
}

beforeEach(() => {
  h.rows = [];
  h.selectError = null;
  h.upsertError = null;
  h.selectKeyFilters = [];
  resetGovernanceCache();
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("parseBooleanFlag", () => {
  it("treats the explicit off-switches as false", () => {
    for (const raw of ["false", "0", "off", "no", "FALSE", " Off "]) {
      expect(parseBooleanFlag(raw, true)).toBe(false);
    }
  });

  it("treats the explicit on-switches as true", () => {
    for (const raw of ["true", "1", "on", "yes", "YES"]) {
      expect(parseBooleanFlag(raw, false)).toBe(true);
    }
  });

  it("falls back rather than guessing on nonsense", () => {
    // An operator typo must not silently disable a safety switch, nor silently
    // re-enable one they were trying to turn off. Fall back and let them look.
    expect(parseBooleanFlag("maybe", true)).toBe(true);
    expect(parseBooleanFlag("maybe", false)).toBe(false);
    expect(parseBooleanFlag("", true)).toBe(true);
    expect(parseBooleanFlag(null, false)).toBe(false);
    expect(parseBooleanFlag(undefined, true)).toBe(true);
  });

  it("passes booleans through", () => {
    expect(parseBooleanFlag(false, true)).toBe(false);
    expect(parseBooleanFlag(true, false)).toBe(true);
  });
});

describe("getGovernanceSettings", () => {
  it("returns conservative defaults when nothing is stored", async () => {
    const settings = await getGovernanceSettings();
    expect(settings.autonomyLevel).toBe(DEFAULT_GOVERNANCE_SETTINGS.autonomyLevel);
    expect(settings.llmEnabled).toBe(true);
    expect(settings.outboundEnabled).toBe(true);
    expect(settings.internalWritesEnabled).toBe(true);
    expect(settings.ratifiedAt).toBeNull();
    expect(settings.ratifiedBy).toBeNull();
    expect(settings.ratifiedDocVersion).toBeNull();
  });

  it("reads the operator's stored dial", async () => {
    store("governance.autonomy_level", "1");
    store("governance.llm_enabled", "false");
    store("governance.ai_internal_writes_enabled", "off");

    const settings = await getGovernanceSettings();
    expect(settings.autonomyLevel).toBe(1);
    expect(settings.llmEnabled).toBe(false);
    expect(settings.internalWritesEnabled).toBe(false);
  });

  it("honours level 0 stored as a string", async () => {
    // "0" is a real dial position, not an absent value. Getting this wrong would
    // silently run the company at full autonomy after an operator locked it down.
    store("governance.autonomy_level", "0");
    expect((await getGovernanceSettings()).autonomyLevel).toBe(0);
  });

  it("clamps an out-of-range dial instead of trusting it", async () => {
    store("governance.autonomy_level", "9");
    expect((await getGovernanceSettings()).autonomyLevel).toBe(4);
  });

  it("falls back to the default for an unparseable dial", async () => {
    store("governance.autonomy_level", "banana");
    expect((await getGovernanceSettings()).autonomyLevel).toBe(
      DEFAULT_GOVERNANCE_SETTINGS.autonomyLevel
    );
  });

  it("degrades to defaults instead of throwing when the store fails", async () => {
    // Availability over exactness: a settings hiccup must not take inquiry and
    // booking off the air.
    h.selectError = new Error("connection refused");
    const settings = await getGovernanceSettings();
    expect(settings.autonomyLevel).toBe(DEFAULT_GOVERNANCE_SETTINGS.autonomyLevel);
    expect(settings.llmEnabled).toBe(true);
  });

  it("caches within the TTL and re-reads after it", async () => {
    store("governance.autonomy_level", "1");

    await getGovernanceSettings({ nowMs: 1_000 });
    expect(h.selectKeyFilters).toHaveLength(1);

    // Inside the window the stored value is served without another query.
    store("governance.autonomy_level", "3");
    expect((await getGovernanceSettings({ nowMs: 1_000 + GOVERNANCE_CACHE_TTL_MS - 1 })).autonomyLevel).toBe(1);
    expect(h.selectKeyFilters).toHaveLength(1);

    // Once the window lapses the change is visible.
    expect((await getGovernanceSettings({ nowMs: 1_000 + GOVERNANCE_CACHE_TTL_MS })).autonomyLevel).toBe(3);
    expect(h.selectKeyFilters).toHaveLength(2);
  });

  it("requests only the governance keys it owns", async () => {
    await getGovernanceSettings();
    const requested = h.selectKeyFilters[0];
    expect(requested).toContain("governance.autonomy_level");
    expect(requested).toContain("governance.llm_enabled");
    expect(requested).toContain("governance.ratified_at");
    // Must not sweep up unrelated site settings.
    expect(requested.every((key) => key.startsWith("governance."))).toBe(true);
  });
});

describe("environment overrides", () => {
  it("overrides the stored value, because a deploy is the emergency lever", async () => {
    store("governance.llm_enabled", "true");
    process.env.GOVERNANCE_LLM_ENABLED = "false";

    const settings = await getGovernanceSettings();
    expect(settings.llmEnabled).toBe(false);
    expect(settings.envOverride).toBe(true);
  });

  it("treats an env dial of 0 as a real position", async () => {
    // The exact trap `coerceAutonomyLevel` guards against for "" and null.
    store("governance.autonomy_level", "3");
    process.env.GOVERNANCE_AUTONOMY_LEVEL = "0";

    const settings = await getGovernanceSettings();
    expect(settings.autonomyLevel).toBe(0);
    expect(settings.envOverride).toBe(true);
  });

  it("reports no override when the environment is silent", async () => {
    store("governance.autonomy_level", "1");
    const settings = await getGovernanceSettings();
    expect(settings.envOverride).toBe(false);
    expect(settings.autonomyLevel).toBe(1);
  });

  it("applies overrides even to a cached read", async () => {
    const settings = { ...DEFAULT_GOVERNANCE_SETTINGS, llmEnabled: true };
    expect(settings.llmEnabled).toBe(true);

    await getGovernanceSettings();
    process.env.GOVERNANCE_LLM_ENABLED = "false";
    // Pulling an incident lever must not wait out a cache window.
    expect((await getGovernanceSettings()).llmEnabled).toBe(false);
  });

  it("overrides outbound and internal-write switches independently", async () => {
    process.env.GOVERNANCE_AI_OUTBOUND_ENABLED = "false";
    process.env.GOVERNANCE_AI_INTERNAL_WRITES_ENABLED = "true";

    const settings = await getGovernanceSettings();
    expect(settings.outboundEnabled).toBe(false);
    expect(settings.internalWritesEnabled).toBe(true);
  });
});

describe("setGovernanceSettings", () => {
  it("persists the dial and attributes the change", async () => {
    const settings = await setGovernanceSettings(
      { autonomyLevel: 3, llmEnabled: false },
      { performedBy: "admin-uuid" }
    );

    expect(settings.autonomyLevel).toBe(3);
    expect(settings.llmEnabled).toBe(false);
    expect(settings.updatedBy).toBe("admin-uuid");
    expect(settings.updatedAt).not.toBeNull();
    expect(h.rows.find((row) => row.key === "governance.autonomy_level")?.value).toBe("3");
  });

  it("leaves unspecified switches alone", async () => {
    await setGovernanceSettings({ llmEnabled: false });
    const settings = await setGovernanceSettings({ autonomyLevel: 1 });

    expect(settings.autonomyLevel).toBe(1);
    expect(settings.llmEnabled).toBe(false);
  });

  it("invalidates the cache so a new dial takes effect immediately", async () => {
    store("governance.autonomy_level", "1");
    expect((await getGovernanceSettings()).autonomyLevel).toBe(1);

    await setGovernanceSettings({ autonomyLevel: 3 });

    // The read after the write must not serve the superseded dial.
    expect((await getGovernanceSettings()).autonomyLevel).toBe(3);
  });

  it("preserves an existing ratification when the dial moves", async () => {
    // Regression guard. Moving the dial is an operating decision, not a
    // constitutional one; it must not quietly discard a human sign-off.
    store("governance.ratified_at", "2026-01-01T00:00:00.000Z");
    store("governance.ratified_by", "founder-uuid");
    store("governance.ratified_doc_version", String(GOVERNANCE_DOC_VERSION));

    const settings = await setGovernanceSettings({ autonomyLevel: 1 });

    expect(settings.ratifiedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(settings.ratifiedBy).toBe("founder-uuid");
    expect(settings.ratifiedDocVersion).toBe(GOVERNANCE_DOC_VERSION);
    expect(await isRatified()).toBe(true);
  });
});

describe("ratification", () => {
  it("refuses to ratify without the exact acknowledgement", async () => {
    await expect(ratifyGovernance({ acknowledgement: "yes" })).rejects.toThrow(
      /explicit acknowledgement/
    );
    await expect(ratifyGovernance({})).rejects.toThrow(/explicit acknowledgement/);
    expect(await isRatified()).toBe(false);
  });

  it("records who signed off, when, and which version", async () => {
    const result = await ratifyGovernance({
      performedBy: "founder-uuid",
      acknowledgement: GOVERNANCE_RATIFICATION_PHRASE,
    });

    expect(result.firstRatification).toBe(true);
    expect(result.reRatification).toBe(false);
    expect(result.settings.ratifiedBy).toBe("founder-uuid");
    expect(result.settings.ratifiedDocVersion).toBe(GOVERNANCE_DOC_VERSION);
    expect(result.settings.ratifiedAt).not.toBeNull();
    expect(await isRatified()).toBe(true);
  });

  it("treats a second sign-off as a re-ratification", async () => {
    await ratifyGovernance({ acknowledgement: GOVERNANCE_RATIFICATION_PHRASE });
    const second = await ratifyGovernance({
      performedBy: "second-admin",
      acknowledgement: GOVERNANCE_RATIFICATION_PHRASE,
    });

    expect(second.firstRatification).toBe(false);
    expect(second.reRatification).toBe(true);
    expect(second.settings.ratifiedBy).toBe("second-admin");
  });

  it("is not ratified until a human signs", async () => {
    // Reading the constitution, or starting the app, must never ratify it.
    await getGovernanceSettings();
    await setGovernanceSettings({ autonomyLevel: 3 });
    expect(await isRatified()).toBe(false);
  });

  it("reports a sign-off against an older document as stale, not ratified", async () => {
    store("governance.ratified_at", "2026-01-01T00:00:00.000Z");
    store("governance.ratified_doc_version", String(GOVERNANCE_DOC_VERSION - 1));

    expect(await isRatified()).toBe(false);
    expect(await isRatificationStale()).toBe(true);
  });

  it("is not stale before any sign-off exists", async () => {
    expect(await isRatificationStale()).toBe(false);
  });
});