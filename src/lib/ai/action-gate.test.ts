import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ─────────────────────────────────────────────────────────────────
// Two separate sinks are mocked: the settings store that supplies the operator's
// dial, and the `decisions` ledger that records the outcome.
const h = vi.hoisted(() => ({
  settingRows: [] as Array<{ key: string; value: string }>,
  decisionInserts: [] as Array<Record<string, unknown>>,
  decisionError: null as unknown,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: (_columns: string) => ({
        in: (_column: string, keys: string[]) =>
          Promise.resolve({
            data: table === "platform_settings"
              ? h.settingRows.filter((row) => keys.includes(row.key))
              : [],
            error: null,
          }),
      }),
      upsert: () => Promise.resolve({ error: null }),
      insert: (payload: unknown) => {
        if (table === "decisions") {
          // The ledger is written with a single row object, not an array.
          const rows = Array.isArray(payload) ? payload : [payload];
          h.decisionInserts.push(...(rows as Array<Record<string, unknown>>));
          if (h.decisionError) return Promise.resolve({ error: h.decisionError });
        }
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

import {
  AI_ACTION_PROFILES,
  ActionBlockedError,
  actionBlockedResponse,
  evaluateAction,
  gateAiAction,
  recordDecision,
  requireAction,
  type AiActionProfile,
} from "@/lib/ai/action-gate";
import {
  DEFAULT_GOVERNANCE_SETTINGS,
  resetGovernanceCache,
  type GovernanceSettings,
} from "@/lib/ai/governance-settings";
import type { AutonomyLevel } from "@/lib/ai/autonomy-policy";

const ENV_KEYS = [
  "GOVERNANCE_LLM_ENABLED",
  "GOVERNANCE_AUTONOMY_LEVEL",
  "GOVERNANCE_AI_OUTBOUND_ENABLED",
  "GOVERNANCE_AI_INTERNAL_WRITES_ENABLED",
];

function settings(overrides: Partial<GovernanceSettings> = {}): GovernanceSettings {
  return { ...DEFAULT_GOVERNANCE_SETTINGS, ...overrides };
}

/** Put a dial in the store so `gateAiAction` (which reads real settings) sees it. */
function storeDial(level: AutonomyLevel): void {
  h.settingRows = [{ key: "governance.autonomy_level", value: String(level) }];
}

beforeEach(() => {
  h.settingRows = [];
  h.decisionInserts = [];
  h.decisionError = null;
  resetGovernanceCache();
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("separation of powers", () => {
  it("refuses a capability that may not perform the action, even with human sign-off", async () => {
    // Sterling exists to compute and recommend; Orion executes. A finance manager
    // clicking "send" does not make Sterling permitted to send, so this must fail
    // on the capability check rather than be waved through by authorization.
    const profile: AiActionProfile = {
      capability: "sterling",
      actionClass: "outbound_message",
      title: "Sterling attempts a dispatch",
      confidenceScore: 100,
      staged: true,
      humanAuthorized: true,
    };

    const result = await evaluateAction(profile, { settings: settings() });

    expect(result.allowed).toBe(false);
    expect(result.authorizedBy).toBeNull();
    expect(result.decision.escalatedBy).toContain("capability_not_permitted");
  });

  it("refuses to act on a record under human review, even with sign-off", async () => {
    // A record being reviewed is frozen against external action; the reviewer is
    // the one who must clear it, not the request that carries the freeze.
    const result = await evaluateAction(AI_ACTION_PROFILES["send-quote"], {
      settings: settings({ autonomyLevel: 4 }),
      pendingHumanReview: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.decision.escalatedBy).toContain("record_pending_human_review");
  });

  it("permits Orion to dispatch, because the matrix grants outbound to Orion alone", async () => {
    const result = await evaluateAction(AI_ACTION_PROFILES["send-quote"], {
      settings: settings(),
    });

    expect(result.allowed).toBe(true);
    expect(result.authorizedBy).toBe("human");
  });
});

describe("the dial", () => {
  const alternatives = AI_ACTION_PROFILES.alternatives; // recommend, requires 1
  const proposal = AI_ACTION_PROFILES.proposal; // draft, requires 2

  it("allows a recommendation at the starting dial of 2", async () => {
    const result = await evaluateAction(alternatives, { settings: settings() });
    expect(result.allowed).toBe(true);
    // Cleared by the constitution itself, with no human involved.
    expect(result.authorizedBy).toBe("policy");
  });

  it("refuses a recommendation at level 0", async () => {
    const result = await evaluateAction(alternatives, { settings: settings({ autonomyLevel: 0 }) });
    expect(result.allowed).toBe(false);
    expect(result.decision.escalatedBy).toContain("exceeds_company_autonomy_level");
  });

  it("refuses a draft at level 1 but allows it at 2", async () => {
    expect((await evaluateAction(proposal, { settings: settings({ autonomyLevel: 1 }) })).allowed).toBe(false);
    expect((await evaluateAction(proposal, { settings: settings({ autonomyLevel: 2 }) })).allowed).toBe(true);
  });

  it("refuses unattended outbound at every dial, because it stages nothing", async () => {
    // `outbound_not_staged` is a structural refusal in `evaluateAutonomy`, not a
    // threshold the dial can clear. An unattended job that composes and sends in
    // one step therefore cannot be authorized by turning the autonomy level up,
    // which is the point: re-enabling it requires staging, not a setting.
    const reminders = AI_ACTION_PROFILES["trigger-reminders"];

    for (const level of [0, 1, 2, 3, 4] as AutonomyLevel[]) {
      const result = await evaluateAction(reminders, { settings: settings({ autonomyLevel: level }) });
      expect(result.allowed, `dial ${level}`).toBe(false);
      expect(result.decision.escalatedBy).toContain("outbound_not_staged");
    }
  });

  it("does let a staged, human-authorized dispatch through at the starting dial", async () => {
    // The contrast that matters: reminders are refused because they stage
    // nothing, not because dispatching is forbidden outright.
    const result = await evaluateAction(AI_ACTION_PROFILES["send-quote"], {
      settings: settings({ autonomyLevel: 2 }),
    });
    expect(result.allowed).toBe(true);
    expect(result.authorizedBy).toBe("human");
  });

  it("requires human authorization for outbound below its required level", async () => {
    // send-quote needs level 3 and runs at 2, so policy alone refuses it. The
    // admin click supplies the authorization the evaluator cannot see.
    const withoutHuman = await evaluateAction(
      { ...AI_ACTION_PROFILES["send-quote"], humanAuthorized: false },
      { settings: settings({ autonomyLevel: 2 }) }
    );
    expect(withoutHuman.allowed).toBe(false);

    const withHuman = await evaluateAction(AI_ACTION_PROFILES["send-quote"], {
      settings: settings({ autonomyLevel: 2 }),
    });
    expect(withHuman.allowed).toBe(true);
    expect(withHuman.authorizedBy).toBe("human");
  });

  it("lets a human authorize an action the dial refused", async () => {
    const result = await evaluateAction(AI_ACTION_PROFILES["send-quote"], {
      settings: settings({ autonomyLevel: 0 }),
    });
    expect(result.allowed).toBe(true);
    expect(result.authorizedBy).toBe("human");
  });
});

describe("quality signals", () => {
  it("refuses a level-2 action whose confidence was never stated", async () => {
    const result = await evaluateAction(
      { ...AI_ACTION_PROFILES.workflow, confidenceScore: undefined },
      { settings: settings() }
    );

    expect(result.allowed).toBe(false);
    expect(result.decision.escalatedBy).toContain("confidence_not_assessed");
  });

  it("refuses a level-2 action whose confidence is too low", async () => {
    const result = await evaluateAction(AI_ACTION_PROFILES.workflow, {
      settings: settings(),
      confidenceScore: 40,
    });

    expect(result.allowed).toBe(false);
    expect(result.decision.escalatedBy).toContain("low_confidence");
  });

  it("lets a human authorize a low-confidence action", async () => {
    // A person reading the output and deciding to proceed is precisely the
    // remedy the constitution asks for.
    const result = await evaluateAction(AI_ACTION_PROFILES["send-quote"], {
      settings: settings(),
      confidenceScore: 20,
    });
    expect(result.allowed).toBe(true);
    expect(result.authorizedBy).toBe("human");
  });

  it("escalates high-value exposure but leaves it to a human", async () => {
    // The route supplies the amount it is about to dispatch, which is the only
    // way this check can fire on a real send.
    const result = await evaluateAction(AI_ACTION_PROFILES["send-quote"], {
      settings: settings(),
      amount: 25_000,
    });

    // The reason is surfaced for the ledger even though a human authorized it.
    expect(result.allowed).toBe(true);
    expect(result.decision.escalatedBy).toContain("high_value_exposure");
    expect(result.decision.requiresHumanReview).toBe(true);
  });

  it("does not escalate an ordinary-value dispatch", async () => {
    const result = await evaluateAction(AI_ACTION_PROFILES["send-quote"], {
      settings: settings(),
      amount: 900,
    });
    expect(result.decision.escalatedBy).not.toContain("high_value_exposure");
  });

  it("escalates an explicitly empty evidence base", async () => {
    const result = await evaluateAction(AI_ACTION_PROFILES.workflow, {
      settings: settings(),
      evidenceCount: 0,
    });

    expect(result.decision.escalatedBy).toContain("insufficient_evidence");
  });
});

describe("kill switches", () => {
  it("stops all outbound when the operator pulls the lever, sign-off or not", async () => {
    const result = await evaluateAction(AI_ACTION_PROFILES["send-quote"], {
      settings: settings({ outboundEnabled: false }),
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedBySwitch).toBe("governance.ai_outbound_enabled");
    expect(result.authorizedBy).toBe("switch");
  });

  it("stops AI internal writes when that switch is off", async () => {
    const result = await evaluateAction(AI_ACTION_PROFILES.inquiry, {
      settings: settings({ internalWritesEnabled: false }),
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedBySwitch).toBe("governance.ai_internal_writes_enabled");
  });

  it("does not block recommendations when the internal-write switch is off", async () => {
    const result = await evaluateAction(AI_ACTION_PROFILES.alternatives, {
      settings: settings({ internalWritesEnabled: false }),
    });
    expect(result.allowed).toBe(true);
  });

  it("reports a switch pause as 503, not 403", async () => {
    // A deliberately paused system should invite a retry; a policy refusal should
    // not, because no amount of retrying changes the answer.
    const paused = await evaluateAction(AI_ACTION_PROFILES["send-quote"], {
      settings: settings({ outboundEnabled: false }),
    });
    const pausedResponse = actionBlockedResponse(new ActionBlockedError("paused", paused));
    expect(pausedResponse.status).toBe(503);

    const refused = await evaluateAction(AI_ACTION_PROFILES.alternatives, {
      settings: settings({ autonomyLevel: 0 }),
    });
    const refusedResponse = actionBlockedResponse(new ActionBlockedError("refused", refused));
    expect(refusedResponse.status).toBe(403);
  });
});

describe("requireAction", () => {
  it("throws ActionBlockedError carrying the decision", async () => {
    await expect(
      requireAction(AI_ACTION_PROFILES.alternatives, { settings: settings({ autonomyLevel: 0 }) })
    ).rejects.toBeInstanceOf(ActionBlockedError);
  });

  it("returns the result untouched when the action may proceed", async () => {
    const result = await requireAction(AI_ACTION_PROFILES.alternatives, {
      settings: settings(),
    });
    expect(result.allowed).toBe(true);
  });
});

describe("gateAiAction", () => {
  it("refuses a route with no declared action profile", async () => {
    // Defaulting quietly here would let a new AI endpoint run ungated.
    await expect(gateAiAction("some-new-ai-route")).rejects.toThrow(/no declared action profile/);
  });

  it("stops an unattended route from claiming human authorization", async () => {
    // The guard that stops `trigger-reminders` quietly becoming "human approved".
    await expect(
      gateAiAction("trigger-reminders", { humanAuthorized: true })
    ).rejects.toThrow(/may not assert human authorization/);
  });

  it("allows an admin-gated route to assert its human authorization", async () => {
    storeDial(3);
    const result = await gateAiAction("send-quote", {}, { entityType: "booking", entityId: null });
    expect(result.allowed).toBe(true);
  });

  it("blocks an unattended dispatch at the starting dial and records the refusal", async () => {
    storeDial(2);
    await expect(gateAiAction("trigger-reminders")).rejects.toBeInstanceOf(ActionBlockedError);

    // A refusal is the event an auditor most needs, so it must reach the ledger
    // even though the route threw. This asserted zero inserts previously, which
    // meant every blocked action left no trace at all.
    expect(h.decisionInserts).toHaveLength(1);
    expect(h.decisionInserts[0]).toMatchObject({
      decision_type: "blocked",
      status: "proposed",
      agent_name: "orion",
      human_review_required: true,
    });
  });

  it("records the switch that stopped an action, not the constitution", async () => {
    // Dial 4 alone would allow this send, so the ledger row proving the
    // operator lever is what stopped it is the whole point of this case.
    h.settingRows = [
      { key: "governance.autonomy_level", value: "4" },
      { key: "governance.ai_outbound_enabled", value: "false" },
    ];
    await expect(gateAiAction("send-quote")).rejects.toBeInstanceOf(ActionBlockedError);

    expect(h.decisionInserts).toHaveLength(1);
    expect(h.decisionInserts[0]).toMatchObject({
      decision_type: "blocked",
      outcome: "governance.ai_outbound_enabled",
    });
  });

  it("records an allowed action in the ledger", async () => {
    storeDial(2);
    await gateAiAction("alternatives", {}, { entityType: "journey", entityId: null });

    expect(h.decisionInserts).toHaveLength(1);
    expect(h.decisionInserts[0]).toMatchObject({
      decision_type: "autonomous",
      status: "executed",
      agent_name: "beatrice",
      human_review_required: false,
    });
  });

  it("marks a human-authorized dispatch as approved rather than executed", async () => {
    storeDial(2);
    await gateAiAction("send-receipt", {}, { entityType: "booking" });

    expect(h.decisionInserts[0]).toMatchObject({
      status: "approved",
      agent_name: "orion",
      risk_level: "medium",
    });
  });

  it("can be told not to record, for read paths", async () => {
    storeDial(2);
    await gateAiAction("knowledge", {}, { record: false });
    expect(h.decisionInserts).toHaveLength(0);
  });
});

describe("recordDecision", () => {
  it("does not throw when the ledger write fails", async () => {
    // A governance ledger that can fail a healthy request trains operators to
    // ignore it, so the failure is logged and swallowed.
    h.decisionError = new Error("ledger unavailable");
    const result = await evaluateAction(AI_ACTION_PROFILES.alternatives, {
      settings: settings(),
    });

    await expect(recordDecision(result, AI_ACTION_PROFILES.alternatives)).resolves.toBeUndefined();
  });

  it("records a refusal as proposed and high risk", async () => {
    const result = await evaluateAction(AI_ACTION_PROFILES.alternatives, {
      settings: settings({ autonomyLevel: 0 }),
    });
    await recordDecision(result, AI_ACTION_PROFILES.alternatives);

    expect(h.decisionInserts[0]).toMatchObject({
      decision_type: "blocked",
      status: "proposed",
      risk_level: "high",
    });
  });

  it("counts supported evidence rather than defaulting to unknown", async () => {
    const result = await evaluateAction(AI_ACTION_PROFILES.proposal, {
      settings: settings(),
      evidenceCount: 6,
    });
    await recordDecision(result, AI_ACTION_PROFILES.proposal);

    expect(h.decisionInserts[0]).toMatchObject({
      evidence_count: 6,
      evidence_quality: "supported",
    });
  });
});

describe("actionBlockedResponse", () => {
  it("describes the governance state so a refusal is actionable", async () => {
    const result = await evaluateAction(AI_ACTION_PROFILES.alternatives, {
      settings: settings({ autonomyLevel: 0 }),
    });
    const response = actionBlockedResponse(new ActionBlockedError("nope", result));
    const body = (await response.json()) as {
      governance: { blockedBy: string; autonomyLevel: number; requiredLevel: number };
    };

    expect(body.governance.blockedBy).toBe("policy");
    expect(body.governance.autonomyLevel).toBe(0);
    expect(body.governance.requiredLevel).toBe(1);
  });

  it("returns a NextResponse, as routes return directly", () => {
    const result = {
      allowed: false,
      decision: {
        allowed: false,
        requiresHumanReview: true,
        requiredLevel: 3 as AutonomyLevel,
        effectiveLevel: 2 as AutonomyLevel,
        reason: "test",
        escalatedBy: [],
      },
      companyLevel: 2 as AutonomyLevel,
      blockedBySwitch: null,
      authorizedBy: null,
      humanAuthorized: false,
    };
    expect(actionBlockedResponse(new ActionBlockedError("test", result))).toBeInstanceOf(NextResponse);
  });
});

describe("declared profiles", () => {
  it("routes every dispatch-capable endpoint to orion", () => {
    // The matrix grants outbound_message to orion alone, so any other mapping
    // would be a permission the constitution does not grant.
    for (const [key, profile] of Object.entries(AI_ACTION_PROFILES)) {
      if (profile.actionClass === "outbound_message") {
        expect(profile.capability, `${key} dispatches`).toBe("orion");
      }
    }
  });

  it("marks no unattended route as human-authorized", () => {
    expect(AI_ACTION_PROFILES["trigger-reminders"].humanAuthorized).toBe(false);
  });

  it("marks every dispatch route as staged, because a human composed it", () => {
    for (const key of ["send-quote", "send-receipt", "send-payment-link"]) {
      expect(AI_ACTION_PROFILES[key].staged, key).toBe(true);
    }
  });

  it("states a confidence for every action that acts rather than observes", () => {
    // Level 2+ actions escalate on an unstated confidence, so silence here would
    // make the route permanently blocked rather than merely cautious.
    for (const [key, profile] of Object.entries(AI_ACTION_PROFILES)) {
      if (profile.actionClass === "draft" || profile.actionClass === "internal_write") {
        expect(typeof profile.confidenceScore, key).toBe("number");
      }
    }
  });

  it("does not let Amara dispatch narrative prose", async () => {
    const result = await evaluateAction(
      { ...AI_ACTION_PROFILES.romance, actionClass: "outbound_message", staged: true, humanAuthorized: true },
      { settings: settings({ autonomyLevel: 4 }) }
    );
    expect(result.allowed).toBe(false);
    expect(result.decision.escalatedBy).toContain("capability_not_permitted");
  });
});