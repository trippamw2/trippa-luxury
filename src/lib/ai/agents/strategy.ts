// Strategy & Intelligence department (Master OS §5A).
//
// Five agents: strategist, market-research, competitor-intelligence,
// opportunity-detection, scenario-planning.
//
// Every function here is PURE: snapshot in, report out. No I/O, no LLM, no
// clock. That is deliberate and it is the point of the module - these are
// recommend-only roles, so the only defensible thing they can do is add up
// numbers that already exist in Postgres and state plainly when the data they
// would need is not there.
//
// The temptation with a "market research" or "competitor intelligence" agent is
// to let the model fill the silence with plausible-sounding destination trends
// and rival pricing. competitor-intelligence's own registry permissions say
// "never fabricate competitor facts", and Kivara has no competitor data source
// in the database, so that agent's honest output is a report saying it has no
// competitor data. That is a real result, not a failure.

import {
  report,
  evidenceFor,
  type AgentReport,
  type PlatformSnapshot,
} from "@/lib/ai/capabilities/data";

// ─── strategist ───────────────────────────────────────────────────────────────

export interface StrategicObjective {
  id: string;
  objective: string;
  evidence: string;
  /** Which direction of travel is a real improvement, stated in platform terms. */
  direction: string;
}

export interface StrategistFindings {
  objectives: StrategicObjective[];
  riskCount: number;
  /** The single most material thing the founder should look at. */
  focus: string;
}

export function runStrategist(snapshot: PlatformSnapshot): AgentReport<StrategistFindings> {
  const { funnel, journeys, suppliers } = snapshot;
  const objectives: StrategicObjective[] = [];

  if (funnel.inquiries > 0) {
    const conversion =
      funnel.inquiries > 0 ? Math.round((funnel.convertedInquiries / funnel.inquiries) * 1000) / 10 : 0;
    objectives.push({
      id: "conversion",
      objective: `Convert more of the ${funnel.inquiries} recorded inquiries`,
      evidence: `${funnel.convertedInquiries} of ${funnel.inquiries} inquiries have an attributed booking (${conversion}%)`,
      direction: "Raising the attributed-inquiry-to-booking rate raises revenue without new lead volume",
    });
  }

  if (funnel.inquiries > 0 && funnel.convertedInquiries === 0) {
    objectives.push({
      id: "zero-conversion",
      objective: "Diagnose why no inquiry has produced an attributed booking",
      evidence: `${funnel.inquiries} inquiries exist and 0 bookings reference an inquiry via bookings.inquiry_id`,
      direction: "Either attribution is broken or the sales loop is; both are worth more than any marketing change",
    });
  }

  const nonCompliant = suppliers.filter(
    (s) => s.status === "active" && (s.contractOnFile === false || s.insuranceOnFile === false)
  ).length;
  if (nonCompliant > 0) {
    objectives.push({
      id: "supplier-compliance",
      objective: `Close compliance files for ${nonCompliant} active suppliers`,
      evidence: `${nonCompliant} active suppliers have contract_on_file or insurance_on_file = false`,
      direction: "Removes the largest operational and legal exposure in the supplier base",
    });
  }

  const thinMargin = journeys.filter(
    (j) => j.sellingPrice !== null && j.supplierCost !== null && j.sellingPrice > 0 &&
      (j.sellingPrice - j.supplierCost) / j.sellingPrice < 0.3
  ).length;
  if (thinMargin > 0) {
    objectives.push({
      id: "margin",
      objective: `Review margin on ${thinMargin} journeys below 30%`,
      evidence: `${thinMargin} of ${journeys.length} journeys price under 30% above supplier cost`,
      direction: "Margin repair on existing journeys needs no new demand",
    });
  }

  const focus =
    objectives[0]?.objective ??
    "No strategic objective could be derived: the platform has no inquiries, journeys or suppliers to read.";

  return report(
    {
      agent: "strategist",
      evidenceBasis: evidenceFor("inquiries", "bookings", "journeys", "suppliers"),
      unavailableInputs: ["Recorded objectives and targets (no objectives table exists)"],
      requiresHumanApproval: true,
    },
    { objectives, riskCount: objectives.length, focus }
  );
}

// ─── market-research ──────────────────────────────────────────────────────────

export interface DestinationSignal {
  destination: string;
  inquiries: number;
  bookings: number;
  /** Is this destination actually sellable, or is it demand for something we lack? */
  inCatalogue: boolean;
  activeTours: number;
}

export interface MarketResearchFindings {
  signals: DestinationSignal[];
  emerging: DestinationSignal[];
  /** Demand the catalogue cannot currently serve - the actionable finding. */
  unmetDemand: DestinationSignal[];
}

export function runMarketResearch(
  snapshot: PlatformSnapshot
): AgentReport<MarketResearchFindings> {
  const catalogue = new Set(snapshot.destinations.map((d) => d.name.toLowerCase()));
  const activeToursByDest = new Map<string, number>();
  for (const tour of snapshot.tours) {
    if (tour.isActive === false || !tour.destination) continue;
    const key = tour.destination.toLowerCase();
    activeToursByDest.set(key, (activeToursByDest.get(key) ?? 0) + 1);
  }

  const names = new Set([
    ...Object.keys(snapshot.funnel.destinationsRequested),
    ...Object.keys(snapshot.funnel.bookedDestinations),
  ]);

  const signals: DestinationSignal[] = [...names]
    .filter((name) => name !== "unspecified")
    .map((name) => {
      const key = name.toLowerCase();
      return {
        destination: name,
        inquiries: snapshot.funnel.destinationsRequested[name] ?? 0,
        bookings: snapshot.funnel.bookedDestinations[name] ?? 0,
        inCatalogue: catalogue.has(key),
        activeTours: activeToursByDest.get(key) ?? 0,
      };
    })
    .sort((a, b) => b.inquiries - a.inquiries || b.bookings - a.bookings);

  // "Emerging" is defined operationally as demand above the median, so the claim
  // is reproducible from the data rather than a matter of opinion.
  const withDemand = signals.filter((s) => s.inquiries > 0);
  const threshold = medianOf(withDemand.map((s) => s.inquiries));
  const emerging =
    threshold === null ? [] : withDemand.filter((s) => s.inquiries > threshold);

  return report(
    {
      agent: "market-research",
      evidenceBasis: evidenceFor("inquiries", "bookings", "tours", "destinations"),
      unavailableInputs: [
        "Search volume and trend data (no external data source is connected)",
        "Competitor destination pricing",
      ],
      requiresHumanApproval: true,
    },
    {
      signals,
      emerging,
      unmetDemand: signals.filter((s) => s.inquiries > 0 && !s.inCatalogue),
    }
  );
}

function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// ─── competitor-intelligence ──────────────────────────────────────────────────

export interface CompetitorFinding {
  claim: string;
  /** Always one of these: this agent has no competitor data and says so. */
  basis: "no-data";
}

export interface CompetitorIntelligenceFindings {
  /** Named inputs this agent would need and does not have. */
  missingInputs: string[];
  /** What can honestly be said about positioning without any competitor data. */
  ownPositioning: string[];
  findings: CompetitorFinding[];
}

export function runCompetitorIntelligence(
  snapshot: PlatformSnapshot
): AgentReport<CompetitorIntelligenceFindings> {
  const missingInputs = [
    "Competitor rate cards (Kivara records no competitor pricing)",
    "Competitor booking volumes or market share",
    "Luxury-travel trend reports (no external data source is connected)",
  ];

  // The one thing this agent can state truthfully is Kivara's own positioning,
  // read from the destinations the business actually markets.
  const ownPositioning = snapshot.destinations
    .filter((d) => d.tagline)
    .map((d) => `${d.name}: ${d.tagline as string}`);

  return report(
    {
      agent: "competitor-intelligence",
      // With no competitor table, the evidence basis is Kivara's own catalogue -
      // which supports positioning claims but says nothing about rivals.
      evidenceBasis: ownPositioning.length > 0 ? evidenceFor("destinations") : [],
      unavailableInputs: missingInputs,
      requiresHumanApproval: true,
    },
    {
      missingInputs,
      ownPositioning,
      findings: [
        {
          claim:
            "No competitive analysis can be produced. Kivara has no competitor data source, and estimating one would violate this agent's own permission to never fabricate competitor facts.",
          basis: "no-data",
        },
      ],
    }
  );
}

// ─── opportunity-detection ────────────────────────────────────────────────────

export interface Opportunity {
  id: string;
  kind: "opportunity" | "threat";
  statement: string;
  evidence: string;
  magnitude: "low" | "medium" | "high";
}

export interface OpportunityDetectionFindings {
  opportunities: Opportunity[];
  threats: Opportunity[];
}

export function runOpportunityDetection(
  snapshot: PlatformSnapshot
): AgentReport<OpportunityDetectionFindings> {
  const { funnel, suppliers, journeys, guests } = snapshot;
  const opportunities: Opportunity[] = [];
  const threats: Opportunity[] = [];

  // Real partnerships need real compliance. This is the platform's own most
  // actionable opportunity signal, and it is entirely derived from data.
  const partnerReady = suppliers.filter(
    (s) =>
      s.status === "active" &&
      s.contractOnFile === true &&
      s.insuranceOnFile === true &&
      (s.rating ?? 0) >= 4
  );
  if (partnerReady.length > 0) {
    opportunities.push({
      id: "partner-ready",
      kind: "opportunity",
      statement: `${partnerReady.length} suppliers are contract-complete, insured and rated 4+ — the raw material for strategic partnerships`,
      evidence: `suppliers where status=active AND contract_on_file AND insurance_on_file AND rating>=4`,
      magnitude: partnerReady.length >= 5 ? "high" : "medium",
    });
  }

  const vipGuests = guests.filter((g) => g.isVip === true);
  if (vipGuests.length > 0) {
    opportunities.push({
      id: "vip-retention",
      kind: "opportunity",
      statement: `${vipGuests.length} guests are flagged VIP, a retention surface Kivara has no dedicated flow for`,
      evidence: "guest_profiles.is_vip = true",
      magnitude: vipGuests.length >= 10 ? "high" : "medium",
    });
  }

  const repeatSources = Object.entries(funnel.sources).filter(([, n]) => n > 0);
  if (repeatSources.length > 1) {
    opportunities.push({
      id: "channel-mix",
      kind: "opportunity",
      statement: `Inquiries arrive from ${repeatSources.length} distinct recorded sources, so channel performance can be attributed`,
      evidence: `inquiries.source distribution: ${repeatSources.map(([s, n]) => `${s}=${n}`).join(", ")}`,
      magnitude: "low",
    });
  }

  // Threats are equally data-derived.
  const blacklisted = suppliers.filter((s) => s.status === "blacklisted");
  if (blacklisted.length > 0) {
    threats.push({
      id: "blacklisted-suppliers",
      kind: "threat",
      statement: `${blacklisted.length} suppliers are blacklisted and may still appear on in-flight itineraries`,
      evidence: "suppliers.status = 'blacklisted'",
      magnitude: "high",
    });
  }

  const negativeMargin = journeys.filter(
    (j) => j.sellingPrice !== null && j.supplierCost !== null && j.sellingPrice - j.supplierCost < 0
  );
  if (negativeMargin.length > 0) {
    threats.push({
      id: "negative-margin",
      kind: "threat",
      statement: `${negativeMargin.length} journeys are priced below their own supplier cost`,
      evidence: "journeys where total_selling_price < total_supplier_cost",
      magnitude: "high",
    });
  }

  const uncontacted = funnel.inquiryStatuses["new"] ?? 0;
  if (uncontacted > 0) {
    threats.push({
      id: "unanswered-inquiries",
      kind: "threat",
      statement: `${uncontacted} inquiries are still in status 'new'`,
      evidence: "inquiries.status = 'new'",
      magnitude: uncontacted >= 5 ? "high" : "medium",
    });
  }

  return report(
    {
      agent: "opportunity-detection",
      evidenceBasis: evidenceFor("inquiries", "suppliers", "journeys", "guest_profiles"),
      unavailableInputs: [
        "Competitor moves (no competitor data source)",
        "External market growth rates (no external data source)",
      ],
      requiresHumanApproval: true,
    },
    { opportunities, threats }
  );
}

// ─── scenario-planning ────────────────────────────────────────────────────────

export interface Scenario {
  name: "base" | "upside" | "downside";
  /** Assumptions, stated as multipliers so the scenario is reproducible. */
  assumptions: string[];
  projectedBookings: number;
  projectedRevenue: number;
  projectedAverageBookingValue: number;
}

export interface ScenarioPlanningFindings {
  scenarios: Scenario[];
  /** The variable the scenarios are most sensitive to. */
  keyDriver: string;
  /** True when there is not enough data for the projection to mean anything. */
  indicativeOnly: boolean;
}

export function runScenarioPlanning(
  snapshot: PlatformSnapshot
): AgentReport<ScenarioPlanningFindings> {
  const { funnel } = snapshot;
  const currentBookings = funnel.bookings;
  const abv = funnel.averageBookingValue;

  const build = (
    name: Scenario["name"],
    bookingFactor: number,
    priceFactor: number,
    assumptions: string[]
  ): Scenario => ({
    name,
    assumptions,
    projectedBookings: Math.round(currentBookings * bookingFactor),
    projectedRevenue: Math.round(currentBookings * bookingFactor * abv * priceFactor),
    projectedAverageBookingValue: Math.round(abv * priceFactor),
  });

  const scenarios: Scenario[] = [
    build(
      "base",
      1,
      1,
      ["Bookings hold at the current recorded count", "Average booking value unchanged"]
    ),
    build("upside", 1.25, 1.05, [
      "Booking volume +25%",
      "Average booking value +5% through mix or pricing discipline",
    ]),
    build("downside", 0.8, 1, [
      "Booking volume -20%",
      "Average booking value unchanged",
    ]),
  ];

  // A projection from one or two bookings is arithmetic, not forecasting. Say so
  // rather than presenting three tidy scenarios as if they carried confidence.
  const indicativeOnly = currentBookings < 5;

  return report(
    {
      agent: "scenario-planning",
      evidenceBasis: evidenceFor("bookings", "inquiries"),
      unavailableInputs: [
        "Pipeline value by stage (no deal/deal-stage table exists)",
        "Seasonality coefficients (no historical year of bookings to fit)",
      ],
      requiresHumanApproval: true,
    },
    {
      scenarios,
      keyDriver:
        funnel.inquiries > funnel.convertedInquiries
          ? "Inquiry-to-booking conversion: the gap between recorded inquiries and attributed bookings is larger than any pricing effect in these scenarios"
          : "Average booking value, since attributed conversion is already at or above inquiry volume",
      indicativeOnly,
    }
  );
}

export const STRATEGY_AGENTS = {
  strategist: runStrategist,
  "market-research": runMarketResearch,
  "competitor-intelligence": runCompetitorIntelligence,
  "opportunity-detection": runOpportunityDetection,
  "scenario-planning": runScenarioPlanning,
} as const;
