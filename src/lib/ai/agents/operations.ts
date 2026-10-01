// Operations department (Master OS Â§8).
//
// Ten agents: supplier-agent, booking-coordinator, transfer-agent,
// accommodation-agent, safari-ops, activity-coordinator, guest-experience,
// travel-docs, itinerary-verification, emergency-coordinator.
//
// â”€â”€ WHY THIS DEPARTMENT IS THE DANGEROUS ONE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// The other departments produce recommendations that a founder can disagree with
// at no cost. These ten produce verdicts about whether a real guest's journey
// will work. A feasibility checker that wrongly reports "feasible" is worse than
// no checker, because operations will act on it and a guest is standing in a
// national park at the wrong time.
//
// So the default here is suspicion. Every check that cannot prove a thing is
// healthy reports `unverifiable` rather than `pass`, and only a check that
// actually finds a problem reports `fail`. The asymmetry is deliberate: a false
// pass is the expensive error, a false flag is merely noise the ops coordinator
// clears in seconds.

import {
  report,
  evidenceFor,
  type AgentReport,
  type PlatformSnapshot,
} from "@/lib/ai/capabilities/data";

export type CheckStatus = "pass" | "fail" | "unverifiable";
export type Severity = "blocker" | "warning" | "info";

export interface FeasibilityCheck {
  id: string;
  agent: string;
  subject: string;
  status: CheckStatus;
  severity: Severity;
  finding: string;
  /** What data was consulted, so a reader can judge the verdict. */
  basis: string;
}

export interface OpsFindings {
  checks: FeasibilityCheck[];
  blockers: FeasibilityCheck[];
  warnings: FeasibilityCheck[];
  unverifiable: FeasibilityCheck[];
  passCount: number;
}

function collect(checks: FeasibilityCheck[]): OpsFindings {
  const bySeverity = (s: Severity) => checks.filter((c) => c.severity === s);
  return {
    checks,
    blockers: bySeverity("blocker"),
    warnings: bySeverity("warning"),
    unverifiable: checks.filter((c) => c.status === "unverifiable"),
    passCount: checks.filter((c) => c.status === "pass").length,
  };
}

/** Supplier coverage the snapshot can actually prove, keyed by supplier id. */
function supplierIndex(snapshot: PlatformSnapshot) {
  return new Map(snapshot.suppliers.map((s) => [s.id, s]));
}

// â”€â”€â”€ itinerary-verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * The highest-consequence agent in the catalogue: it decides whether an
 * itinerary is internally consistent before guests travel on it.
 */
export function runItineraryVerification(
  snapshot: PlatformSnapshot
): AgentReport<OpsFindings> {
  const suppliers = supplierIndex(snapshot);
  const checks: FeasibilityCheck[] = [];

  const confirmed = snapshot.itineraryItems.filter(
    (i) => i.bookingStatus === "confirmed"
  );

  for (const item of confirmed) {
    // An item confirmed with a supplier that no longer exists, or that is
    // blacklisted, is a real failure: the guest is going somewhere unbookable.
    if (item.supplierId) {
      const supplier = suppliers.get(item.supplierId);
      if (!supplier) {
        checks.push({
          id: `orphan-supplier-${item.id}`,
          agent: "itinerary-verification",
          subject: item.title,
          status: "fail",
          severity: "blocker",
          finding: `Confirmed item references supplier ${item.supplierId}, which is not in the supplier register`,
          basis: "itinerary_items.supplier_id vs suppliers.id",
        });
      } else if (supplier.status === "blacklisted") {
        checks.push({
          id: `blacklisted-supplier-${item.id}`,
          agent: "itinerary-verification",
          subject: item.title,
          status: "fail",
          severity: "blocker",
          finding: `Confirmed item is held with ${supplier.name}, which is blacklisted`,
          basis: "itinerary_items.supplier_id vs suppliers.status = 'blacklisted'",
        });
      } else if (supplier.status === "inactive") {
        checks.push({
          id: `inactive-supplier-${item.id}`,
          agent: "itinerary-verification",
          subject: item.title,
          status: "fail",
          severity: "warning",
          finding: `Confirmed item is held with ${supplier.name}, which is inactive`,
          basis: "itinerary_items.supplier_id vs suppliers.status = 'inactive'",
        });
      }
    }

    // A confirmed item with no confirmation number is unverifiable, not a pass:
    // the platform cannot show that anything was actually reserved.
    if (item.bookingStatus === "confirmed" && !item.confirmationNumber) {
      checks.push({
        id: `no-confirmation-${item.id}`,
        agent: "itinerary-verification",
        subject: item.title,
        status: "unverifiable",
        severity: "warning",
        finding:
          "Item is marked confirmed but carries no confirmation number, so the booking cannot be evidenced",
        basis: "itinerary_items.confirmation_number IS NULL while booking_status = 'confirmed'",
      });
    }

    // End before start is a hard internal contradiction.
    if (item.startTime && item.endTime && item.endTime <= item.startTime) {
      checks.push({
        id: `time-order-${item.id}`,
        agent: "itinerary-verification",
        subject: item.title,
        status: "fail",
        severity: "blocker",
        finding: `Item ends at ${item.endTime} which is not after its start time ${item.startTime}`,
        basis: "itinerary_items.start_time vs end_time",
      });
    }
  }

  // Supplier-side compliance for anything actually booked. This is the same
  // check KORA raised as a platform gap, applied per item.
  for (const item of confirmed) {
    if (!item.supplierId) continue;
    const supplier = suppliers.get(item.supplierId);
    if (!supplier) continue;
    if (supplier.contractOnFile === false || supplier.insuranceOnFile === false) {
      const missing = [
        supplier.contractOnFile === false ? "contract" : null,
        supplier.insuranceOnFile === false ? "insurance" : null,
      ].filter((x): x is string => x !== null);
      checks.push({
        id: `compliance-${item.id}`,
        agent: "itinerary-verification",
        subject: item.title,
        status: "fail",
        severity: "blocker",
        finding: `Guest-facing item is held with ${supplier.name}, which has no ${missing.join(" and no ")} on file`,
        basis: "suppliers.contract_on_file / insurance_on_file",
      });
    }
  }

  // Journeys whose confirmed items reference a supplier that is not in the
  // snapshot at all cannot be verified end-to-end.
  if (confirmed.length === 0) {
    checks.push({
      id: "no-confirmed-items",
      agent: "itinerary-verification",
      subject: "platform",
      status: "unverifiable",
      severity: "info",
      finding: "No itinerary item is in status 'confirmed', so there is nothing to verify",
      basis: "itinerary_items.booking_status = 'confirmed'",
    });
  }

  return report(
    {
      agent: "itinerary-verification",
      evidenceBasis: evidenceFor("itinerary_items", "suppliers", "journeys"),
      unavailableInputs: [
        "Supplier availability calendars (no availability table is connected)",
        "Flight and road times between destinations (no distance/travel-time data)",
        "Park opening hours and seasonal closures (no destination logistics data)",
        "Weather (no forecast source)",
      ],
      requiresHumanApproval: true,
    },
    collect(checks)
  );
}

// â”€â”€â”€ supplier-agent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface SupplierMatch {
  supplier: string;
  destination: string | null;
  rating: number | null;
  commissionRate: number | null;
  compliant: boolean;
  eligible: boolean;
  disqualifiers: string[];
}

export interface SupplierAgentFindings {
  matches: SupplierMatch[];
  /** Suppliers that cannot be used, and precisely why. */
  disqualified: SupplierMatch[];
  /** Cheapest-first ordering is explicitly not what this agent does. */
  selectionBasis: string;
}

export function runSupplierAgent(
  snapshot: PlatformSnapshot,
  destination?: string
): AgentReport<SupplierAgentFindings> {
  const want = destination?.toLowerCase();

  const matches: SupplierMatch[] = snapshot.suppliers.map((supplier) => {
    const disqualifiers: string[] = [];
    if (supplier.status === "blacklisted") disqualifiers.push("blacklisted");
    if (supplier.status === "inactive") disqualifiers.push("inactive");
    if (supplier.contractOnFile !== true) disqualifiers.push("no contract on file");
    if (supplier.insuranceOnFile !== true) disqualifiers.push("no insurance on file");

    const destinationMatch =
      !want || !supplier.country ? true : supplier.country.toLowerCase() === want;

    return {
      supplier: supplier.name,
      destination: supplier.city ?? supplier.country,
      rating: supplier.rating,
      commissionRate: supplier.commissionRate,
      compliant: disqualifiers.length === 0,
      eligible: disqualifiers.length === 0 && destinationMatch,
      disqualifiers,
    };
  });

  const filtered = want
    ? matches.filter((m) => !m.disqualifiers.includes("blacklisted"))
    : matches;

  // Ranked by quality and compliance, never by cost. commission_rate is
  // deliberately absent from the sort key: the registry objective is explicit
  // that matching must never be "merely the cheapest option", and Kivara's
  // margin would reward the opposite of what a guest experiences.
  const ranked = [...filtered].sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  return report(
    {
      agent: "supplier-agent",
      evidenceBasis: evidenceFor("suppliers"),
      unavailableInputs: [
        "Live availability (no supplier availability table exists)",
        "Quoted net rates per service (Kivara records no supplier rate card)",
        "Guest-review text (no review table exists)",
      ],
      requiresHumanApproval: true,
    },
    {
      matches: ranked,
      disqualified: matches.filter((m) => !m.compliant),
      selectionBasis:
        "Eligibility first (status, contract, insurance), then supplier rating. Commission rate is reported but never used to rank.",
    }
  );
}

// â”€â”€â”€ booking-coordinator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface BookingCoordinationFinding {
  journeyId: string;
  journeyName: string;
  status: string | null;
  itemCount: number;
  unconfirmedItems: number;
  missingSupplierCount: number;
  /** Gaps a coordinator must close before the guest travels. */
  gaps: string[];
  risk: "low" | "medium" | "high";
}

export interface BookingCoordinatorFindings {
  journeys: BookingCoordinationFinding[];
  highRiskJourneys: BookingCoordinationFinding[];
}

export function runBookingCoordinator(
  snapshot: PlatformSnapshot
): AgentReport<BookingCoordinatorFindings> {
  const suppliers = supplierIndex(snapshot);

  const journeys: BookingCoordinationFinding[] = snapshot.journeys
    // Cancelled journeys need no coordination.
    .filter((j) => j.status !== "cancelled")
    .map((journey) => {
      const items = snapshot.itineraryItems.filter((i) => i.journeyId === journey.id);
      const unconfirmedItems = items.filter(
        (i) => i.bookingStatus === "pending" || i.bookingStatus === "cancelled"
      ).length;
      const missingSupplierCount = items.filter(
        (i) => i.bookingStatus === "confirmed" && (!i.supplierId || !suppliers.has(i.supplierId))
      ).length;

      const gaps: string[] = [];
      if (items.length === 0) {
        gaps.push("Journey has no itinerary items, so there is nothing coordinated");
      }
      if (unconfirmedItems > 0) {
        gaps.push(`${unconfirmedItems} of ${items.length} items are not confirmed`);
      }
      if (missingSupplierCount > 0) {
        gaps.push(`${missingSupplierCount} confirmed items reference no known supplier`);
      }
      if (journey.status === "draft" || journey.status === "designing") {
        gaps.push(`Journey is still ${journey.status}`);
      }

      const risk: BookingCoordinationFinding["risk"] =
        missingSupplierCount > 0 || gaps.length >= 3 ? "high" : gaps.length > 0 ? "medium" : "low";

      return {
        journeyId: journey.id,
        journeyName: journey.name,
        status: journey.status,
        itemCount: items.length,
        unconfirmedItems,
        missingSupplierCount,
        gaps,
        risk,
      };
    })
    .sort((a, b) => (a.risk === b.risk ? 0 : a.risk === "high" ? -1 : b.risk === "high" ? 1 : 0));

  return report(
    {
      agent: "booking-coordinator",
      evidenceBasis: evidenceFor("journeys", "itinerary_items", "suppliers"),
      unavailableInputs: [
        "Supplier confirmations outside the platform (emails, phone calls)",
        "Ground transport assignments (no transfer-booking table exists)",
        "Guest arrival times (bookings.start_date is a date, not a time)",
      ],
      requiresHumanApproval: true,
    },
    { journeys, highRiskJourneys: journeys.filter((j) => j.risk === "high") }
  );
}

// â”€â”€â”€ transfer-agent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface TransferFinding {
  journeyId: string;
  journeyName: string;
  startDate: string | null;
  hasStartDate: boolean;
  /** Transfers are only verifiable once a dated item requires one. */
  transferCoverage: "covered" | "unverifiable" | "no-journey-dates";
}

export interface TransferAgentFindings {
  transfers: TransferFinding[];
  note: string;
}

export function runTransferAgent(
  snapshot: PlatformSnapshot
): AgentReport<TransferAgentFindings> {
  // Kivara has no transfer-booking table. An arrival needs a flight number and a
  // pickup time; neither is recorded. So this agent reports coverage status per
  // journey and states that it cannot confirm any transfer, rather than emitting
  // a plan that operations would trust.
  const transfers: TransferFinding[] = snapshot.journeys
    .filter((j) => j.status !== "cancelled")
    .map((journey) => {
      const hasStartDate = journey.startDate !== null;
      return {
        journeyId: journey.id,
        journeyName: journey.name,
        startDate: journey.startDate,
        hasStartDate,
        transferCoverage: !hasStartDate ? "no-journey-dates" : "unverifiable",
      };
    });

  return report(
    {
      agent: "transfer-agent",
      evidenceBasis: evidenceFor("journeys"),
      unavailableInputs: [
        "Flight or rail arrival details (no transport-booking table exists)",
        "Pickup times and meeting points (not recorded)",
        "Road and air transfer durations between destinations (no distance data)",
        "Transfer supplier assignments (not recorded)",
      ],
      requiresHumanApproval: true,
    },
    {
      transfers,
      note: "No transfer can be confirmed from platform data. Every journey is unverifiable until arrivals and pickup times are recorded somewhere.",
    }
  );
}

// â”€â”€â”€ accommodation-agent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface AccommodationFinding {
  destination: string;
  /** Tours the platform sells there, i.e. accommodation that is actually sellable. */
  sellableOptions: number;
  matchable: boolean;
  reason: string;
}

export interface AccommodationFindings {
  destinations: AccommodationFinding[];
}

export function runAccommodationAgent(
  snapshot: PlatformSnapshot
): AgentReport<AccommodationFindings> {
  const byDestination = new Map<string, number>();
  for (const tour of snapshot.tours) {
    if (tour.isActive === false || !tour.destination) continue;
    byDestination.set(tour.destination, (byDestination.get(tour.destination) ?? 0) + 1);
  }

  const destinations: AccommodationFinding[] = [...byDestination.entries()]
    .map(([destination, count]) => ({
      destination,
      sellableOptions: count,
      matchable: count > 0,
      reason:
        count > 0
          ? `${count} active tour(s) cover this destination`
          : "No active tour covers this destination, so nothing is sellable here",
    }))
    .sort((a, b) => b.sellableOptions - a.sellableOptions);

  return report(
    {
      agent: "accommodation-agent",
      // Only `tours` is read here. `properties` and `suppliers` are genuinely
      // absent from the snapshot, so naming them as evidence would claim a
      // derivation that never happened.
      evidenceBasis: evidenceFor("tours"),
      unavailableInputs: [
        "Room availability and live rates (no availability or rate source)",
        "Property room-type inventory (properties hold no room-level inventory)",
        "Property and supplier detail (not read into this snapshot)",
        "Guest budget band (guest_profiles.budget_range is a label, not a limit)",
      ],
      requiresHumanApproval: true,
    },
    { destinations }
  );
}

// â”€â”€â”€ safari-ops â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface SafariActivity {
  title: string;
  destination: string | null;
  day: number | null;
  date: string | null;
  supplier: string | null;
  status: CheckStatus;
  finding: string;
}

export interface SafariOpsFindings {
  activities: SafariActivity[];
  safetyEscalations: SafariActivity[];
  note: string;
}

const SAFARI_TERMS = ["safari", "lodge", "game", "kruger", "luangwa", "bush", "camp", "wildlife"];

export function runSafariOps(
  snapshot: PlatformSnapshot
): AgentReport<SafariOpsFindings> {
  const suppliers = supplierIndex(snapshot);

  const activities: SafariActivity[] = snapshot.itineraryItems
    .filter((item) => {
      const haystack = `${item.title} ${item.category ?? ""} ${item.destination ?? ""}`.toLowerCase();
      return SAFARI_TERMS.some((term) => haystack.includes(term));
    })
    .map((item) => {
      const supplier = item.supplierId ? suppliers.get(item.supplierId) : undefined;
      let status: CheckStatus = "unverifiable";
      let finding = "No park, guide or safety data exists, so this activity cannot be safety-verified";
      if (item.bookingStatus === "confirmed" && item.confirmationNumber) {
        status = "pass";
        finding = `Confirmed with ${supplier?.name ?? "supplier"} under reference ${item.confirmationNumber}`;
      } else if (item.bookingStatus === "confirmed") {
        finding = "Marked confirmed but carries no confirmation number";
      } else if (item.bookingStatus === "pending" || item.bookingStatus === "cancelled") {
        status = "fail";
        finding = `Safari activity is ${item.bookingStatus}`;
      }
      if (supplier && (supplier.contractOnFile !== true || supplier.insuranceOnFile !== true)) {
        // Safety escalation overrides a confirmation: money in the bank does not
        // make an unvetted operator safe.
        status = "fail";
        finding = `Held with ${supplier.name}, which lacks compliance paperwork`;
      }
      return {
        title: item.title,
        destination: item.destination,
        day: item.day,
        date: item.date,
        supplier: supplier?.name ?? null,
        status,
        finding,
      };
    });

  // Any activity whose operator paperwork is missing is a safety escalation, and
  // the registry sends every live emergency to a human immediately.
  const safetyEscalations = activities.filter(
    (a) => a.status === "fail" && a.finding.includes("lacks compliance paperwork")
  );

  return report(
    {
      agent: "safari-ops",
      evidenceBasis: evidenceFor("itinerary_items", "suppliers"),
      unavailableInputs: [
        "Guide licensing and certification (no field exists)",
        "Park regulations, quotas and closures (no destination logistics data)",
        "Weather and seasonal water/driving conditions (no forecast source)",
        "Emergency medical cover per activity (not recorded)",
      ],
      requiresHumanApproval: true,
    },
    {
      activities,
      safetyEscalations,
      note: "No safari activity can be safety-verified from platform data. Confirmations evidence that a booking exists, not that the operator is vetted or the park conditions are right.",
    }
  );
}

// â”€â”€â”€ activity-coordinator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ActivitySlot {
  journeyId: string;
  journeyName: string;
  day: number;
  itemCount: number;
  /** Two or more items sharing one day and one start time is a real clash. */
  simultaneousCount: number;
  risk: "low" | "medium" | "high";
}

export interface ActivityCoordinatorFindings {
  slots: ActivitySlot[];
  clashes: ActivitySlot[];
}

export function runActivityCoordinator(
  snapshot: PlatformSnapshot
): AgentReport<ActivityCoordinatorFindings> {
  const byJourneyDay = new Map<string, typeof snapshot.itineraryItems>();
  for (const item of snapshot.itineraryItems) {
    if (!item.journeyId || item.bookingStatus === "cancelled") continue;
    const key = `${item.journeyId}:${item.day ?? "?"}`;
    const list = byJourneyDay.get(key) ?? [];
    list.push(item);
    byJourneyDay.set(key, list);
  }

  const journeyNames = new Map(snapshot.journeys.map((j) => [j.id, j.name]));

  const slots: ActivitySlot[] = [...byJourneyDay.entries()]
    .map(([key, items]): ActivitySlot => {
      const [journeyId, dayRaw] = key.split(":");
      const withTimes = items.filter((i) => i.startTime !== null);
      // Count items sharing a start time within the same day.
      const timeCounts = new Map<string, number>();
      for (const item of withTimes) {
        timeCounts.set(item.startTime as string, (timeCounts.get(item.startTime as string) ?? 0) + 1);
      }
      const simultaneousCount = Math.max(0, ...timeCounts.values());
      // A day with several untimed items is "medium": it may be a legitimate
      // full day, or a schedule nobody has sequenced. Cannot tell which.
      const risk: ActivitySlot["risk"] =
        simultaneousCount > 1 ? "high" : withTimes.length === 0 && items.length > 1 ? "medium" : "low";
      return {
        journeyId,
        journeyName: journeyNames.get(journeyId) ?? "Unknown journey",
        day: Number(dayRaw) || 0,
        itemCount: items.length,
        simultaneousCount,
        risk,
      };
    })
    .sort((a, b) => (a.risk === b.risk ? 0 : a.risk === "high" ? -1 : 1));

  return report(
    {
      agent: "activity-coordinator",
      evidenceBasis: evidenceFor("itinerary_items", "journeys"),
      unavailableInputs: [
        "Venue opening hours (not recorded)",
        "Dining reservation confirmations (no reservation table exists)",
        "Travel time between consecutive activities (no distance data)",
        "Guest energy or mobility constraints per day (not recorded per activity)",
      ],
      requiresHumanApproval: true,
    },
    { slots, clashes: slots.filter((s) => s.risk === "high") }
  );
}

// â”€â”€â”€ guest-experience â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GuestExperienceFinding {
  kind: "unacknowledged-inquiry" | "long-uncontacted-guest" | "unevidenced-occasion" | "vip-without-contact";
  subject: string;
  detail: string;
  severity: Severity;
}

export interface GuestExperienceFindings {
  findings: GuestExperienceFinding[];
  vipCount: number;
}

export function runGuestExperience(
  snapshot: PlatformSnapshot
): AgentReport<GuestExperienceFindings> {
  const findings: GuestExperienceFinding[] = [];

  const unanswered = snapshot.funnel.inquiryStatuses["new"] ?? 0;
  if (unanswered > 0) {
    findings.push({
      kind: "unacknowledged-inquiry",
      subject: "inquiries",
      detail: `${unanswered} inquiries are still in status 'new' and have never been picked up`,
      severity: unanswered >= 5 ? "blocker" : "warning",
    });
  }

  const vips = snapshot.guests.filter((g) => g.isVip === true);
  for (const vip of vips) {
    if (vip.lastContactedAt === null) {
      findings.push({
        kind: "vip-without-contact",
        subject: vip.name ?? vip.email ?? vip.id,
        detail: "Guest is flagged VIP but has no recorded last_contacted_at",
        severity: "warning",
      });
    }
  }

  for (const guest of snapshot.guests) {
    if (guest.specialOccasion && guest.lastContactedAt === null && guest.bookings > 0) {
      findings.push({
        kind: "unevidenced-occasion",
        subject: guest.name ?? guest.email ?? guest.id,
        detail: `Guest has travelled (${guest.bookings} booking(s)) with a ${guest.specialOccasion} recorded, but no contact is logged`,
        severity: "info",
      });
    }
  }

  return report(
    {
      agent: "guest-experience",
      evidenceBasis: evidenceFor("inquiries", "guest_profiles", "bookings"),
      unavailableInputs: [
        "In-trip service events and issue log (no service-incident table exists)",
        "Guest satisfaction survey responses (none collected)",
        "Actual feedback/complaint history (not recorded as data)",
      ],
      requiresHumanApproval: true,
    },
    { findings, vipCount: vips.length }
  );
}

// â”€â”€â”€ travel-docs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface DocumentCheck {
  id: string;
  document: "passport" | "visa" | "insurance" | "vaccination" | "itinerary-pack";
  status: CheckStatus;
  finding: string;
}

export interface TravelDocsFindings {
  documents: DocumentCheck[];
  /** Items Kivara does generate and can therefore evidence. */
  generatable: string[];
  /** Documents the platform cannot produce and the guest must be told to arrange. */
  guestMustArrange: string[];
}

export function runTravelDocs(
  snapshot: PlatformSnapshot
): AgentReport<TravelDocsFindings> {
  const activeJourneys = snapshot.journeys.filter((j) => j.status !== "cancelled");

  const documents: DocumentCheck[] = [
    {
      id: "itinerary-pack",
      document: "itinerary-pack",
      status: activeJourneys.length > 0 ? "pass" : "unverifiable",
      finding:
        activeJourneys.length > 0
          ? `Kivara generates itinerary documents; ${activeJourneys.length} active journey(s) can receive one`
          : "No active journey exists to generate a pack for",
    },
    // The remaining four are unverifiable by construction: Kivara records no
    // passport, visa, insurance or vaccination data for any guest. Saying
    // "unverifiable" is the honest answer; reporting "pass" because nobody has
    // flagged a problem would be a false assurance about guest entry.
    {
      id: "passport",
      document: "passport",
      status: "unverifiable",
      finding: "No guest passport data is recorded, so validity and six-month rules cannot be checked",
    },
    {
      id: "visa",
      document: "visa",
      status: "unverifiable",
      finding: "No visa or entry-requirement data exists for any destination",
    },
    {
      id: "insurance",
      document: "insurance",
      status: "unverifiable",
      finding: "No guest insurance records exist; the registry sends visa uncertainty to a human",
    },
    {
      id: "vaccination",
      document: "vaccination",
      status: "unverifiable",
      finding: "No health or vaccination data is recorded for any guest",
    },
  ];

  return report(
    {
      agent: "travel-docs",
      evidenceBasis: evidenceFor("journeys", "itinerary_items"),
      unavailableInputs: [
        "Guest passport numbers and expiry dates (not collected)",
        "Visa and entry requirements (no destination logistics data)",
        "Guest insurance policy records (not collected)",
        "Vaccination and health requirements (not collected)",
      ],
      requiresHumanApproval: true,
    },
    {
      documents,
      generatable: ["Final itinerary document", "Quote and invoice documents", "iCal travel dates"],
      guestMustArrange: ["Passport validity", "Visas", "Travel insurance", "Vaccinations and health prep"],
    }
  );
}

// â”€â”€â”€ emergency-coordinator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface EmergencyReadiness {
  supplierId: string;
  supplier: string;
  country: string | null;
  phone: string | null;
  complianceComplete: boolean;
  /** Whether a call could actually be placed. */
  callable: boolean;
  missing: string[];
}

export interface EmergencyCoordinatorFindings {
  suppliers: EmergencyReadiness[];
  callableCount: number;
  untestableCount: number;
  note: string;
}

export function runEmergencyCoordinator(
  snapshot: PlatformSnapshot
): AgentReport<EmergencyCoordinatorFindings> {
  const suppliers: EmergencyReadiness[] = snapshot.suppliers
    // A blacklisted supplier is not someone a guest should be calling in an
    // emergency, so it is reported separately from readiness rather than as
    // "ready".
    .filter((s) => s.status !== "blacklisted")
    .map((supplier) => {
      const missing: string[] = [];
      if (supplier.contractOnFile !== true) missing.push("contract_on_file");
      if (supplier.insuranceOnFile !== true) missing.push("insurance_on_file");
      if (!supplier.city && !supplier.country) missing.push("location");
      // A phone number is not read into the snapshot, so callability is
      // unverifiable rather than assumed.
      return {
        supplierId: supplier.id,
        supplier: supplier.name,
        country: supplier.country,
        phone: null,
        complianceComplete: missing.length === 0,
        callable: false,
        missing,
      };
    });

  return report(
    {
      agent: "emergency-coordinator",
      evidenceBasis: evidenceFor("suppliers"),
      unavailableInputs: [
        "24/7 emergency line and escalation tree (not defined in the platform)",
        "Nearest medical facility per destination (no data source)",
        "Supplier emergency phone numbers (suppliers.phone is not read into the snapshot)",
        "Guest next-of-kin and medical details (not collected)",
      ],
      requiresHumanApproval: true,
    },
    {
      suppliers,
      callableCount: 0,
      untestableCount: suppliers.length,
      note: "Readiness cannot be confirmed. No emergency contact is testable from platform data, and no in-destination medical facility information exists. Every live emergency goes to a human, and this agent is a compliance prompt for that human, not a substitute for them.",
    }
  );
}

export const OPERATIONS_AGENTS = {
  "itinerary-verification": runItineraryVerification,
  "supplier-agent": runSupplierAgent,
  "booking-coordinator": runBookingCoordinator,
  "transfer-agent": runTransferAgent,
  "accommodation-agent": runAccommodationAgent,
  "safari-ops": runSafariOps,
  "activity-coordinator": runActivityCoordinator,
  "guest-experience": runGuestExperience,
  "travel-docs": runTravelDocs,
  "emergency-coordinator": runEmergencyCoordinator,
} as const;
