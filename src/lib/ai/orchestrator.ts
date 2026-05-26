// ─── Kivara AI Agent Orchestrator ──────────────────────────────────────
// Coordinates all AI agents: reception → profiling → curation → quoting → follow-up
// Handles automatic state transitions and agent handoffs.

import { guestProfiler, type RawInquiry, type ProfiledGuest } from "./guest-profiler";
import { JourneyEngine } from "./journey-engine";
import { QuoteEngine } from "./quote-engine";
import { PaymentEngine, type PaymentLinkData, type ReceiptData } from "./payment-engine";
import { ReminderEngine, generateReminderSchedules } from "./reminder-engine";
import { FollowUpEngine, generateFollowUpSchedules } from "./follow-up-engine";
import { workflowEngine } from "./workflow-engine";
import { salesFunnel } from "./sales-funnel";
import type { CuratedJourney, GuestProfile } from "./types";
import type { ConciergeState } from "./workflow-engine";

// ─── Types ─────────────────────────────────────────────────────────────

export type AgentName =
  | "receptionist"    // First response, acknowledges inquiry
  | "profiler"        // Extracts guest preferences
  | "curator"         // Generates journey
  | "quote-specialist" // Creates quote document
  | "payment-agent"    // Handles payment links
  | "itinerary-agent"  // Finalises itinerary
  | "reminder-agent"   // Sends pre-trip reminders
  | "followup-agent"   // Post-trip engagement
  | "analyst";         // Funnel analytics

export interface AgentTask {
  agent: AgentName;
  action: string;
  dependsOn?: string[];
  priority: number; // 1 = highest
  status: "pending" | "in_progress" | "completed" | "failed";
}

export interface OrchestrationResult {
  journeyId: string;
  guestProfile: ProfiledGuest;
  journey?: CuratedJourney;
  state: ConciergeState;
  completedTasks: string[];
  pendingTasks: string[];
  errors: string[];
  documentsGenerated: string[];
  emailsSent: string[];
}

// ─── Orchestrator ──────────────────────────────────────────────────────

const journeyEngine = new JourneyEngine();
const quoteEngine = new QuoteEngine();
const paymentEngine = new PaymentEngine();
const reminderEngine = new ReminderEngine();
const followUpEngine = new FollowUpEngine();

export class AIOrchestrator {
  /**
   * Process a new inquiry end-to-end:
   * 1. Profile the guest
   * 2. Curate a journey
   * 3. Generate quote
   * 4. Prepare workflow entry
   */
  async processInquiry(
    raw: RawInquiry,
    options?: { autoCurate?: boolean; autoQuote?: boolean }
  ): Promise<OrchestrationResult> {
    const errors: string[] = [];
    const completedTasks: string[] = [];
    const pendingTasks: string[] = [];
    const documentsGenerated: string[] = [];
    const emailsSent: string[] = [];

    // Step 1: Profile guest (LLM-powered with rule-based fallback)
    let profiled: ProfiledGuest;
    try {
      profiled = await guestProfiler.llmProfile(raw);
      completedTasks.push("guest_profiling");
    } catch (err: any) {
      return {
        journeyId: `error-${Date.now()}`,
        guestProfile: null as any,
        state: "new",
        completedTasks: [],
        pendingTasks: [],
        errors: [`Guest profiling failed: ${err.message}`],
        documentsGenerated: [],
        emailsSent: [],
      };
    }

    // Step 2: Curate journey (LLM-powered with rule-based fallback)
    let journey: CuratedJourney | undefined;
    if (options?.autoCurate !== false) {
      try {
        const profile: GuestProfile = {
          id: profiled.id,
          name: profiled.name,
          email: profiled.email,
          isCouple: profiled.isCouple,
          specialOccasion: profiled.specialOccasion,
          preferences: profiled.preferences,
          travelDates: undefined,
        };
        journey = await journeyEngine.llmGenerate(profile);
        completedTasks.push("journey_curation");
      } catch (err: any) {
        errors.push(`Journey curation failed: ${err.message}`);
        pendingTasks.push("journey_curation");
      }
    } else {
      pendingTasks.push("journey_curation");
    }

    // Step 3: Generate quote (if auto-quote enabled and journey exists)
    if (options?.autoQuote !== false && journey) {
      try {
        const quote = quoteEngine.generateQuote(profiled as any);
        completedTasks.push("quote_generation");
        documentsGenerated.push(`quote_${quote.quoteRef}`);
      } catch (err: any) {
        errors.push(`Quote generation failed: ${err.message}`);
        pendingTasks.push("quote_generation");
      }
    } else {
      pendingTasks.push("quote_generation");
    }

    // Determine state based on what succeeded
    let state: ConciergeState = "new";
    if (completedTasks.includes("guest_profiling")) state = "qualifying";
    if (completedTasks.includes("journey_curation")) state = "curating";
    if (completedTasks.includes("quote_generation")) state = "quoted";

    return {
      journeyId: journey?.id || profiled.id,
      guestProfile: profiled,
      journey,
      state,
      completedTasks,
      pendingTasks,
      errors,
      documentsGenerated,
      emailsSent,
    };
  }

  /**
   * Generate a payment link for a booking and prepare receipt.
   */
  async processPayment(params: {
    bookingRef: string;
    clientName: string;
    clientEmail: string;
    amount: number;
    currency?: string;
    type: "deposit" | "balance" | "full";
    dueDate?: string;
  }): Promise<{ paymentLink: PaymentLinkData; tasks: string[] }> {
    const tasks: string[] = [];

    const link = paymentEngine.generatePaymentLink({
      bookingRef: params.bookingRef,
      clientName: params.clientName,
      clientEmail: params.clientEmail,
      amount: params.amount,
      currency: params.currency || "USD",
      type: params.type,
      dueDate: params.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      description: `${params.type === "deposit" ? "Deposit" : params.type === "balance" ? "Balance" : "Full"} payment for booking ${params.bookingRef}`,
    });

    tasks.push("payment_link_generated");
    return { paymentLink: link, tasks };
  }

  /**
   * Check and trigger any due reminders for a journey.
   */
  checkReminders(journey: {
    travelStart?: string;
    travelEnd?: string;
    state: string;
    clientName: string;
    email: string;
    destination?: string;
    bookingRef?: string;
    remindersSent: { type: string; sentAt: string }[];
  }): { dueReminders: any[]; dueFollowUps: any[] } {
    const dueReminders: any[] = [];
    const dueFollowUps: any[] = [];

    if (journey.travelStart && (journey.state === "confirmed" || journey.state === "itinerary-sent")) {
      const schedules = generateReminderSchedules(journey.travelStart);
      for (const schedule of schedules) {
        if (schedule.isDue && !journey.remindersSent.some(r => r.type === schedule.type)) {
          const content = reminderEngine.generateReminder(
            schedule.type,
            journey.clientName,
            journey.destination || "your destination",
            journey.travelStart,
            journey.bookingRef || "REF-0001"
          );
          dueReminders.push({ schedule, content });
        }
      }
    }

    if (journey.travelEnd && journey.state === "completed") {
      const schedules = generateFollowUpSchedules(journey.travelEnd);
      for (const schedule of schedules) {
        if (schedule.isDue) {
          const content = followUpEngine.generateFollowUp(
            schedule.type,
            journey.clientName,
            journey.destination || "your journey"
          );
          dueFollowUps.push({ schedule, content });
        }
      }
    }

    return { dueReminders, dueFollowUps };
  }

  /**
   * Generate a lead report for analytics.
   */
  generateAnalytics(entries: any[]) {
    return salesFunnel.calculateMetrics(entries);
  }

  /**
   * Get the next agent that should act on a journey.
   */
  getNextAgent(state: ConciergeState): { agent: AgentName; description: string } | null {
    const agentMap: Partial<Record<ConciergeState, AgentName>> = {
      "new": "receptionist",
      "qualifying": "profiler",
      "curating": "curator",
      "quoted": "quote-specialist",
      "provisional": "payment-agent",
      "deposit-paid": "payment-agent",
      "confirmed": "itinerary-agent",
      "itinerary-sent": "reminder-agent",
      "completed": "followup-agent",
      "follow-up": "analyst",
    };

    const agent = agentMap[state];
    if (!agent) return null;

    const descriptions: Record<AgentName, string> = {
      receptionist: "Send welcome and acknowledge inquiry",
      profiler: "Extract guest preferences and score lead",
      curator: "Generate personalised journey itinerary",
      "quote-specialist": "Prepare and send quote document",
      "payment-agent": "Process payment and send receipt",
      "itinerary-agent": "Finalise and deliver itinerary package",
      "reminder-agent": "Send pre-trip reminders",
      "followup-agent": "Post-trip check-in and review request",
      analyst: "Update funnel metrics and generate report",
    };

    return { agent, description: descriptions[agent] };
  }
}

export const orchestrator = new AIOrchestrator();
