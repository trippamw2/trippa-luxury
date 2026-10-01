// Marketing department (Master OS §15).
//
// Five agents: brand-strategist, content-agent, storytelling-agent,
// campaign-agent, analytics-agent.
//
// The trap in this department is acquisition metrics. Kivara records where
// inquiries come from (inquiries.source) but records no campaign spend, no
// impressions, no click data and no channel-level cost. So analytics-agent and
// campaign-agent can report real *volume and conversion by recorded source*, and
// must name spend, CAC and ROI as unavailable rather than dividing by nothing.
// Converting a handful of bookings into an ROI figure would be the most
// misleading thing in the platform, because ROI implies a cost basis that does
// not exist in the database.

import {
  report,
  evidenceFor,
  type AgentReport,
  type PlatformSnapshot,
} from "@/lib/ai/capabilities/data";

// ─── analytics-agent ──────────────────────────────────────────────────────────

export interface ChannelPerformance {
  source: string;
  inquiries: number;
  attributedBookings: number;
  /** Share of inquiries from this source, rounded to 1dp. */
  inquirySharePct: number;
  /** Null when the source produced no inquiry, so the ratio is undefined. */
  conversionPct: number | null;
}

export interface AnalyticsFindings {
  channels: ChannelPerformance[];
  totalInquiries: number;
  totalAttributedBookings: number;
  overallConversionPct: number | null;
  averageBookingValue: number;
  bestConvertingChannel: ChannelPerformance | null;
  bestVolumeChannel: ChannelPerformance | null;
  /** Every field that would be needed for a true CAC/ROI read. */
  missingForCostAttribution: string[];
}

export function runAnalyticsAgent(
  snapshot: PlatformSnapshot): AgentReport<AnalyticsFindings> {
  const { funnel } = snapshot;
  const totalInquiries = funnel.inquiries;

  const channels: ChannelPerformance[] = Object.entries(funnel.sources)
    .map(([source, inquiries]) => {
      const attributedBookings = funnel.bookingsBySource[source] ?? 0;
      return {
        source,
        inquiries,
        attributedBookings,
        inquirySharePct:
          totalInquiries > 0 ? Math.round((inquiries / totalInquiries) * 1000) / 10 : 0,
        // Undefined rather than 0% when there is no inquiry volume to convert.
        conversionPct:
          inquiries > 0 ? Math.round((attributedBookings / inquiries) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => b.inquiries - a.inquiries);

  const converting = channels.filter((c) => c.conversionPct !== null);
  const bestConvertingChannel =
    converting.length > 0
      ? converting.reduce((best, c) =>
          (c.conversionPct as number) > (best.conversionPct as number) ? c : best
        )
      : null;

  const bestVolumeChannel = channels.length > 0 ? channels[0] : null;

  return report(
    {
      agent: "analytics-agent",
      evidenceBasis: evidenceFor("inquiries", "bookings"),
      unavailableInputs: [
        "Campaign and ad spend (no marketing spend table exists)",
        "Impressions, clicks and sessions (no web analytics is connected)",
        "Channel cost, so CAC and ROI cannot be computed from any source",
      ],
      requiresHumanApproval: false,
    },
    {
      channels,
      totalInquiries,
      totalAttributedBookings: funnel.convertedInquiries,
      overallConversionPct:
        totalInquiries > 0
          ? Math.round((funnel.convertedInquiries / totalInquiries) * 1000) / 10
          : null,
      averageBookingValue: funnel.averageBookingValue,
      bestConvertingChannel,
      bestVolumeChannel,
      missingForCostAttribution: [
        "marketing_spend",
        "channel_impressions",
        "channel_clicks",
        "attributed_cost_per_booking",
      ],
    }
  );
}

// ─── campaign-agent ───────────────────────────────────────────────────────────

export interface CampaignChannelRecommendation {
  channel: string;
  /** Real, from inquiries.source volume and conversion. */
  recordedInquiries: number;
  recordedConversionPct: number | null;
  rationale: string;
  /** Never populated: the platform has no spend or reach data. */
  projectedRoi: null;
}

export interface CampaignFindings {
  recommendations: CampaignChannelRecommendation[];
  objective: string;
  /** What the founder must supply before spend can be recommended. */
  requiredBeforeSpend: string[];
}

export function runCampaignAgent(
  snapshot: PlatformSnapshot): AgentReport<CampaignFindings> {
  const analytics = runAnalyticsAgent(snapshot);

  const recommendations: CampaignChannelRecommendation[] = analytics.findings.channels.map(
    (channel) => ({
      channel: channel.source,
      recordedInquiries: channel.inquiries,
      recordedConversionPct: channel.conversionPct,
      rationale:
        channel.inquiries > 0
          ? `Recorded ${channel.inquiries} inquiries from ${channel.source} with ${channel.conversionPct}% attributed conversion. This reflects Kivara's own intake, not a campaign's performance.`
          : `No recorded inquiries from ${channel.source}.`,
      // Stated as a literal null: a projection here would be a guess wearing a
      // number, and campaign-agent's registry permission is to design campaigns,
      // not to forecast returns it has no data for.
      projectedRoi: null,
    })
  );

  return report(
    {
      agent: "campaign-agent",
      evidenceBasis: evidenceFor("inquiries", "bookings"),
      unavailableInputs: [
        "Marketing spend per channel (no spend table exists)",
        "Audience reach and frequency (no media plan or ad platform connected)",
        "Historic campaign performance (no campaign table exists)",
      ],
      requiresHumanApproval: true,
    },
    {
      recommendations,
      objective:
        "Decide where to concentrate acquisition. Kivara can rank channels by recorded inquiry volume and attributed conversion, but cannot rank them by return because no cost data is recorded.",
      requiredBeforeSpend: [
        "Actual spend per channel per campaign",
        "Confirmed reach and audience size per channel",
        "Founder's acceptable cost-per-booking ceiling",
      ],
    }
  );
}

// ─── brand-strategist ─────────────────────────────────────────────────────────

/** Deterministically enforceable brand rules - no model needed to state a law. */
export interface BrandGuardrail {
  rule: string;
  /** Why it is a rule rather than a preference. */
  basis: string;
}

export interface BrandGuardrailVerdict {
  subject: string;
  compliant: boolean;
  violations: string[];
}

export interface BrandFindings {
  positioning: string[];
  guardrails: BrandGuardrail[];
  /** Tours whose own copy conflicts with the luxury positioning. */
  atRiskTours: BrandGuardrailVerdict[];
}

/**
 * Vocabulary Kivara's positioning treats as off-brand. Applied to real tour copy
 * so the verdict is reproducible, not a matter of taste.
 */
const OFF_BRAND_TERMS = ["cheapest", "budget", "discount", "cheap", "lowest price", "bargain"];

export function runBrandStrategist(
  snapshot: PlatformSnapshot): AgentReport<BrandFindings> {
  const positioning = snapshot.destinations
    .filter((d) => d.tagline)
    .map((d) => `${d.name}: ${d.tagline as string}`);

  const guardrails: BrandGuardrail[] = [
    {
      rule: "Never position on price. Kivara curates journeys; it does not sell discounts.",
      basis: "brand-strategist is granted brand authority and the business positions as a luxury curator, not a discounter",
    },
    {
      rule: "Never claim a supplier capability, certification or award the supplier record does not show.",
      basis: "supplier-intelligence treats supplier compliance as a governance matter; brand copy cannot outrun it",
    },
    {
      rule: "Publish nothing guest-facing without human approval.",
      basis: "The registry reserves publication authority for a human across content-agent and campaign-agent alike",
    },
  ];

  const atRiskTours: BrandGuardrailVerdict[] = snapshot.tours
    .filter((t) => t.isActive !== false)
    .map((tour) => {
      // tour title is the only copy guaranteed to be present on the row.
      const violations = OFF_BRAND_TERMS.filter((term) =>
        tour.title.toLowerCase().includes(term)
      );
      return { subject: tour.title, compliant: violations.length === 0, violations };
    })
    .filter((v) => !v.compliant);

  return report(
    {
      agent: "brand-strategist",
      evidenceBasis: evidenceFor("destinations", "tours"),
      unavailableInputs: [
        "Brand guideline document (no approved brand book is stored in the platform)",
        "Competitor positioning (no competitor data source)",
        "Full tour body copy (tours.description is not read into the snapshot)",
      ],
      requiresHumanApproval: true,
    },
    { positioning, guardrails, atRiskTours }
  );
}

// ─── content-agent ────────────────────────────────────────────────────────────

export interface ContentOpportunity {
  subject: string;
  kind: "destination" | "tour" | "guest-occasion";
  /** Why this subject deserves content, in data terms. */
  rationale: string;
  demand: number;
}

export interface ContentFindings {
  opportunities: ContentOpportunity[];
  /** Inventory that has demand but no tour to write about. */
  contentGaps: ContentOpportunity[];
  publishRequiresApproval: true;
}

export function runContentAgent(
  snapshot: PlatformSnapshot): AgentReport<ContentFindings> {
  const activeToursByDest = new Set(
    snapshot.tours.filter((t) => t.isActive !== false && t.destination).map((t) => t.destination as string)
  );

  const opportunities: ContentOpportunity[] = [];

  // Demand-ranked destinations that already have inventory: the highest-confidence
  // content subjects, because both demand and a real tour exist.
  for (const [destination, demand] of Object.entries(snapshot.funnel.destinationsRequested)) {
    if (destination === "unspecified" || demand === 0) continue;
    if (!activeToursByDest.has(destination)) continue;
    opportunities.push({
      subject: destination,
      kind: "destination",
      rationale: `${demand} inquiries asked about ${destination} and an active tour covers it`,
      demand,
    });
  }

  // Occasions actually recorded on guest profiles - real, and the backbone of
  // the romance positioning.
  const occasionCounts = new Map<string, number>();
  for (const guest of snapshot.guests) {
    if (!guest.specialOccasion) continue;
    occasionCounts.set(
      guest.specialOccasion,
      (occasionCounts.get(guest.specialOccasion) ?? 0) + 1
    );
  }
  for (const [occasion, count] of occasionCounts) {
    opportunities.push({
      subject: occasion,
      kind: "guest-occasion",
      rationale: `${count} guest profile(s) record a ${occasion}`,
      demand: count,
    });
  }

  const contentGaps: ContentOpportunity[] = Object.entries(
    snapshot.funnel.destinationsRequested
  )
    .filter(([destination, demand]) => destination !== "unspecified" && demand > 0)
    .filter(([destination]) => !activeToursByDest.has(destination))
    .map(([destination, demand]) => ({
      subject: destination,
      kind: "destination" as const,
      rationale: `${demand} inquiries asked about ${destination} but no active tour covers it`,
      demand,
    }));

  return report(
    {
      agent: "content-agent",
      evidenceBasis: evidenceFor("inquiries", "tours", "guest_profiles"),
      unavailableInputs: [
        "Existing published content and its performance (blog_posts performance is not read into the snapshot)",
        "Keyword and search-demand data (no external data source)",
      ],
      requiresHumanApproval: true,
    },
    {
      opportunities: opportunities.sort((a, b) => b.demand - a.demand),
      contentGaps: contentGaps.sort((a, b) => b.demand - a.demand),
      // Literal true, not a boolean field: publication authority is reserved for
      // a human by the registry, so this is not negotiable in code.
      publishRequiresApproval: true,
    }
  );
}

// ─── storytelling-agent ───────────────────────────────────────────────────────

export interface StoryAngle {
  occasion: string;
  /** The emotional shape Kivara's positioning uses: Emotion -> Story -> Experience. */
  emotionArc: string[];
  /** Real destinations that guest profiles record for this occasion. */
  candidateDestinations: string[];
  guestCount: number;
}

export interface StorytellingFindings {
  angles: StoryAngle[];
  /** Occasions the registry reserves for a human rather than a draft. */
  sensitiveOccasionsRequireHuman: true;
}

export function runStorytellingAgent(
  snapshot: PlatformSnapshot): AgentReport<StorytellingFindings> {
  // Occasions are read from real guest profiles, so every angle is anchored to
  // demand that actually exists rather than to an imagined audience.
  const byOccasion = new Map<string, { count: number; destinations: Set<string> }>();
  for (const guest of snapshot.guests) {
    if (!guest.specialOccasion) continue;
    const entry = byOccasion.get(guest.specialOccasion) ?? { count: 0, destinations: new Set<string>() };
    entry.count += 1;
    for (const destination of guest.tags) {
      // tags are free-text labels; only carry ones that match a real destination.
      const match = snapshot.destinations.find((d) => d.name.toLowerCase() === destination.toLowerCase());
      if (match) entry.destinations.add(match.name);
    }
    byOccasion.set(guest.specialOccasion, entry);
  }

  const angles: StoryAngle[] = [...byOccasion.entries()]
    .map(([occasion, entry]) => ({
      occasion,
      emotionArc: [
        `Emotion: what the guest is actually feeling about a ${occasion}`,
        `Story: the single narrative the journey has to deliver without saying it directly`,
        `Experience: the one moment that has to be unforgettable`,
        `Memory: what the guest will describe to other people afterwards`,
      ],
      candidateDestinations: [...entry.destinations],
      guestCount: entry.count,
    }))
    .sort((a, b) => b.guestCount - a.guestCount);

  return report(
    {
      agent: "storytelling-agent",
      evidenceBasis: evidenceFor("guest_profiles", "destinations"),
      unavailableInputs: [
        "Published story performance (no content analytics)",
        "Photography and film inventory (no asset library is connected)",
      ],
      requiresHumanApproval: true,
    },
    {
      angles,
      sensitiveOccasionsRequireHuman: true,
    }
  );
}

export const MARKETING_AGENTS = {
  "brand-strategist": runBrandStrategist,
  "content-agent": runContentAgent,
  "storytelling-agent": runStorytellingAgent,
  "campaign-agent": runCampaignAgent,
  "analytics-agent": runAnalyticsAgent,
} as const;
