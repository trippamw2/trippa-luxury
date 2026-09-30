import { describe, expect, it } from "vitest";
import {
  ACTION_CLASS_LABELS,
  AUTONOMY_LEVEL_LABELS,
  CAPABILITY_LABELS,
  DEFAULT_COMPANY_AUTONOMY_LEVEL,
  DEFAULT_HIGH_VALUE_THRESHOLD,
  DEFAULT_MIN_CONFIDENCE,
  capabilityMay,
  coerceAutonomyLevel,
  evaluateAutonomy,
  permissionsFor,
  requiredLevelFor,
  type ActionClass,
  type AutonomyLevel,
  type Capability,
} from "./autonomy-policy";

/** A confident, well-evidenced, low-exposure baseline that should be permitted. */
function clean(overrides: Partial<Parameters<typeof evaluateAutonomy>[0]> = {}) {
  return {
    capability: "orion" as Capability,
    actionClass: "outbound_message" as ActionClass,
    companyLevel: 3 as AutonomyLevel,
    staged: true,
    confidenceScore: 90,
    evidenceCount: 5,
    ...overrides,
  };
}

describe("labels", () => {
  it("labels every autonomy level", () => {
    expect(Object.keys(AUTONOMY_LEVEL_LABELS)).toHaveLength(5);
    expect(AUTONOMY_LEVEL_LABELS[4]).toBe("Human authorization");
  });

  it("labels every capability", () => {
    expect(Object.keys(CAPABILITY_LABELS)).toHaveLength(7);
  });

  it("labels every action class", () => {
    expect(Object.keys(ACTION_CLASS_LABELS)).toHaveLength(8);
  });
});

describe("requiredLevelFor — the authority ladder", () => {
  it("scales monotonically with consequence", () => {
    expect(requiredLevelFor("observe")).toBe(0);
    expect(requiredLevelFor("recommend")).toBe(1);
    expect(requiredLevelFor("draft")).toBe(2);
    expect(requiredLevelFor("internal_write")).toBe(2);
    expect(requiredLevelFor("outbound_message")).toBe(3);
  });

  it("pins the three always-human classes to level 4", () => {
    expect(requiredLevelFor("supplier_commitment")).toBe(4);
    expect(requiredLevelFor("financial_commitment")).toBe(4);
    expect(requiredLevelFor("contractual")).toBe(4);
  });
});

describe("capabilityMay — separation of powers", () => {
  it("stops Sterling from ever sending or spending", () => {
    // The commercial brain computes; it does not dispatch or move money.
    expect(capabilityMay("sterling", "outbound_message")).toBe(false);
    expect(capabilityMay("sterling", "financial_commitment")).toBe(false);
    expect(capabilityMay("sterling", "supplier_commitment")).toBe(false);
    expect(capabilityMay("sterling", "recommend")).toBe(true);
    expect(capabilityMay("sterling", "observe")).toBe(true);
  });

  it("stops KORA from contacting anyone — an auditor that can email is not an auditor", () => {
    expect(capabilityMay("kora", "outbound_message")).toBe(false);
    expect(capabilityMay("kora", "financial_commitment")).toBe(false);
    expect(capabilityMay("kora", "supplier_commitment")).toBe(false);
  });

  it("stops Amara from dispatching unreviewed prose", () => {
    expect(capabilityMay("amara", "outbound_message")).toBe(false);
    expect(capabilityMay("amara", "draft")).toBe(true);
  });

  it("keeps the design and intelligence layers out of execution entirely", () => {
    for (const cap of ["cadc", "constantine", "beatrice", "amara", "kora"] as Capability[]) {
      expect(capabilityMay(cap, "outbound_message")).toBe(false);
      expect(capabilityMay(cap, "supplier_commitment")).toBe(false);
    }
  });

  it("confines external action to Orion", () => {
    const external: ActionClass[] = [
      "outbound_message",
      "supplier_commitment",
      "financial_commitment",
    ];
    for (const cls of external) {
      const permitted = (Object.keys(CAPABILITY_LABELS) as Capability[]).filter((c) =>
        capabilityMay(c, cls)
      );
      expect(permitted).toEqual(["orion"]);
    }
  });

  it("grants every capability observe access", () => {
    for (const cap of Object.keys(CAPABILITY_LABELS) as Capability[]) {
      expect(capabilityMay(cap, "observe")).toBe(true);
      expect(permissionsFor(cap)).toContain("observe");
    }
  });
});

describe("evaluateAutonomy — permitted path", () => {
  it("clears a well-evidenced staged send at dial 3", () => {
    const d = evaluateAutonomy(clean());
    expect(d.allowed).toBe(true);
    expect(d.requiresHumanReview).toBe(false);
    expect(d.escalatedBy).toEqual([]);
    expect(d.requiredLevel).toBe(3);
  });

  it("lets any capability observe without review at any dial", () => {
    for (let level = 0; level <= 4; level++) {
      const d = evaluateAutonomy(
        clean({ capability: "kora", actionClass: "observe", companyLevel: level as AutonomyLevel })
      );
      expect(d.allowed).toBe(true);
      expect(d.requiresHumanReview).toBe(false);
    }
  });

  it("allows recommendations at dial 1 with no confidence or evidence", () => {
    const d = evaluateAutonomy(
      clean({
        capability: "beatrice",
        actionClass: "recommend",
        companyLevel: 1,
        confidenceScore: undefined,
        evidenceCount: undefined,
      })
    );
    expect(d.allowed).toBe(true);
  });
});

describe("evaluateAutonomy — hard blocks", () => {
  it("blocks a capability acting outside its mandate", () => {
    const d = evaluateAutonomy(clean({ capability: "beatrice", actionClass: "outbound_message" }));
    expect(d.allowed).toBe(false);
    expect(d.requiresHumanReview).toBe(true);
    expect(d.escalatedBy).toContain("capability_not_permitted");
  });

  it("freezes all action on a record under human review", () => {
    const d = evaluateAutonomy(clean({ pendingHumanReview: true }));
    expect(d.allowed).toBe(false);
    expect(d.escalatedBy).toContain("record_pending_human_review");
  });

  it("freezes even a level-4 action that is otherwise permitted", () => {
    // Orion is the only capability allowed to spend, but a frozen record wins
    // over an otherwise-permitted authority level.
    const d = evaluateAutonomy(
      clean({
        actionClass: "financial_commitment",
        companyLevel: 4,
        amount: 10,
        confidenceScore: 99,
        evidenceCount: 99,
        pendingHumanReview: true,
      })
    );
    expect(d.allowed).toBe(false);
    expect(d.escalatedBy).toContain("record_pending_human_review");
  });
});

describe("evaluateAutonomy — always-human classes", () => {
  it("escalates money, suppliers and contracts even at dial 4 with perfect confidence", () => {
    for (const actionClass of [
      "supplier_commitment",
      "financial_commitment",
      "contractual",
    ] as ActionClass[]) {
      const d = evaluateAutonomy(
        clean({
          actionClass,
          companyLevel: 4,
          amount: 1,
          confidenceScore: 100,
          evidenceCount: 100,
        })
      );
      expect(d.allowed).toBe(false);
      expect(d.requiresHumanReview).toBe(true);
      expect(d.escalatedBy).toContain("consequential_action_class");
    }
  });
});

describe("evaluateAutonomy — the company dial", () => {
  it("escalates a send when the dial sits below 3", () => {
    for (const level of [0, 1, 2] as AutonomyLevel[]) {
      const d = evaluateAutonomy(clean({ companyLevel: level }));
      expect(d.allowed).toBe(false);
      expect(d.escalatedBy).toContain("exceeds_company_autonomy_level");
    }
  });

  it("clears a draft at dial 2 but not at dial 1", () => {
    const atTwo = evaluateAutonomy(
      clean({ actionClass: "draft", companyLevel: 2, confidenceScore: 95, evidenceCount: 3 })
    );
    expect(atTwo.allowed).toBe(true);

    const atOne = evaluateAutonomy(
      clean({ actionClass: "draft", companyLevel: 1, confidenceScore: 95, evidenceCount: 3 })
    );
    expect(atOne.allowed).toBe(false);
    expect(atOne.escalatedBy).toContain("exceeds_company_autonomy_level");
  });

  it("reports the level the dial would need to reach to run unattended", () => {
    const blocked = evaluateAutonomy(clean({ companyLevel: 2 }));
    expect(blocked.effectiveLevel).toBe(2);
    const permitted = evaluateAutonomy(clean({ companyLevel: 3 }));
    expect(permitted.effectiveLevel).toBe(3);
  });
});

describe("evaluateAutonomy — outbound staging", () => {
  it("refuses to send an unstaged message", () => {
    const d = evaluateAutonomy(clean({ staged: false }));
    expect(d.allowed).toBe(false);
    expect(d.escalatedBy).toContain("outbound_not_staged");
  });

  it("permits the same message once staged", () => {
    expect(evaluateAutonomy(clean({ staged: true })).allowed).toBe(true);
  });

  it("applies the staging rule only to outbound, not to internal writes", () => {
    const d = evaluateAutonomy(
      clean({ capability: "constantine", actionClass: "internal_write", staged: false, companyLevel: 2 })
    );
    expect(d.escalatedBy).not.toContain("outbound_not_staged");
  });
});

describe("evaluateAutonomy — confidence and evidence discipline", () => {
  it("escalates a low-confidence action", () => {
    const d = evaluateAutonomy(clean({ confidenceScore: DEFAULT_MIN_CONFIDENCE - 1 }));
    expect(d.allowed).toBe(false);
    expect(d.escalatedBy).toContain("low_confidence");
  });

  it("accepts a decision exactly at the confidence threshold", () => {
    const d = evaluateAutonomy(clean({ confidenceScore: DEFAULT_MIN_CONFIDENCE }));
    expect(d.escalatedBy).not.toContain("low_confidence");
    expect(d.allowed).toBe(true);
  });

  it("escalates an action with zero supporting observations", () => {
    const d = evaluateAutonomy(clean({ evidenceCount: 0 }));
    expect(d.allowed).toBe(false);
    expect(d.escalatedBy).toContain("insufficient_evidence");
  });

  it("does not apply confidence gates to pure observation", () => {
    const d = evaluateAutonomy(
      clean({ capability: "kora", actionClass: "observe", confidenceScore: 0, evidenceCount: 0 })
    );
    expect(d.allowed).toBe(true);
  });

  it("does not apply confidence gates to recommendations", () => {
    const d = evaluateAutonomy(
      clean({
        capability: "constantine",
        actionClass: "recommend",
        companyLevel: 1,
        confidenceScore: 0,
        evidenceCount: 0,
      })
    );
    expect(d.allowed).toBe(true);
  });

  it("never fabricates confidence: an absent score escalates like a low one", () => {
    // Acting with no stated confidence is, in effect, having fabricated it —
    // the failure mode the constitution names. So absence must escalate.
    const d = evaluateAutonomy(clean({ confidenceScore: undefined }));
    expect(d.allowed).toBe(false);
    expect(d.escalatedBy).toContain("confidence_not_assessed");
  });

  it("does not require an evidence count when confidence is stated", () => {
    // Deliberate asymmetry: a deterministic action (a booking confirmation)
    // has no observation base by definition, so demanding one would reject
    // every routine message. Confidence is the universal gate; evidence only
    // fires when explicitly zero.
    const d = evaluateAutonomy(clean({ confidenceScore: 100, evidenceCount: undefined }));
    expect(d.allowed).toBe(true);
    expect(d.escalatedBy).toEqual([]);
  });
});

describe("evaluateAutonomy — high-value exposure", () => {
  it("escalates above the automatic-execution threshold", () => {
    const d = evaluateAutonomy(clean({ amount: DEFAULT_HIGH_VALUE_THRESHOLD + 1 }));
    expect(d.allowed).toBe(false);
    expect(d.escalatedBy).toContain("high_value_exposure");
  });

  it("accepts exposure exactly at the threshold", () => {
    const d = evaluateAutonomy(clean({ amount: DEFAULT_HIGH_VALUE_THRESHOLD }));
    expect(d.escalatedBy).not.toContain("high_value_exposure");
  });

  it("applies the exposure gate to any action carrying an amount", () => {
    const d = evaluateAutonomy(
      clean({ capability: "sterling", actionClass: "internal_write", companyLevel: 2, amount: 99_999 })
    );
    expect(d.escalatedBy).toContain("high_value_exposure");
  });
});

describe("evaluateAutonomy — reason reporting", () => {
  it("always produces a non-empty reason", () => {
    const cases = [
      clean(),
      clean({ companyLevel: 1 }),
      clean({ pendingHumanReview: true }),
      clean({ staged: false }),
      clean({ amount: 1_000_000 }),
    ];
    for (const c of cases) {
      expect(evaluateAutonomy(c).reason.length).toBeGreaterThan(0);
    }
  });

  it("deduplicates reasons while preserving first-seen order", () => {
    // Both the dial and confidence fire; each must appear exactly once.
    const d = evaluateAutonomy(clean({ companyLevel: 1, confidenceScore: 1, evidenceCount: 0 }));
    expect(d.escalatedBy).toEqual([
      "exceeds_company_autonomy_level",
      "low_confidence",
      "insufficient_evidence",
    ]);
  });
});

describe("coerceAutonomyLevel", () => {
  it("defaults when the value is unusable", () => {
    expect(coerceAutonomyLevel(undefined)).toBe(DEFAULT_COMPANY_AUTONOMY_LEVEL);
    expect(coerceAutonomyLevel(null)).toBe(DEFAULT_COMPANY_AUTONOMY_LEVEL);
    expect(coerceAutonomyLevel("not a level")).toBe(DEFAULT_COMPANY_AUTONOMY_LEVEL);
    expect(coerceAutonomyLevel(Number.NaN)).toBe(DEFAULT_COMPANY_AUTONOMY_LEVEL);
  });

  it("clamps out-of-range values into the ladder", () => {
    expect(coerceAutonomyLevel(-5)).toBe(0);
    expect(coerceAutonomyLevel(99)).toBe(4);
  });

  it("accepts numeric strings from config or the database", () => {
    expect(coerceAutonomyLevel("3")).toBe(3);
    expect(coerceAutonomyLevel(3)).toBe(3);
    expect(coerceAutonomyLevel(3.4)).toBe(3);
    expect(coerceAutonomyLevel(3.6)).toBe(4);
  });
});

describe("default operating posture", () => {
  it("starts at level 2 — reversible internal work only", () => {
    expect(DEFAULT_COMPANY_AUTONOMY_LEVEL).toBe(2);
  });

  it("cannot send a client email at the default level", () => {
    const d = evaluateAutonomy(clean({ companyLevel: DEFAULT_COMPANY_AUTONOMY_LEVEL }));
    expect(d.allowed).toBe(false);
  });
});
