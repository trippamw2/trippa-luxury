import { describe, expect, it } from "vitest";
import {
  DEFAULT_KORA_THRESHOLDS,
  KORA_ACTOR_ID,
  confidenceFor,
  createKoraStore,
  evaluateKoraWrite,
  fingerprintFor,
  priorityScoreFor,
  runDetectors,
  runKoraAudit,
  toGapRow,
  toInsightHypotheses,
  toInsightRow,
  type GapFinding,
  type GapUpsertRow,
  type InsightInsertRow,
  type JourneyRecord,
  type KoraMetrics,
  type KoraThresholds,
  type OpenInquiry,
  type OpenProposal,
  type SupplierRecord,
} from "./kora";

/** Fixed clock: every date comparison in these tests is against this. */
const NOW = "2026-06-01T12:00:00.000Z";
const YESTERDAY = "2026-05-31T12:00:00.000Z";
const LAST_MONTH = "2026-05-05T12:00:00.000Z";
const FUTURE = "2026-12-01T12:00:00.000Z";

function healthyMetrics(overrides: Partial<KoraMetrics> = {}): KoraMetrics {
  return {
    now: NOW,
    openInquiries: [
      {
        id: "inq-ok",
        createdAt: YESTERDAY,
        slaDueAt: FUTURE,
        firstRespondedAt: YESTERDAY,
        destination: "Luangwa",
      },
    ],
    openProposals: [
      {
        id: "prop-ok",
        reference: "KIV-0001",
        sentAt: YESTERDAY,
        expiryDate: FUTURE,
        totalInvestment: 5000,
      },
    ],
    suppliers: [
      {
        id: "sup-ok",
        name: "Great Rift Lodge",
        contractOnFile: true,
        insuranceOnFile: true,
        rating: 4.6,
        status: "active",
      },
    ],
    journeys: [
      {
        id: "jrn-ok",
        name: "Zambia by Design",
        grossProfit: 1200,
        grossMarginPercent: 25,
        totalSellingPrice: 4800,
      },
    ],
    ...overrides,
  };
}

/** An inquiry that is recent enough not to trip the staleness rule. */
function breachedInquiry(index: number): OpenInquiry {
  return {
    id: `inq-breach-${index}`,
    createdAt: YESTERDAY,
    slaDueAt: "2026-05-31T14:00:00.000Z",
    firstRespondedAt: null,
    destination: "Luangwa",
  };
}

function compliantSupplier(index: number, patch: Partial<SupplierRecord> = {}): SupplierRecord {
  return {
    id: `sup-${index}`,
    name: `Supplier ${index}`,
    contractOnFile: true,
    insuranceOnFile: true,
    rating: 4.5,
    status: "active",
    ...patch,
  };
}

function healthyJourney(index: number, patch: Partial<JourneyRecord> = {}): JourneyRecord {
  return {
    id: `jrn-${index}`,
    name: `Journey ${index}`,
    grossProfit: 900,
    grossMarginPercent: 30,
    totalSellingPrice: 3000,
    ...patch,
  };
}

function ruleIds(findings: GapFinding[]): string[] {
  return findings.map((f) => f.ruleId);
}

function onlyRule(findings: GapFinding[], ruleId: string): GapFinding {
  const match = findings.find((f) => f.ruleId === ruleId);
  if (!match) throw new Error(`expected finding ${ruleId}, got [${ruleIds(findings).join(", ")}]`);
  return match;
}

describe("priorityScoreFor", () => {
  it("anchors each severity to a base score", () => {
    expect(priorityScoreFor("low", 0)).toBe(10);
    expect(priorityScoreFor("medium", 0)).toBe(25);
    expect(priorityScoreFor("high", 0)).toBe(45);
    expect(priorityScoreFor("critical", 0)).toBe(65);
  });

  it("grows with volume but on a log scale, so a big rule cannot monopolise the queue", () => {
    const nine = priorityScoreFor("high", 9) - priorityScoreFor("high", 0);
    const ninetyNine = priorityScoreFor("high", 99) - priorityScoreFor("high", 0);
    // 10x the volume is well under 10x the priority, and still under the cap.
    expect(nine).toBe(15);
    expect(ninetyNine).toBe(30);
    expect(ninetyNine).toBeLessThan(nine * 3);
  });

  it("caps the volume bonus at 30", () => {
    expect(priorityScoreFor("low", 1_000_000)).toBe(40);
  });

  it("is deterministic and two-decimal rounded", () => {
    expect(priorityScoreFor("medium", 7)).toBe(priorityScoreFor("medium", 7));
    expect(Number.isInteger(Math.round(priorityScoreFor("high", 3) * 100))).toBe(true);
  });
});

describe("confidenceFor", () => {
  it("never claims high confidence on thin evidence", () => {
    expect(confidenceFor(0)).toEqual({ score: 30, level: "low" });
    expect(confidenceFor(2)).toEqual({ score: 30, level: "low" });
    expect(confidenceFor(3)).toEqual({ score: 55, level: "medium" });
    expect(confidenceFor(10)).toEqual({ score: 80, level: "high" });
  });
});

describe("fingerprintFor", () => {
  it("is namespaced and stable", () => {
    expect(fingerprintFor("inquiry-sla-breach")).toBe("kora:inquiry-sla-breach");
    expect(fingerprintFor("inquiry-sla-breach")).toBe(fingerprintFor("inquiry-sla-breach"));
  });

  it("keeps different rules distinct", () => {
    expect(fingerprintFor("a")).not.toBe(fingerprintFor("b"));
  });
});

describe("runDetectors — a healthy platform", () => {
  it("finds nothing when nothing is wrong", () => {
    expect(runDetectors(healthyMetrics())).toEqual([]);
  });

  it("survives a completely empty platform without inventing findings", () => {
    // proposals and journeys are genuinely empty tables in production today.
    const empty: KoraMetrics = {
      now: NOW,
      openInquiries: [],
      openProposals: [],
      suppliers: [],
      journeys: [],
    };
    expect(runDetectors(empty)).toEqual([]);
  });
});

describe("inquiry SLA breach detector", () => {
  it("flags unresponded enquiries past their deadline", () => {
    const findings = runDetectors(
      healthyMetrics({ openInquiries: [breachedInquiry(1), breachedInquiry(2), breachedInquiry(3)] })
    );
    const finding = onlyRule(findings, "inquiry-sla-breach");
    expect(finding.evidenceCount).toBe(3);
    expect(finding.category).toBe("operational");
    expect(finding.severity).toBe("high");
  });

  it("escalates to critical at scale", () => {
    const many = [1, 2, 3, 4, 5].map(breachedInquiry);
    const finding = onlyRule(runDetectors(healthyMetrics({ openInquiries: many })), "inquiry-sla-breach");
    expect(finding.severity).toBe("critical");
  });

  it("ignores an enquiry that was already answered", () => {
    const answered = { ...breachedInquiry(1), firstRespondedAt: YESTERDAY };
    expect(ruleIds(runDetectors(healthyMetrics({ openInquiries: [answered] })))).not.toContain(
      "inquiry-sla-breach"
    );
  });

  it("applies the grace window before calling it a breach", () => {
    // One hour past due, but the default grace is two hours.
    const insideGrace: OpenInquiry = {
      id: "inq-grace",
      createdAt: YESTERDAY,
      slaDueAt: "2026-06-01T11:00:00.000Z",
      firstRespondedAt: null,
      destination: "Luangwa",
    };
    expect(ruleIds(runDetectors(healthyMetrics({ openInquiries: [insideGrace] })))).not.toContain(
      "inquiry-sla-breach"
    );
  });

  it("cannot judge an enquiry that has no deadline", () => {
    const noSla: OpenInquiry = {
      id: "inq-no-sla",
      createdAt: YESTERDAY,
      slaDueAt: null,
      firstRespondedAt: null,
      destination: "Luangwa",
    };
    expect(ruleIds(runDetectors(healthyMetrics({ openInquiries: [noSla] })))).not.toContain(
      "inquiry-sla-breach"
    );
  });
});

describe("abandoned enquiry detector", () => {
  it("flags old open enquiries", () => {
    const stale: OpenInquiry = {
      id: "inq-stale",
      createdAt: LAST_MONTH,
      // Deadline in the future so only the staleness rule can fire.
      slaDueAt: FUTURE,
      firstRespondedAt: null,
      destination: "Luangwa",
    };
    const finding = onlyRule(runDetectors(healthyMetrics({ openInquiries: [stale] })), "inquiry-never-converted");
    expect(finding.category).toBe("conversion");
    expect(finding.severity).toBe("medium");
  });

  it("respects a custom staleness threshold", () => {
    const stale: OpenInquiry = {
      id: "inq-stale",
      createdAt: LAST_MONTH,
      slaDueAt: FUTURE,
      firstRespondedAt: null,
      destination: "Luangwa",
    };
    const lenient: KoraThresholds = { ...DEFAULT_KORA_THRESHOLDS, staleInquiryDays: 365 };
    expect(ruleIds(runDetectors(healthyMetrics({ openInquiries: [stale] }), lenient))).not.toContain(
      "inquiry-never-converted"
    );
  });
});

describe("expired proposal detector", () => {
  const expired = (index: number): OpenProposal => ({
    id: `prop-${index}`,
    reference: `KIV-000${index}`,
    sentAt: LAST_MONTH,
    expiryDate: "2026-05-30T12:00:00.000Z",
    totalInvestment: 8000,
  });

  it("flags unaccepted proposals past expiry", () => {
    const finding = onlyRule(
      runDetectors(healthyMetrics({ openProposals: [expired(1)] })),
      "proposal-expired-open"
    );
    expect(finding.category).toBe("conversion");
  });

  it("rises to high severity at scale", () => {
    const finding = onlyRule(
      runDetectors(healthyMetrics({ openProposals: [expired(1), expired(2), expired(3)] })),
      "proposal-expired-open"
    );
    expect(finding.severity).toBe("high");
  });

  it("ignores a live proposal", () => {
    expect(
      ruleIds(runDetectors(healthyMetrics({ openProposals: [expired(1)] }), {
        ...DEFAULT_KORA_THRESHOLDS,
        proposalExpiryGraceDays: 365,
      }))
    ).not.toContain("proposal-expired-open");
  });
});

describe("supplier compliance detector", () => {
  it("flags a missing contract and names what is absent", () => {
    const finding = onlyRule(
      runDetectors(
        healthyMetrics({ suppliers: [compliantSupplier(1, { contractOnFile: false })] })
      ),
      "supplier-compliance-missing"
    );
    expect(finding.category).toBe("risk");
    expect(finding.evidence[0].detail).toBe("Missing contract");
  });

  it("names both gaps when both are missing", () => {
    const finding = onlyRule(
      runDetectors(
        healthyMetrics({
          suppliers: [compliantSupplier(1, { contractOnFile: false, insuranceOnFile: false })],
        })
      ),
      "supplier-compliance-missing"
    );
    expect(finding.evidence[0].detail).toBe("Missing contract and insurance");
  });

  it("treats a missing insurance certificate as a breach on its own", () => {
    const finding = onlyRule(
      runDetectors(
        healthyMetrics({ suppliers: [compliantSupplier(1, { insuranceOnFile: false })] })
      ),
      "supplier-compliance-missing"
    );
    expect(finding.evidence[0].detail).toBe("Missing insurance");
  });

  it("escalates to critical when several suppliers are exposed", () => {
    const finding = onlyRule(
      runDetectors(
        healthyMetrics({
          suppliers: [
            compliantSupplier(1, { contractOnFile: false }),
            compliantSupplier(2, { insuranceOnFile: false }),
            compliantSupplier(3, { contractOnFile: false }),
          ],
        })
      ),
      "supplier-compliance-missing"
    );
    expect(finding.severity).toBe("critical");
  });
});

describe("supplier data quality detector", () => {
  it("flags an unrated supplier", () => {
    const finding = onlyRule(
      runDetectors(healthyMetrics({ suppliers: [compliantSupplier(1, { rating: null })] })),
      "supplier-rating-missing"
    );
    expect(finding.category).toBe("data");
    expect(finding.severity).toBe("low");
  });

  it("does not fire for a rated supplier", () => {
    expect(ruleIds(runDetectors(healthyMetrics()))).not.toContain("supplier-rating-missing");
  });
});

describe("margin detector", () => {
  it("flags a journey under the margin floor", () => {
    const finding = onlyRule(
      runDetectors(
        healthyMetrics({ journeys: [healthyJourney(1, { grossMarginPercent: 10, grossProfit: 300 })] })
      ),
      "journey-thin-margin"
    );
    expect(finding.category).toBe("pricing");
    expect(finding.severity).toBe("high");
  });

  it("accepts a journey exactly on the floor", () => {
    expect(
      ruleIds(
        runDetectors(
          healthyMetrics({ journeys: [healthyJourney(1, { grossMarginPercent: 15, grossProfit: 450 })] })
        )
      )
    ).not.toContain("journey-thin-margin");
  });

  it("flags a loss even when the stated margin looks acceptable", () => {
    // A margin percentage that disagrees with an actual loss is exactly the
    // data problem this rule exists to catch.
    expect(
      ruleIds(
        runDetectors(
          healthyMetrics({ journeys: [healthyJourney(1, { grossMarginPercent: 40, grossProfit: 0 })] })
        )
      )
    ).toContain("journey-thin-margin");
  });

  it("honours a custom margin floor", () => {
    const findings = runDetectors(
      healthyMetrics({ journeys: [healthyJourney(1, { grossMarginPercent: 20, grossProfit: 600 })] }),
      { ...DEFAULT_KORA_THRESHOLDS, minJourneyMarginPercent: 30 }
    );
    expect(ruleIds(findings)).toContain("journey-thin-margin");
  });
});

describe("runDetectors — invariants across every finding", () => {
  const busyPlatform = healthyMetrics({
    openInquiries: [1, 2, 3, 4, 5].map(breachedInquiry),
    openProposals: [1, 2, 3].map((i) => ({
      id: `prop-${i}`,
      reference: `KIV-00${i}`,
      sentAt: LAST_MONTH,
      expiryDate: "2026-05-30T12:00:00.000Z",
      totalInvestment: 1000,
    })),
    suppliers: [compliantSupplier(1, { contractOnFile: false }), compliantSupplier(2, { rating: null })],
    journeys: [healthyJourney(1, { grossMarginPercent: 5, grossProfit: 100 })],
  });

  it("finds more than one class of problem on a busy platform", () => {
    expect(runDetectors(busyPlatform).length).toBeGreaterThan(2);
  });

  it("orders findings by descending priority", () => {
    const scores = runDetectors(busyPlatform).map((f) => f.priorityScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("keeps evidence_count and priority in step with the evidence", () => {
    for (const f of runDetectors(busyPlatform)) {
      expect(f.evidenceCount).toBe(f.evidence.length);
      expect(f.priorityScore).toBe(priorityScoreFor(f.severity, f.evidenceCount));
    }
  });

  it("never proposes its own approval", () => {
    for (const f of runDetectors(busyPlatform)) {
      expect(f.requiresHumanApproval).toBe(true);
    }
  });

  it("gives every finding a unique, stable fingerprint", () => {
    const prints = runDetectors(busyPlatform).map((f) => f.fingerprint);
    expect(new Set(prints).size).toBe(prints.length);
    for (const f of runDetectors(busyPlatform)) {
      expect(f.fingerprint).toBe(fingerprintFor(f.ruleId));
    }
  });

  it("is deterministic — a re-run produces byte-identical output", () => {
    expect(JSON.stringify(runDetectors(busyPlatform))).toBe(
      JSON.stringify(runDetectors(busyPlatform))
    );
  });

  it("always carries an actionable proposal, not just a complaint", () => {
    for (const f of runDetectors(busyPlatform)) {
      expect(f.recommendation.length).toBeGreaterThan(0);
      expect(f.implementationPlan.length).toBeGreaterThan(0);
      expect(f.businessImpact.length).toBeGreaterThan(0);
    }
  });
});

describe("toInsightHypotheses", () => {
  const criticalSupplierGap = onlyRule(
    runDetectors(
      healthyMetrics({
        suppliers: [
          compliantSupplier(1, { contractOnFile: false }),
          compliantSupplier(2, { contractOnFile: false }),
          compliantSupplier(3, { contractOnFile: false }),
        ],
      })
    ),
    "supplier-compliance-missing"
  );

  it("promotes a well-evidenced serious finding", () => {
    const hypotheses = toInsightHypotheses([criticalSupplierGap]);
    expect(hypotheses).toHaveLength(1);
    expect(hypotheses[0].evidenceCount).toBe(3);
    expect(hypotheses[0].confidenceLevel).toBe("medium");
  });

  it("never marks its own work validated", () => {
    for (const h of toInsightHypotheses([criticalSupplierGap])) {
      expect(h.status).toBe("hypothesis");
    }
  });

  it("does not promote a finding without enough evidence", () => {
    const thin = onlyRule(
      runDetectors(healthyMetrics({ suppliers: [compliantSupplier(1, { contractOnFile: false })] })),
      "supplier-compliance-missing"
    );
    expect(toInsightHypotheses([thin])).toEqual([]);
  });

  it("does not promote low-severity findings however much evidence there is", () => {
    const ratings = onlyRule(
      runDetectors(
        healthyMetrics({
          suppliers: [1, 2, 3, 4, 5].map((i) => compliantSupplier(i, { rating: null })),
        })
      ),
      "supplier-rating-missing"
    );
    expect(toInsightHypotheses([ratings])).toEqual([]);
  });

  it("maps a pricing gap to a commercial scope", () => {
    const pricing = onlyRule(
      runDetectors(
        healthyMetrics({
          journeys: [1, 2, 3].map((i) =>
            healthyJourney(i, { grossMarginPercent: 4, grossProfit: 50 })
          ),
        })
      ),
      "journey-thin-margin"
    );
    expect(toInsightHypotheses([pricing])[0].scope).toBe("commercial");
  });

  it("honours a raised evidence bar", () => {
    const strict: KoraThresholds = { ...DEFAULT_KORA_THRESHOLDS, minEvidenceForInsight: 10 };
    expect(toInsightHypotheses([criticalSupplierGap], strict)).toEqual([]);
  });
});

describe("toGapRow", () => {
  const finding = onlyRule(
    runDetectors(healthyMetrics({ suppliers: [compliantSupplier(1, { contractOnFile: false })] })),
    "supplier-compliance-missing"
  );

  it("maps the finding onto the table columns", () => {
    const row = toGapRow(finding, NOW);
    expect(row.category).toBe("risk");
    expect(row.severity).toBe("high");
    expect(row.evidence_count).toBe(1);
    expect(row.requires_human_approval).toBe(true);
    expect(row.fingerprint).toBe(finding.fingerprint);
    expect(row.last_seen_at).toBe(NOW);
    expect(row.detected_by).toBe(KORA_ACTOR_ID);
  });

  it("omits status entirely, so a re-detection cannot silently reopen a resolved gap", () => {
    const row: GapUpsertRow = toGapRow(finding, NOW);
    expect("status" in row).toBe(false);
  });
});

describe("toInsightRow", () => {
  it("maps a hypothesis onto the table columns as an unvalidated hypothesis", () => {
    const finding = onlyRule(
      runDetectors(
        healthyMetrics({
          suppliers: [1, 2, 3].map((i) => compliantSupplier(i, { contractOnFile: false })),
        })
      ),
      "supplier-compliance-missing"
    );
    const row: InsightInsertRow = toInsightRow(toInsightHypotheses([finding])[0]);
    expect(row.status).toBe("hypothesis");
    expect(row.evidence_count).toBe(3);
    expect(row.confidence_level).toBe("medium");
    expect(row.confidence_score).toBe(55);
  });
});

describe("createKoraStore", () => {
  function fakeBackend() {
    const seen: { table: string; op: string; rows: unknown; onConflict?: string }[] = [];
    const backend = {
      from(table: string) {
        return {
          async upsert(rows: GapUpsertRow[], opts: { onConflict: string }) {
            seen.push({ table, op: "upsert", rows, onConflict: opts.onConflict });
            return { error: null };
          },
          async insert(rows: InsightInsertRow[]) {
            seen.push({ table, op: "insert", rows });
            return { error: null };
          },
        };
      },
    };
    return { backend, seen };
  }

  it("upserts gaps on the fingerprint so re-runs refresh instead of duplicating", async () => {
    const { backend, seen } = fakeBackend();
    const store = createKoraStore(backend);
    await store.upsertGaps([{ fingerprint: "kora:x" } as GapUpsertRow]);
    expect(seen[0].table).toBe("system_gaps");
    expect(seen[0].onConflict).toBe("fingerprint");
  });

  it("writes hypotheses to the insights table", async () => {
    const { backend, seen } = fakeBackend();
    const store = createKoraStore(backend);
    await store.insertInsights([{ title: "t" } as InsightInsertRow]);
    expect(seen[0].table).toBe("insights");
  });

  it("propagates a write error rather than hiding it", async () => {
    const backend = {
      from: () => ({
        upsert: async () => ({ error: { message: "constraint violated" } }),
        insert: async () => ({ error: { message: "constraint violated" } }),
      }),
    };
    const store = createKoraStore(backend);
    const result = await store.upsertGaps([{ fingerprint: "kora:x" } as GapUpsertRow]);
    expect(result.error?.message).toBe("constraint violated");
  });
});

describe("evaluateKoraWrite — KORA's own governance", () => {
  it("may file findings at the default operating level", () => {
    expect(evaluateKoraWrite(DEFAULT_KORA_THRESHOLDS, 3).allowed).toBe(true);
  });

  it("may not write anything while the company only observes or recommends", () => {
    for (const level of [0, 1] as const) {
      const decision = evaluateKoraWrite({ ...DEFAULT_KORA_THRESHOLDS, companyLevel: level }, 3);
      expect(decision.allowed).toBe(false);
      expect(decision.reason.length).toBeGreaterThan(0);
    }
  });

  it("is unaffected by a generous dial — KORA's write is internal, never external", () => {
    const decision = evaluateKoraWrite({ ...DEFAULT_KORA_THRESHOLDS, companyLevel: 4 }, 3);
    expect(decision.allowed).toBe(true);
  });
});

describe("runKoraAudit", () => {
  it("degrades instead of throwing when the platform is unreachable", async () => {
    // A scheduled auditor must never take down the scheduler that invoked it.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const report = await runKoraAudit();
      expect(report.error).toBeTruthy();
      expect(report.gapsRecorded).toBe(0);
      expect(report.blockedReason).toBeNull();
      expect(report.startedAt.length).toBeGreaterThan(0);
    } finally {
      if (url !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = url;
      if (key !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = key;
    }
  });
});
