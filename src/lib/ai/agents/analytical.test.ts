import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ANALYTICAL_AGENTS,
  analyticalAgentNames,
  isAnalyticalAgent,
  runAllAnalyticalAgents,
  runAnalyticalAgent,
  type AnalyticalAgentName,
} from "@/lib/ai/agents";
import { SNAPSHOT_TABLES } from "@/lib/ai/capabilities/data";
import type {
  AgentReport,
  GuestFact,
  ItineraryItemFact,
  JourneyFact,
  PlatformSnapshot,
  SupplierFact,
} from "@/lib/ai/capabilities/data";
import { runCompetitorIntelligence, runScenarioPlanning } from "@/lib/ai/agents/strategy";
import { runAnalyticsAgent, runCampaignAgent } from "@/lib/ai/agents/marketing";
import { runItineraryVerification, runSafariOps, runEmergencyCoordinator } from "@/lib/ai/agents/operations";
import { buildEmotionalProfile, assessRelationship } from "@/lib/ai/agents/romance";

// ─── Fixtures ──────────────────────────────────────────────────────────────────
// Hand-built snapshots, so every test runs with no Supabase connection and no
// env vars. A snapshot with no rows is just as important as a populated one: an
// agent that invents findings on an empty database is the failure mode this
// whole layer exists to prevent.

function supplier(over: Partial<SupplierFact> = {}): SupplierFact {
  return {
    id: "s-1",
    name: "Lower Zambezi Lodge",
    country: "Zambia",
    city: "Luangwa",
    status: "active",
    rating: 4.5,
    commissionRate: 15,
    contractOnFile: true,
    insuranceOnFile: true,
    certifications: ["safari"],
    ...over,
  };
}

function journey(over: Partial<JourneyFact> = {}): JourneyFact {
  return {
    id: "j-1",
    name: "Luangwa anniversary",
    status: "confirmed",
    startDate: "2026-11-01",
    endDate: "2026-11-08",
    durationDays: 8,
    destinations: ["Luangwa"],
    travellers: 2,
    sellingPrice: 12000,
    supplierCost: 7000,
    ...over,
  };
}

function item(over: Partial<ItineraryItemFact> = {}): ItineraryItemFact {
  return {
    id: "i-1",
    journeyId: "j-1",
    day: 1,
    date: "2026-11-01",
    startTime: "06:00",
    endTime: "13:00",
    title: "Morning game drive",
    location: "Lower Zambezi",
    destination: "Luangwa",
    category: "safari",
    supplierId: "s-1",
    bookingStatus: "confirmed",
    confirmationNumber: "CONF-9",
    cost: 300,
    sellingPrice: 600,
    ...over,
  };
}

function guest(over: Partial<GuestFact> = {}): GuestFact {
  return {
    id: "g-1",
    name: "A Guest",
    email: "guest@example.com",
    bookings: 0,
    lastContactedAt: "2026-09-01T00:00:00Z",
    totalSpend: 0,
    isVip: false,
    source: "website",
    tags: [],
    interests: [],
    wishlist: [],
    specialOccasion: null,
    travelStyle: null,
    activityLevel: null,
    budgetRange: null,
    notes: null,
    lastTripDate: null,
    ...over,
  };
}

function snapshot(over: Partial<PlatformSnapshot> = {}): PlatformSnapshot {
  return {
    suppliers: [],
    journeys: [],
    itineraryItems: [],
    tours: [],
    destinations: [],
    funnel: {
      inquiries: 0,
      bookings: 0,
      inquiryStatuses: {},
      bookingStatuses: {},
      sources: {},
      bookingsBySource: {},
      destinationsRequested: {},
      bookedDestinations: {},
      revenue: 0,
      averageBookingValue: 0,
      medianDaysToBook: null,
      convertedInquiries: 0,
    },
    guests: [],
    readFailures: [],
    ...over,
  };
}

const EMPTY = snapshot();

function populated(): PlatformSnapshot {
  return snapshot({
    suppliers: [supplier(), supplier({ id: "s-2", name: "No Paper Co", contractOnFile: false })],
    journeys: [journey()],
    itineraryItems: [item()],
    tours: [{ id: "t-1", title: "Luangwa Safari", destination: "Luangwa", category: "Safari", isActive: true }],
    destinations: [{ slug: "luangwa", name: "Luangwa", tagline: "Where the wild still feels wild" }],
    guests: [guest({ specialOccasion: "anniversary", travelStyle: "romantic", budgetRange: "premium" })],
    funnel: {
      ...EMPTY.funnel,
      inquiries: 10,
      bookings: 3,
      convertedInquiries: 3,
      inquiryStatuses: { new: 4, booked: 6 },
      sources: { website: 6, referral: 4 },
      bookingsBySource: { website: 2, referral: 1 },
      destinationsRequested: { Luangwa: 7, unsorted: 3 },
      bookedDestinations: { Luangwa: 3 },
      revenue: 36000,
      averageBookingValue: 12000,
    },
  });
}

// ─── Contract tests: all 22 ───────────────────────────────────────────────────

describe("analytical layer contract", () => {
  it("implements 22 agents", () => {
    expect(analyticalAgentNames()).toHaveLength(22);
  });

  it("recognises its own names and rejects others", () => {
    expect(isAnalyticalAgent("romance-agent")).toBe(true);
    expect(isAnalyticalAgent("quality-control")).toBe(false);
    // A prototype-pollution style name must not resolve through the map.
    expect(isAnalyticalAgent("toString")).toBe(false);
    expect(isAnalyticalAgent("constructor")).toBe(false);
  });

  it("produces a well-formed report for every agent on an empty snapshot", () => {
    for (const name of analyticalAgentNames()) {
      const report = ANALYTICAL_AGENTS[name](EMPTY);
      expect(report.agent, `${name} must name itself`).toBe(name);
      expect(Array.isArray(report.evidenceBasis), `${name} evidenceBasis`).toBe(true);
      expect(Array.isArray(report.unavailableInputs), `${name} unavailableInputs`).toBe(true);
      expect(typeof report.requiresHumanApproval, `${name} approval flag`).toBe("boolean");
      expect(report.findings, `${name} findings`).toBeDefined();
    }
  });

  it("produces a well-formed report for every agent on a populated snapshot", () => {
    const snap = populated();
    for (const name of analyticalAgentNames()) {
      expect(() => ANALYTICAL_AGENTS[name](snap), `${name} threw on real data`).not.toThrow();
    }
  });

  it("never lets dataAvailability contradict the evidence", () => {
    for (const s of [EMPTY, populated()]) {
      for (const [name, report] of Object.entries(runAllAnalyticalAgents(s))) {
        const r = report as AgentReport;
        if (r.evidenceBasis.length === 0) {
          expect(r.dataAvailability, `${name} claims availability with no evidence`).toBe(
            "unavailable"
          );
        } else if (r.unavailableInputs.length > 0) {
          expect(r.dataAvailability, `${name} hides missing inputs`).toBe("partial");
        }
        // A report that names missing inputs must still say it cannot be full.
        if (r.unavailableInputs.length > 0) {
          expect(r.dataAvailability, `${name} claims full while inputs are missing`).not.toBe(
            "full"
          );
        }
      }
    }
  });

  it("runs every agent from one snapshot without touching the database", () => {
    const reports = runAllAnalyticalAgents(populated());
    expect(Object.keys(reports)).toHaveLength(22);
  });
});

// ─── The no-fabrication guarantees ─────────────────────────────────────────────

describe("no-fabrication guarantees", () => {
  it("competitor-intelligence reports having no data instead of inventing rivals", () => {
    const report = runCompetitorIntelligence(populated());
    expect(report.findings.missingInputs.length).toBeGreaterThan(0);
    expect(report.dataAvailability).toBe("partial");
    for (const finding of report.findings.findings) {
      expect(finding.basis).toBe("no-data");
    }
    // The failure mode being guarded: an LLM-flavoured rival name or a rival
    // price appearing in the report. A fabricated competitor must be impossible
    // to emit, so the report may only carry claims that name their own absence.
    const serialised = JSON.stringify(report.findings);
    expect(serialised).not.toMatch(/\$[\d,]+/);
    expect(serialised).not.toMatch(/\d+(\.\d+)?\s*%/);
    expect(serialised).not.toMatch(/market share of/i);
    expect(report.findings.findings[0].claim).toMatch(/no competitor data source/i);
  });

  it("campaign-agent never produces an ROI projection", () => {
    const report = runCampaignAgent(populated());
    for (const rec of report.findings.recommendations) {
      expect(rec.projectedRoi).toBeNull();
    }
    expect(report.findings.requiredBeforeSpend.length).toBeGreaterThan(0);
  });

  it("analytics-agent computes real conversion per recorded source", () => {
    const report = runAnalyticsAgent(populated());
    const website = report.findings.channels.find((c) => c.source === "website");
    expect(website?.inquiries).toBe(6);
    expect(website?.attributedBookings).toBe(2);
    expect(website?.conversionPct).toBeCloseTo(33.3, 1);
    // No cost data exists, so CAC/ROI inputs are named rather than faked.
    expect(report.findings.missingForCostAttribution).toContain("marketing_spend");
  });

  it("leaves conversion undefined for a source with no inquiries", () => {
    const report = runAnalyticsAgent(
      snapshot({
        funnel: { ...EMPTY.funnel, sources: { website: 0 } },
      })
    );
    // 0 inquiries is not 0% conversion; the ratio is undefined.
    expect(report.findings.channels[0].conversionPct).toBeNull();
  });

  it("scenario-planning marks its projection indicative on thin data", () => {
    const report = runScenarioPlanning(
      snapshot({
        funnel: { ...EMPTY.funnel, bookings: 2, averageBookingValue: 5000 },
      })
    );
    expect(report.findings.indicativeOnly).toBe(true);
  });

  it("emergency-coordinator claims no contact is testable", () => {
    const report = runEmergencyCoordinator(populated());
    expect(report.findings.callableCount).toBe(0);
    expect(report.findings.untestableCount).toBeGreaterThan(0);
  });
});

// ─── The asymmetry that matters most ───────────────────────────────────────────

describe("operations default to suspicion", () => {
  it("fails a confirmed item whose supplier is blacklisted", () => {
    const report = runItineraryVerification(
      snapshot({
        suppliers: [supplier({ status: "blacklisted" })],
        itineraryItems: [item()],
      })
    );
    const blocked = report.findings.checks.find((c) => c.id.startsWith("blacklisted-supplier"));
    expect(blocked?.status).toBe("fail");
    expect(blocked?.severity).toBe("blocker");
  });

  it("fails a confirmed item whose supplier has no compliance file", () => {
    const report = runItineraryVerification(
      snapshot({ suppliers: [supplier({ insuranceOnFile: false })], itineraryItems: [item()] })
    );
    expect(report.findings.checks.some((c) => c.id.startsWith("compliance-") && c.status === "fail")).toBe(
      true
    );
  });

  it("fails an item whose end time precedes its start", () => {
    const report = runItineraryVerification(
      snapshot({ suppliers: [supplier()], itineraryItems: [item({ endTime: "05:00" })] })
    );
    const check = report.findings.checks.find((c) => c.id.startsWith("time-order"));
    expect(check?.status).toBe("fail");
  });

  it("calls a confirmed item without a reference unverifiable, not a pass", () => {
    const report = runItineraryVerification(
      snapshot({
        suppliers: [supplier()],
        itineraryItems: [item({ confirmationNumber: null })],
      })
    );
    const check = report.findings.checks.find((c) => c.id.startsWith("no-confirmation"));
    expect(check?.status).toBe("unverifiable");
    // A confirmed, compliant, referenced item is the one case that may pass.
    const passing = runItineraryVerification(
      snapshot({ suppliers: [supplier()], itineraryItems: [item()] })
    );
    expect(passing.findings.checks.some((c) => c.status === "fail")).toBe(false);
  });

  it("escalates a safari activity held with a non-compliant operator even when confirmed", () => {
    const report = runSafariOps(
      snapshot({
        suppliers: [supplier({ contractOnFile: false })],
        itineraryItems: [item({ bookingStatus: "confirmed", confirmationNumber: "REF-1" })],
      })
    );
    expect(report.findings.safetyEscalations).toHaveLength(1);
    expect(report.findings.activities[0].status).toBe("fail");
  });

  it("never safety-passes a safari activity, because no safety data exists", () => {
    const report = runSafariOps(
      snapshot({
        suppliers: [supplier()],
        itineraryItems: [item({ bookingStatus: "confirmed", confirmationNumber: "REF-1" })],
      })
    );
    // A confirmation evidences a booking, not a vetted operator.
    expect(report.findings.safetyEscalations).toHaveLength(0);
    expect(report.findings.activities[0].status).toBe("pass");
    expect(report.dataAvailability).toBe("partial");
  });
});

// ─── Individual agents with specific logic worth pinning ───────────────────────

describe("individual agent logic", () => {
  it("romance-agent marks stages inferred when the guest record is empty", () => {
    const profile = buildEmotionalProfile(guest({ lastContactedAt: null }));
    expect(profile.occasion).toBeNull();
    expect(profile.arcIsPredominantlyInferred).toBe(true);
    expect(profile.arc.map((s) => s.stage)).toEqual([
      "emotion",
      "story",
      "experience",
      "destination",
      "journey",
      "memory",
    ]);
  });

  it("romance-agent grounds the arc in recorded fields when they exist", () => {
    const profile = buildEmotionalProfile(
      guest({
        specialOccasion: "anniversary",
        travelStyle: "romantic",
        activityLevel: "low",
        budgetRange: "premium",
        interests: ["Luangwa"],
      })
    );
    expect(profile.arcIsPredominantlyInferred).toBe(false);
    expect(profile.requiresHumanSteward).toBe(false);
    expect(profile.arc.find((s) => s.stage === "emotion")?.inferred).toBe(false);
  });

  it("romance-agent escalates a sensitive occasion to a human", () => {
    const profile = buildEmotionalProfile(guest({ specialOccasion: "renewal of vows" }));
    expect(profile.requiresHumanSteward).toBe(true);
  });

  it("relationship-agent refuses outreach authority for every guest", () => {
    for (const g of [guest(), guest({ lastContactedAt: null, bookings: 3 })]) {
      expect(assessRelationship(g).outreachPermittedByThisAgent).toBe(false);
    }
  });

  it("relationship-agent calls a travelled-but-never-contacted guest at risk", () => {
    const note = assessRelationship(guest({ lastContactedAt: null, bookings: 2 }));
    expect(note.risk).toBe("at-risk");
    expect(note.riskReasons.join(" ")).toContain("no recorded contact");
  });

  it("relationship-agent calls an untouched lead a watch, not at-risk", () => {
    const note = assessRelationship(guest({ lastContactedAt: null, bookings: 0 }));
    expect(note.risk).toBe("watch");
  });
});

// ─── Type-level guarantee ──────────────────────────────────────────────────────
// This is a compile-time check expressed as a test so it cannot rot: the runner
// only accepts names that actually have a core.

describe("runner typing", () => {
  it("accepts a narrowed agent name", () => {
    const name: AnalyticalAgentName = "itinerary-verification";
    expect(analyticalAgentNames()).toContain(name);
  });
});

// ─── Evidence honesty ─────────────────────────────────────────────────────────
// The layer's central claim is that a report never cites a table it did not read.
// Two independent ways that claim can be false:
//
//   1. citing a table outside the snapshot (caught below, against SNAPSHOT_TABLES)
//   2. citing a table whose read actually failed (caught by the read-failure suite)
//
// Both were live defects while this layer was being written: accommodation-agent
// cited `properties`, which the snapshot never reads. These tests exist so that
// class of bug fails the build instead of reaching a founder-facing briefing.

describe("evidence honesty", () => {
  it("no report cites a table the snapshot does not read", () => {
    const reports = runAllAnalyticalAgents(populated());
    const read = new Set<string>(SNAPSHOT_TABLES);

    for (const [name, r] of Object.entries(reports)) {
      for (const entry of r.evidenceBasis) {
        const match = /^postgres:(.+)$/.exec(entry);
        if (!match) continue;
        expect(
          read.has(match[1]),
          `${name} cites postgres:${match[1]}, which readPlatformSnapshot never reads`
        ).toBe(true);
      }
    }
  });

  it("reads no table outside the declared snapshot set", () => {
    // Guards the two sides of the contract against drifting apart: if a future
    // read is added without updating SNAPSHOT_TABLES, this fails.
    const source = readFileSync(
      join(process.cwd(), "src/lib/ai/capabilities/data.ts"),
      "utf8"
    );
    const readTables = new Set(
      [...source.matchAll(/supabase\s*\.\s*from\("([a-z_]+)"\)/g)].map((m) => m[1])
    );
    expect(readTables.size).toBeGreaterThan(0);
    for (const table of readTables) {
      expect(
        (SNAPSHOT_TABLES as readonly string[]).includes(table),
        `data.ts reads "${table}" but SNAPSHOT_TABLES does not declare it`
      ).toBe(true);
    }
  });
});

describe("failed reads are reported as unavailable, never as empty", () => {
  // The dangerous case: a read errors, degrades to [], and the agent reports
  // "revenue 0 / zero bookings" while citing postgres:bookings as evidence.
  // The platform would be inventing a fact about itself.

  const broken = snapshot({
    readFailures: [{ table: "bookings", reason: "permission denied for schema bookings" }],
  });

  it("removes the failed table from evidenceBasis on every affected report", () => {
    const reports = runAllAnalyticalAgents(broken);
    for (const [name, r] of Object.entries(reports)) {
      expect(
        r.evidenceBasis,
        `${name} still cites postgres:bookings after that read failed`
      ).not.toContain("postgres:bookings");
    }
  });

  it("names the failure in unavailableInputs so the absence is legible", () => {
    const reports = runAllAnalyticalAgents(broken);
    const mentioning = Object.values(reports).filter((r) =>
      r.unavailableInputs.some((u) => u.includes("postgres:bookings"))
    );
    expect(mentioning.length).toBeGreaterThan(0);
    for (const r of mentioning) {
      expect(
        r.unavailableInputs.some((u) => u.includes("permission denied for schema bookings"))
      ).toBe(true);
    }
  });

  it("downgrades dataAvailability so a broken read cannot read as full", () => {
    const reports = runAllAnalyticalAgents(broken);
    for (const r of Object.values(reports)) {
      if (r.unavailableInputs.some((u) => u.startsWith("postgres:"))) {
        expect(r.dataAvailability).not.toBe("full");
      }
    }
  });

  it("leaves reports untouched when no read failed", () => {
    const reports = runAllAnalyticalAgents(populated());
    for (const r of Object.values(reports)) {
      expect(r.unavailableInputs.some((u) => u.startsWith("postgres:"))).toBe(false);
    }
  });

  it("reconciling a clean report is a no-op, not a downgrade", () => {
    // strategist legitimately reports `partial` on a healthy snapshot because it
    // has no competitor or market-price source. Reconciliation must not touch that:
    // it only ever reacts to read failures, never to an agent's own honest gaps.
    const clean = populated();
    const raw = ANALYTICAL_AGENTS.strategist(clean);
    const reconciled = runAnalyticalAgent("strategist", clean);

    expect(reconciled).toEqual(raw);
    expect(reconciled.unavailableInputs.some((u) => u.startsWith("postgres:"))).toBe(false);
  });

  it("a snapshot whose only read failed reports unavailable, not full", () => {
    // Every table failed: there is no evidence at all, so nothing may claim to
    // be operating on real data.
    const allFailed = snapshot({
      readFailures: SNAPSHOT_TABLES.map((table) => ({ table, reason: "upstream timeout" })),
    });
    const reports = runAllAnalyticalAgents(allFailed);
    for (const r of Object.values(reports)) {
      expect(r.evidenceBasis.filter((e) => e.startsWith("postgres:"))).toHaveLength(0);
      expect(r.dataAvailability).toBe("unavailable");
    }
  });
});
