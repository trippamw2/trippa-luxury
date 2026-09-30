import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  guestProfiler,
  buildClientDnaRow,
  persistClientDna,
  countEvidence,
  type RawInquiry,
  type ProfiledGuest,
  type ClientDnaSink,
  type ClientDnaInsertRow,
} from "@/lib/ai/guest-profiler";

// ── Mocks ───────────────────────────────────────────────────────────────────
const mockCallLlmJson = vi.fn();
vi.mock("@/lib/ai/llm", () => ({
  callLlmJson: (...args: unknown[]) => mockCallLlmJson(...args),
}));

const VALID_UUID = "3f2a1b4c-5d6e-4f7a-8b9c-0d1e2f3a4b5c";
const OTHER_UUID = "9c8b7a65-4321-4fed-8cba-9876543210fe";

function honeymoonInquiry(): RawInquiry {
  return {
    fullName: "Jane & John",
    email: "jane@example.com",
    destination: "South Luangwa",
    preferredDates: "2026-09-01",
    guests: 2,
    message:
      "We are honeymooning and want a romantic private safari with a luxury resort. " +
      "We love wildlife, game drives, spa and great food. Our budget is unlimited, we want the finest.",
  };
}

/** A profile with every extracted signal stripped, so evidence is genuinely zero. */
function bareProfile(): ProfiledGuest {
  const guest = guestProfiler.profile(honeymoonInquiry());
  guest.extractedDestinations = [];
  guest.extractedPreferences = [];
  guest.preferences.interests = [];
  guest.specialOccasion = undefined;
  return guest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Provenance ──────────────────────────────────────────────────────────────

describe("profiling provenance", () => {
  it("records the rules path as rule-derived", () => {
    expect(guestProfiler.profile(honeymoonInquiry()).profilingMethod).toBe("rules");
  });

  it("records the LLM path and keeps the reasoning it asked the model for", async () => {
    mockCallLlmJson.mockResolvedValue({
      data: {
        isCouple: true,
        specialOccasion: "anniversary",
        travelStyle: "romantic",
        accommodationStyle: "private-villa",
        activityLevel: "low",
        budgetRange: "ultra-luxury",
        destinations: ["zanzibar"],
        interests: ["romantic-moments"],
        leadScore: 71,
        leadTier: "hot",
        extractedPreferences: ["private guide"],
        extractedBudget: "ultra-luxury",
        extractedOccasion: "anniversary",
        reasoning: "Explicitly described a 25th anniversary.",
      },
    });

    const guest = await guestProfiler.llmProfile(honeymoonInquiry());
    expect(guest.profilingMethod).toBe("llm");
    // Previously the model was asked for this and the answer was thrown away.
    expect(guest.reasoning).toBe("Explicitly described a 25th anniversary.");
  });

  it("falls back to the rules path when the LLM fails", async () => {
    mockCallLlmJson.mockRejectedValue(new Error("llm down"));
    const guest = await guestProfiler.llmProfile(honeymoonInquiry());
    // The method must reflect how the profile was ACTUALLY produced, not the
    // path that was attempted — otherwise confidence is attributed wrongly.
    expect(guest.profilingMethod).toBe("rules");
  });
});

// ── Row mapping ─────────────────────────────────────────────────────────────

describe("buildClientDnaRow", () => {
  it("refuses to write when no real UUID subject is supplied", () => {
    // The profiler's own id is a `guest-<timestamp>-<random>` slug; using it
    // would trip client_dna_subject_required, and a slug in the FK column
    // would turn a clear CHECK failure into a confusing FK error.
    const guest = guestProfiler.profile(honeymoonInquiry());
    expect(buildClientDnaRow(guest, {})).toBeNull();
    expect(buildClientDnaRow(guest, { leadId: guest.id })).toBeNull();
    expect(buildClientDnaRow(guest, { guestProfileId: "guest-123-abcd" })).toBeNull();
    expect(buildClientDnaRow(guest, { leadId: null, guestProfileId: undefined })).toBeNull();
  });

  it("accepts a real UUID subject and normalizes its case", () => {
    const guest = guestProfiler.profile(honeymoonInquiry());
    const row = buildClientDnaRow(guest, { leadId: VALID_UUID.toUpperCase() });
    expect(row?.lead_id).toBe(VALID_UUID);
    expect(row?.guest_profile_id).toBeNull();
  });

  it("accepts a guest_profile_id subject", () => {
    const guest = guestProfiler.profile(honeymoonInquiry());
    const row = buildClientDnaRow(guest, { guestProfileId: VALID_UUID });
    expect(row?.guest_profile_id).toBe(VALID_UUID);
    expect(row?.lead_id).toBeNull();
  });

  it("leaves columns it does not measure empty rather than inventing them", () => {
    // constitution §XI: a plausible-looking psychographic number is a
    // fabricated claim. An empty column is honest and fillable later.
    const row = buildClientDnaRow(guestProfiler.profile(honeymoonInquiry()), { leadId: VALID_UUID });
    expect(row?.emotional_drivers).toEqual([]);
    expect(row?.emotional_triggers).toEqual([]);
    expect(row?.privacy_profile).toEqual({});
  });

  it("does not write a lifetime value, because nothing here can support one", () => {
    const row = buildClientDnaRow(guestProfiler.profile(honeymoonInquiry()), { leadId: VALID_UUID });
    // Omitted entirely rather than sent as 0, so "not estimated" is
    // distinguishable from "estimated as worthless".
    expect(row).not.toHaveProperty("estimated_lifetime_value");
  });

  it("keeps purchase intent inside the 0-100 CHECK range", () => {
    const guest = guestProfiler.profile(honeymoonInquiry());
    guest.leadScore = 5000;
    expect(buildClientDnaRow(guest, { leadId: VALID_UUID })?.purchase_intent_score).toBe(100);
    guest.leadScore = -40;
    expect(buildClientDnaRow(guest, { leadId: VALID_UUID })?.purchase_intent_score).toBe(0);
  });

  it("scales confidence by method, never claiming high confidence", () => {
    const rules = guestProfiler.profile(honeymoonInquiry());
    const rulesRow = buildClientDnaRow(rules, { leadId: VALID_UUID });
    expect(rulesRow?.confidence_score).toBe(20);

    const llm: ProfiledGuest = { ...rules, profilingMethod: "llm" };
    const llmRow = buildClientDnaRow(llm, { leadId: VALID_UUID });
    expect(llmRow?.confidence_score).toBe(40);
    // Nothing here has been validated against closed deals yet.
    expect(llmRow!.confidence_score).toBeLessThan(50);
  });

  it("collapses confidence to the floor when there is no evidence at all", () => {
    const row = buildClientDnaRow(bareProfile(), { leadId: VALID_UUID });
    expect(row?.evidence_count).toBe(0);
    expect(row?.confidence_score).toBe(10);
  });

  it("counts only distinct, real signals as evidence", () => {
    const guest = guestProfiler.profile(honeymoonInquiry());
    expect(countEvidence(guest)).toBeGreaterThan(0);
    // Duplicates must not inflate the count into looking well-evidenced.
    guest.preferences.interests = ["wildlife", "wildlife", "wildlife"];
    const expected =
      1 + guest.extractedDestinations.length + guest.extractedPreferences.length + (guest.specialOccasion ? 1 : 0);
    expect(countEvidence(guest)).toBe(expected);
  });

  it("defaults to version 1 and lets the caller bump it", () => {
    const guest = guestProfiler.profile(honeymoonInquiry());
    expect(buildClientDnaRow(guest, { leadId: VALID_UUID })?.version).toBe(1);
    expect(buildClientDnaRow(guest, { leadId: VALID_UUID }, { version: 7 })?.version).toBe(7);
  });

  it("records the occasion as the romance archetype, and nothing when there is none", () => {
    const guest = guestProfiler.profile(honeymoonInquiry());
    expect(guest.specialOccasion).toBe("honeymoon");
    expect(buildClientDnaRow(guest, { leadId: VALID_UUID })?.romance_archetype).toBe("honeymoon");
    // Defaulting this to something flattering would be inventing a label.
    expect(buildClientDnaRow(bareProfile(), { leadId: VALID_UUID })?.romance_archetype).toBeNull();
  });
});

// ── Write path ──────────────────────────────────────────────────────────────

function fakeSink(existing: { id: string; version: number } | null = null) {
  const inserted: ClientDnaInsertRow[] = [];
  const updated: { id: string; row: ClientDnaInsertRow }[] = [];
  const sink: ClientDnaSink = {
    findExisting: () => Promise.resolve({ data: existing, error: null }),
    insert: (row) => {
      inserted.push(row);
      return Promise.resolve({ error: null });
    },
    update: (id, row) => {
      updated.push({ id, row });
      return Promise.resolve({ error: null });
    },
  };
  return { sink, inserted, updated };
}

describe("persistClientDna", () => {
  const guest = () => guestProfiler.profile(honeymoonInquiry());

  it("creates the row when the subject has no DNA yet", async () => {
    const { sink, inserted } = fakeSink(null);
    const outcome = await persistClientDna(guest(), { leadId: VALID_UUID }, sink);
    expect(outcome.ok).toBe(true);
    expect(outcome.action).toBe("created");
    expect(inserted).toHaveLength(1);
    expect(outcome.row?.version).toBe(1);
  });

  it("updates in place and bumps the version on re-profiling", async () => {
    const { sink, inserted, updated } = fakeSink({ id: OTHER_UUID, version: 3 });
    const outcome = await persistClientDna(guest(), { leadId: VALID_UUID }, sink);
    expect(outcome.action).toBe("updated");
    expect(outcome.row?.version).toBe(4);
    expect(updated[0].id).toBe(OTHER_UUID);
    expect(inserted).toHaveLength(0);
  });

  it("skips without error when no writable subject exists", async () => {
    // Failing to remember a profile must not fail the inquiry that produced it,
    // and this is an expected outcome, not an error.
    const { sink, inserted } = fakeSink(null);
    const outcome = await persistClientDna(guest(), {}, sink);
    expect(outcome.ok).toBe(true);
    expect(outcome.action).toBe("skipped");
    expect(outcome.row).toBeNull();
    expect(outcome.error).toBeNull();
    expect(inserted).toHaveLength(0);
  });

  it("returns a lookup failure as data", async () => {
    const sink: ClientDnaSink = {
      findExisting: () => Promise.resolve({ data: null, error: { message: "timeout" } }),
      insert: () => Promise.resolve({ error: null }),
      update: () => Promise.resolve({ error: null }),
    };
    const outcome = await persistClientDna(guest(), { leadId: VALID_UUID }, sink);
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBe("timeout");
  });

  it("never throws when the sink blows up", async () => {
    const sink: ClientDnaSink = {
      findExisting: () => {
        throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
      },
      insert: () => Promise.resolve({ error: null }),
      update: () => Promise.resolve({ error: null }),
    };
    const outcome = await persistClientDna(guest(), { leadId: VALID_UUID }, sink);
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain("Missing env");
  });

  it("surfaces an insert error without throwing", async () => {
    const sink: ClientDnaSink = {
      findExisting: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ error: { message: "23503 fk violation" } }),
      update: () => Promise.resolve({ error: null }),
    };
    const outcome = await persistClientDna(guest(), { leadId: VALID_UUID }, sink);
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain("23503");
  });
});
