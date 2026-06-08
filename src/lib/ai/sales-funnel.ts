// ─── Kivara Sales Funnel Engine ────────────────────────────────────────
// Lead pipeline tracking, conversion analytics, and funnel metrics.

export type FunnelStage =
  | "inquiry"
  | "qualified"
  | "proposal_sent"
  | "negotiation"
  | "deposit_received"
  | "confirmed"
  | "completed"
  | "lost";

export interface FunnelEntry {
  id: string;
  guestName: string;
  email: string;
  leadScore: number;
  leadTier: "hot" | "warm" | "cold";
  stage: FunnelStage;
  source: string;
  destination: string;
  estimatedValue: number;
  currency: string;
  assignedConcierge?: string;
  enteredStageAt: string;
  createdAt: string;
  lastActivityAt: string;
  tags: string[];
  notes: string;
}

export interface FunnelMetrics {
  totalLeads: number;
  activeLeads: number;
  hotLeads: number;
  conversionRate: number;
  averageLeadScore: number;
  averageDealSize: number;
  stageBreakdown: Record<FunnelStage, number>;
  sourceBreakdown: Record<string, number>;
  velocity: number; // average days from inquiry to confirmed
}

export class SalesFunnel {
  /**
   * Calculate funnel metrics from a set of entries.
   */
  calculateMetrics(entries: FunnelEntry[]): FunnelMetrics {
    const activeStages: FunnelStage[] = ["inquiry", "qualified", "proposal_sent", "negotiation", "deposit_received"];
    const active = entries.filter(e => activeStages.includes(e.stage));
    const confirmed = entries.filter(e => e.stage === "confirmed");
    const completed = entries.filter(e => e.stage === "completed");
    const lost = entries.filter(e => e.stage === "lost");

    const stageBreakdown = {} as Record<FunnelStage, number>;
    for (const stage of ["inquiry", "qualified", "proposal_sent", "negotiation", "deposit_received", "confirmed", "completed", "lost"] as FunnelStage[]) {
      stageBreakdown[stage] = entries.filter(e => e.stage === stage).length;
    }

    const sourceBreakdown: Record<string, number> = {};
    for (const entry of entries) {
      sourceBreakdown[entry.source] = (sourceBreakdown[entry.source] || 0) + 1;
    }

    const totalLeads = entries.length;
    const converted = confirmed.length + completed.length;
    const conversionRate = totalLeads > 0 ? (converted / totalLeads) * 100 : 0;

    const scores = entries.map(e => e.leadScore);
    const averageLeadScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const dealSizes = entries.filter(e => e.estimatedValue > 0).map(e => e.estimatedValue);
    const averageDealSize = dealSizes.length > 0 ? dealSizes.reduce((a, b) => a + b, 0) / dealSizes.length : 0;

    // Velocity: average days from inquiry to confirmed
    const velocityEntries = confirmed.map(e => {
      const created = new Date(e.createdAt);
      const confirmed = new Date(e.enteredStageAt);
      return Math.round((confirmed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    });
    const velocity = velocityEntries.length > 0
      ? velocityEntries.reduce((a, b) => a + b, 0) / velocityEntries.length
      : 0;

    return {
      totalLeads,
      activeLeads: active.length,
      hotLeads: entries.filter(e => e.leadTier === "hot").length,
      conversionRate: Math.round(conversionRate * 10) / 10,
      averageLeadScore: Math.round(averageLeadScore * 10) / 10,
      averageDealSize: Math.round(averageDealSize),
      stageBreakdown,
      sourceBreakdown,
      velocity: Math.round(velocity * 10) / 10,
    };
  }

  /**
   * Determine the recommended next action for a lead at their current stage.
   */
  getRecommendedAction(entry: FunnelEntry): string {
    const actions: Record<FunnelStage, string> = {
      inquiry: "Review inquiry details and qualify lead. Send personalised response within 24 hours.",
      qualified: "Prepare curated itinerary proposal. Match properties to preferences.",
      proposal_sent: "Follow up within 48 hours if no response. Prepare alternatives for negotiation.",
      negotiation: "Refine proposal based on feedback. Discuss payment terms and dates.",
      deposit_received: "Send booking confirmation and payment receipt. Begin itinerary finalisation.",
      confirmed: "Send final itinerary and welcome package. Schedule pre-trip reminders.",
      completed: "Send post-trip follow-up. Request review and referral.",
      lost: "Archive with notes on why lost. Consider re-engagement campaign in 90 days.",
    };
    return actions[entry.stage] || "Review manually.";
  }

  /**
   * Generate a summary report for a set of funnel entries.
   */
  generateReport(entries: FunnelEntry[]): string {
    const metrics = this.calculateMetrics(entries);
    const lines = [
      "═══════════════════════════════════════",
      "  KIVARA LUXURY TRAVEL : SALES FUNNEL REPORT",
      "═══════════════════════════════════════",
      "",
      `  Total Leads: ${metrics.totalLeads}`,
      `  Active Leads: ${metrics.activeLeads}`,
      `  Hot Leads: ${metrics.hotLeads}`,
      `  Conversion Rate: ${metrics.conversionRate}%`,
      `  Average Lead Score: ${metrics.averageLeadScore}/100`,
      `  Average Deal Size: $${metrics.averageDealSize.toLocaleString()}`,
      `  Sales Velocity: ${metrics.velocity} days`,
      "",
      "  ── STAGE BREAKDOWN ──",
      ...Object.entries(metrics.stageBreakdown)
        .filter(([_, count]) => count > 0)
        .map(([stage, count]) => `  ${stage}: ${count}`),
      "",
      "  ── SOURCE BREAKDOWN ──",
      ...Object.entries(metrics.sourceBreakdown)
        .map(([source, count]) => `  ${source}: ${count}`),
      "",
      "═══════════════════════════════════════",
    ];
    return lines.join("\n");
  }
}

export const salesFunnel = new SalesFunnel();
