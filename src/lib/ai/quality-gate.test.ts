import { describe, it, expect, vi } from "vitest";
import {
  runQualityGate,
  buildQcDecisionRow,
  recordQcDecision,
  riskLevelFor,
  decisionStatusFor,
  createQcDecisionSink,
  type QcDecisionSink,
  type QcDecisionInsertRow,
} from "@/lib/ai/quality-gate";
import type { CuratedJourney, GuestProfile } from "@/lib/ai/types";

function makeJourney(overrides?: Partial<CuratedJourney>): CuratedJourney {
  const guest: GuestProfile = {
    id: "guest-test",
    name: "Test Guest",
    email: "test@example.com",
    isCouple: true,
    preferences: {
      travelStyle: "romantic",
      accommodationStyle: "luxury-resort",
      activityLevel: "moderate",
      budgetRange: "premium",
    },
  };

  return {
    id: "journey-test",
    title: "Luxury Zambia Escape",
    subtitle: "A curated 7-night journey",
    guestProfile: guest,
    destinations: ["South Luangwa", "Victoria Falls"],
    duration: 2,
    pricing: {
      accommodation: [
        { label: "Lodge A", nights: 1, ratePerNight: 400, ratePerNightPPPN: 400, subtotal: 400 },
        { label: "Lodge B", nights: 1, ratePerNight: 350, ratePerNightPPPN: 350, subtotal: 350 },
      ],
      activities: [],
      transfers: [{ label: "All private charters & road transfers", cost: 250 }],
      subtotal: 1000, // accommodation (750) + transfers (250)
      taxes: 100,     // 10% of subtotal
      total: 1100,    // subtotal + taxes
      currency: "USD",
    },
    itinerary: [
      {
        day: 1,
        title: "Arrival",
        location: "South Luangwa",
        accommodation: "Lodge A",
        activities: [{ title: "Check-in", description: "Arrive and settle in", duration: "1h", included: true, type: "cultural" }],
        meals: ["Dinner"],
        transfers: [],
        highlights: [],
        notes: "",
      },
      {
        day: 2,
        title: "Departure",
        location: "Victoria Falls",
        accommodation: "Lodge B",
        activities: [{ title: "Check-out", description: "Depart for next lodge", duration: "1h", included: true, type: "cultural" }],
        meals: ["Breakfast"],
        transfers: [],
        highlights: [],
        notes: "",
      },
    ],
    highlights: ["Private game drives", "Bush breakfast"],
    includedExtras: [],
    createdAt: new Date().toISOString(),
    status: "draft",
    ...overrides,
  };
}

function depositFor(journey: CuratedJourney, percent = 30): number {
  return Math.round(journey.pricing.total * (percent / 100));
}

describe("runQualityGate", () => {
  it("passes on a fully valid journey", () => {
    const journey = makeJourney();
    const verdict = runQualityGate(journey, depositFor(journey));
    expect(verdict.ok).toBe(true);
    expect(verdict.severity).toBe("pass");
    expect(verdict.issues).toHaveLength(0);
  });

  it("fails when total is zero", () => {
    const journey = makeJourney({
      pricing: { ...makeJourney().pricing, total: 0 },
    });
    const verdict = runQualityGate(journey, depositFor(journey));
    expect(verdict.ok).toBe(false);
    expect(verdict.issues.map((i) => i.code)).toContain("NONPOSITIVE_TOTAL");
  });

  it("fails when accommodation subtotal does not match line items", () => {
    const journey = makeJourney();
    // tamper: inflate subtotal but keep total = subtotal + taxes (consistent)
    journey.pricing.subtotal = 9999;
    journey.pricing.taxes = 1000;
    journey.pricing.total = 10999;
    const verdict = runQualityGate(journey, depositFor(journey));
    expect(verdict.ok).toBe(false);
    expect(verdict.issues.map((i) => i.code)).toContain("ACCOMMODATION_SUM_MISMATCH");
  });

  it("fails when deposit does not match 30% of total", () => {
    const journey = makeJourney();
    const verdict = runQualityGate(journey, 1000);
    expect(verdict.ok).toBe(false);
    expect(verdict.issues.map((i) => i.code)).toContain("DEPOSIT_MISMATCH");
  });
});

// ─── Durable verdicts ───────────────────────────────────────────────────────

const VALID_UUID = "3f2a1b4c-5d6e-4f7a-8b9c-0d1e2f3a4b5c";

function passVerdict() {
  const journey = makeJourney();
  return runQualityGate(journey, depositFor(journey));
}

function warnVerdict() {
  const journey = makeJourney({ highlights: [] });
  return runQualityGate(journey, depositFor(journey));
}

function failVerdict() {
  const journey = makeJourney({ pricing: { ...makeJourney().pricing, total: 0 } });
  return runQualityGate(journey, depositFor(journey));
}

describe("severity → lifecycle mapping", () => {
  it("maps severity onto risk level", () => {
    expect(riskLevelFor("pass")).toBe("low");
    expect(riskLevelFor("warn")).toBe("medium");
    expect(riskLevelFor("fail")).toBe("high");
  });

  it("maps severity onto decision status", () => {
    expect(decisionStatusFor("pass")).toBe("approved");
    expect(decisionStatusFor("warn")).toBe("proposed");
    expect(decisionStatusFor("fail")).toBe("rejected");
  });
});

describe("buildQcDecisionRow", () => {
  it("records a clean pass as approved, low risk, and not requiring review", () => {
    const row = buildQcDecisionRow({ verdict: passVerdict(), journeyTitle: "Luxury Zambia Escape" });
    expect(row.status).toBe("approved");
    expect(row.risk_level).toBe("low");
    expect(row.human_review_required).toBe(false);
    expect(row.evidence_count).toBe(0);
    expect(row.title).toBe("PASS: Luxury Zambia Escape");
  });

  it("records a failure as rejected, high risk, and requiring human review", () => {
    const verdict = failVerdict();
    const row = buildQcDecisionRow({ verdict, journeyTitle: "Broken Journey" });
    expect(row.status).toBe("rejected");
    expect(row.risk_level).toBe("high");
    expect(row.human_review_required).toBe(true);
    expect(row.evidence_count).toBe(verdict.issues.length);
    expect(row.recommendation).toContain("Do not send");
  });

  it("leaves a warning for a human rather than deciding it", () => {
    const row = buildQcDecisionRow({ verdict: warnVerdict() });
    expect(row.status).toBe("proposed");
    expect(row.risk_level).toBe("medium");
    expect(row.human_review_required).toBe(true);
    expect(row.recommendation).toContain("Review the warnings");
  });

  it("makes no confidence claim, because a deterministic check is not an inference", () => {
    // The load-bearing honesty guarantee: a gate that hard-fails arithmetic is
    // certain, not 95%-confident. Writing a high score here would corrupt the
    // field for rows that genuinely are probabilistic.
    const row = buildQcDecisionRow({ verdict: passVerdict() });
    expect(row.confidence_score).toBe(0);
  });

  it("never forges a human approval", () => {
    const row = buildQcDecisionRow({ verdict: passVerdict() });
    expect(row).not.toHaveProperty("decided_by");
    expect(row).not.toHaveProperty("decided_at");
  });

  it("normalizes a real UUID and rejects a slug rather than corrupting the column", () => {
    expect(
      buildQcDecisionRow({ verdict: passVerdict(), journeyId: VALID_UUID.toUpperCase() }).entity_id
    ).toBe(VALID_UUID);
    // A non-UUID would trip Postgres error 22P02 and abort the whole insert.
    expect(buildQcDecisionRow({ verdict: passVerdict(), journeyId: "journey-test" }).entity_id).toBeNull();
    expect(buildQcDecisionRow({ verdict: passVerdict(), journeyId: undefined }).entity_id).toBeNull();
  });

  it("falls back to a placeholder when the journey has no title", () => {
    const row = buildQcDecisionRow({ verdict: passVerdict(), journeyTitle: "   " });
    expect(row.title).toBe("PASS: Untitled journey");
  });

  it("keeps autonomy_level inside the 0-4 CHECK constraint", () => {
    // A value outside the range would violate the column CHECK and abort the
    // insert, losing the history row entirely.
    const row = buildQcDecisionRow({
      verdict: passVerdict(),
      autonomyLevel: 99 as unknown as 0,
    });
    expect(row.autonomy_level).toBeGreaterThanOrEqual(0);
    expect(row.autonomy_level).toBeLessThanOrEqual(4);
  });

  it("carries every defect into the rationale so the row explains itself", () => {
    const verdict = failVerdict();
    const row = buildQcDecisionRow({ verdict });
    for (const issue of verdict.issues) {
      expect(row.rationale).toContain(issue.code);
    }
  });
});

describe("recordQcDecision", () => {
  function sinkReturning(error: { message: string } | null) {
    const inserted: QcDecisionInsertRow[] = [];
    const sink: QcDecisionSink = {
      insert: (row) => {
        inserted.push(row);
        return Promise.resolve({ error });
      },
    };
    return { sink, inserted };
  }

  it("reports success and returns the row it wrote", async () => {
    const { sink, inserted } = sinkReturning(null);
    const outcome = await recordQcDecision({ verdict: passVerdict() }, sink);
    expect(outcome.ok).toBe(true);
    expect(outcome.error).toBeNull();
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toEqual(outcome.row);
  });

  it("returns a database error as data rather than throwing", async () => {
    const { sink } = sinkReturning({ message: "insert failed" });
    const outcome = await recordQcDecision({ verdict: passVerdict() }, sink);
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBe("insert failed");
  });

  it("never throws when the sink itself blows up", async () => {
    // A failed history write must not fail the send the gate was protecting.
    const sink: QcDecisionSink = {
      insert: () => {
        throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
      },
    };
    const outcome = await recordQcDecision({ verdict: passVerdict() }, sink);
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain("Missing env");
  });

  it("targets the decisions table", () => {
    const from = vi.fn(() => ({ insert: () => Promise.resolve({ error: null }) }));
    const sink = createQcDecisionSink({ from: from as never });
    sink.insert(buildQcDecisionRow({ verdict: passVerdict() }));
    expect(from).toHaveBeenCalledWith("decisions");
  });
});
