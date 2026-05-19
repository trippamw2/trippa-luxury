// ─── Kivara Concierge Workflow Engine ───────────────────────────────────
// State machine managing the full client lifecycle.
// Each "agent" is an automated step that transitions the state.

export type ConciergeState =
  | "new"              // Enquiry received — auto-triggered
  | "qualifying"       // Concierge reviewing needs
  | "curating"         // AI generating journey
  | "quoted"           // Quote sent to client
  | "reviewing"        // Client reviewing quote
  | "provisional"      // Client approved, awaiting payment
  | "deposit-paid"     // Deposit received
  | "confirmed"        // Full payment received
  | "itinerary-sent"   // Final docs + briefing sent
  | "in-progress"      // Client is traveling
  | "completed"        // Client returned home
  | "follow-up"        // Post-trip engagement sent
  | "archived";        // Closed

export type WorkflowAction =
  | "enquiry_received"
  | "concierge_assigned"
  | "journey_curated"
  | "quote_sent"
  | "client_reviewed"
  | "quote_approved"
  | "deposit_paid"
  | "balance_paid"
  | "itinerary_delivered"
  | "travel_started"
  | "travel_completed"
  | "follow_up_sent"
  | "client_reviewed_followup"
  | "archived";

interface StateTransition {
  from: (ConciergeState | "*")[];
  to: ConciergeState;
  agent: string; // which concierge agent handles this
  automatic: boolean; // can this transition happen automatically?
  description: string;
}

export interface ClientJourney {
  id: string;
  clientName: string;
  email: string;
  phone?: string;
  state: ConciergeState;
  assignedConcierge?: string;
  enquiryDate: string;
  destination?: string;
  preferredDates?: string;
  guests?: number;
  notes?: string;
  journeySummary?: string;
  quoteAmount?: number;
  currency?: string;
  quoteSentAt?: string;
  depositAmount?: number;
  depositPaidAt?: string;
  balanceAmount?: number;
  balancePaidAt?: string;
  itineraryUrl?: string;
  travelStart?: string;
  travelEnd?: string;
  remindersSent: { type: string; sentAt: string }[];
  followUpsSent: { type: string; sentAt: string; response?: string }[];
  createdAt: string;
  updatedAt: string;
}

// ─── State Machine Definition ───────────────────────────────────────────

const TRANSITIONS: StateTransition[] = [
  { from: ["new"], to: "qualifying", agent: "human-concierge", automatic: false, description: "Concierge reviews enquiry and assigns themselves" },
  { from: ["qualifying"], to: "curating", agent: "ai-curator", automatic: true, description: "AI generates personalized journey from guest profile" },
  { from: ["curating"], to: "quoted", agent: "human-concierge", automatic: false, description: "Concierge reviews AI draft, adjusts, sends quote to client" },
  { from: ["quoted"], to: "reviewing", agent: "email-agent", automatic: true, description: "Email delivery confirmed — client is reviewing" },
  { from: ["reviewing"], to: "provisional", agent: "human-concierge", automatic: false, description: "Client approved quote verbally or in writing" },
  { from: ["reviewing", "quoted"], to: "quoted", agent: "quote-agent", automatic: false, description: "Quote revised and resent" },
  { from: ["provisional"], to: "deposit-paid", agent: "payment-agent", automatic: true, description: "Deposit payment received via payment link" },
  { from: ["provisional", "deposit-paid"], to: "confirmed", agent: "payment-agent", automatic: true, description: "Full balance payment received" },
  { from: ["deposit-paid", "confirmed"], to: "itinerary-sent", agent: "human-concierge", automatic: false, description: "Final itinerary, vouchers, and briefing sent" },
  { from: ["itinerary-sent"], to: "in-progress", agent: "reminder-agent", automatic: true, description: "Travel start date reached" },
  { from: ["in-progress"], to: "completed", agent: "system", automatic: true, description: "Travel end date passed" },
  { from: ["completed"], to: "follow-up", agent: "follow-up-agent", automatic: true, description: "Post-trip check-in sent at D+1" },
  { from: ["follow-up"], to: "archived", agent: "human-concierge", automatic: false, description: "Client responded or 30 days passed" },
  { from: ["*"], to: "archived", agent: "human-concierge", automatic: false, description: "Manually archived (lost/dead)" },
];

// ─── Engine ─────────────────────────────────────────────────────────────

export class WorkflowEngine {
  /**
   * Check if a transition is valid.
   */
  canTransition(from: ConciergeState, to: ConciergeState): boolean {
    return TRANSITIONS.some(
      (t) => (t.from.includes(from) || t.from.includes("*")) && t.to === to
    );
  }

  /**
   * Get the agent responsible for the next step.
   */
  getNextAgent(state: ConciergeState): { agent: string; description: string } | null {
    const transition = TRANSITIONS.find((t) => t.from.includes(state) || t.from.includes("*"));
    if (!transition) return null;
    return { agent: transition.agent, description: transition.description };
  }

  /**
   * Get all available actions from current state.
   */
  getAvailableActions(state: ConciergeState): StateTransition[] {
    return TRANSITIONS.filter((t) => t.from.includes(state) || t.from.includes("*"));
  }

  /**
   * Get display color for a state (for UI).
   */
  getStateColor(state: ConciergeState): string {
    const colors: Record<ConciergeState, string> = {
      "new": "bg-blue-500",
      "qualifying": "bg-indigo-500",
      "curating": "bg-purple-500",
      "quoted": "bg-amber-500",
      "reviewing": "bg-orange-500",
      "provisional": "bg-yellow-500",
      "deposit-paid": "bg-teal-500",
      "confirmed": "bg-emerald-500",
      "itinerary-sent": "bg-green-500",
      "in-progress": "bg-sky-500",
      "completed": "bg-gray-500",
      "follow-up": "bg-violet-500",
      "archived": "bg-gray-300",
    };
    return colors[state];
  }

  /**
   * Get human-readable label for a state.
   */
  getStateLabel(state: ConciergeState): string {
    const labels: Record<ConciergeState, string> = {
      "new": "New Enquiry",
      "qualifying": "Qualifying",
      "curating": "Curating Journey",
      "quoted": "Quote Sent",
      "reviewing": "Client Reviewing",
      "provisional": "Provisional Booking",
      "deposit-paid": "Deposit Paid",
      "confirmed": "Confirmed",
      "itinerary-sent": "Itinerary Delivered",
      "in-progress": "In Residence",
      "completed": "Completed",
      "follow-up": "Follow-up",
      "archived": "Archived",
    };
    return labels[state];
  }

  /**
   * Check if automatic transitions should fire.
   */
  getAutomaticTransitions(state: ConciergeState): StateTransition[] {
    return TRANSITIONS.filter((t) => t.automatic && (t.from.includes(state) || t.from.includes("*")));
  }

  /**
   * Calculate estimated days in each state.
   */
  getEstimatedDuration(state: ConciergeState): string {
    const durations: Partial<Record<ConciergeState, string>> = {
      "new": "Same day",
      "qualifying": "1-2 days",
      "curating": "AI generates instantly",
      "quoted": "Awaiting client",
      "reviewing": "3-7 days",
      "provisional": "7-14 days",
      "deposit-paid": "Until balance due",
      "confirmed": "Until travel",
    };
    return durations[state] || "Varies";
  }
}

export const workflowEngine = new WorkflowEngine();
