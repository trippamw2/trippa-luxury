// ─── Kivara Workflow Persistence Layer ─────────────────────────────────
// Supabase-backed storage for client journeys and workflow state.
// Replaces the in-memory storage in src/app/api/ai/workflow/route.ts

import { createAdminClient } from "@/lib/supabase/admin";
import type { ClientJourney, ConciergeState } from "@/lib/ai/workflow-engine";

type SupabaseClient = ReturnType<typeof createAdminClient>;

/** Fields from the bookings table consumed when mapping rows to journeys. */
type BookingRow = {
  id: string;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  status?: string | null;
  assigned_to?: string | null;
  created_at?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  guests_count?: number | null;
  internal_notes?: string | null;
  total_amount?: number | null;
  deposit_amount?: number | null;
  balance_amount?: number | null;
  updated_at?: string | null;
};

export interface WorkflowFilters {
  state?: ConciergeState | "all";
  search?: string;
  assignedTo?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

let sharedAdminDb: SupabaseClient | null = null;

export class WorkflowPersistence {
  /**
   * Lazily create the admin client on first use so importing this module
   * never throws when env vars are missing (build/SSR safe).
   */
  private getDb(): SupabaseClient {
    if (!sharedAdminDb) {
      sharedAdminDb = createAdminClient();
    }
    return sharedAdminDb;
  }

  /**
   * List journeys with optional filters.
   */
  async list(filters: WorkflowFilters = {}): Promise<{ data: ClientJourney[]; count: number }> {
    let query = this.getDb()
      .from("bookings")
      .select("*, inquiries(*)")
      .order("created_at", { ascending: false });

    if (filters.state && filters.state !== "all") {
      query = query.eq("status", filters.state);
    }

    if (filters.search) {
      const q = filters.search;
      query = query.or(`client_name.ilike.%${q}%,client_email.ilike.%${q}%,destination.ilike.%${q}%`);
    }

    if (filters.assignedTo) {
      query = query.eq("assigned_to", filters.assignedTo);
    }

    if (filters.fromDate) {
      query = query.gte("created_at", filters.fromDate);
    }

    if (filters.toDate) {
      query = query.lte("created_at", filters.toDate);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Workflow list error:", error);
      return { data: [], count: 0 };
    }

    return {
      data: (data || []).map((item) => this.mapBookingToJourney(item)),
      count: count || 0,
    };
  }

  /**
   * Get a single journey by booking ID.
   */
  async get(id: string): Promise<ClientJourney | null> {
    const { data, error } = await this.getDb()
      .from("bookings")
      .select("*, inquiries(*)")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("Workflow get error:", error);
      return null;
    }

    return this.mapBookingToJourney(data);
  }

  /**
   * Create a new journey from an inquiry.
   */
  async createFromInquiry(
    inquiryId: string,
    clientName: string,
    email: string,
    phone?: string,
    destination?: string,
    preferredDates?: string,
    guests?: number,
    notes?: string
  ): Promise<ClientJourney | null> {
    // First check if the inquiry already has a booking
    const { data: existing } = await this.getDb()
      .from("bookings")
      .select("id")
      .eq("inquiry_id", inquiryId)
      .single();

    if (existing) {
      return this.get(existing.id);
    }

    const { data, error } = await this.getDb()
      .from("bookings")
      .insert({
        inquiry_id: inquiryId,
        client_name: clientName,
        client_email: email,
        client_phone: phone || null,
        destination: destination || null,
        start_date: preferredDates || null,
        guests_count: guests || 2,
        status: "new",
        internal_notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Workflow create error:", error);
      return null;
    }

    return this.mapBookingToJourney(data);
  }

  /**
   * Transition a journey's state.
   */
  async transition(
    id: string,
    newState: ConciergeState,
    metadata?: Record<string, unknown>
  ): Promise<ClientJourney | null> {
    const updateData: Record<string, unknown> = {
      status: newState,
    };

    // Set state-specific fields
    if (newState === "provisional" && metadata?.quoteAmount) {
      updateData.total_amount = metadata.quoteAmount;
    }
    if (newState === "deposit-paid" && metadata?.depositAmount) {
      updateData.deposit_amount = metadata.depositAmount;
      updateData.deposit_due_date = new Date().toISOString();
    }
    if (newState === "confirmed" && metadata?.balanceAmount) {
      updateData.final_amount = metadata.balanceAmount;
    }
    if (newState === "itinerary-sent" && metadata?.itineraryUrl) {
      updateData.start_date = metadata.itineraryUrl;
    }
    if (newState === "in-progress" && metadata?.travelStart) {
      updateData.start_date = metadata.travelStart;
    }
    if (newState === "completed" && metadata?.travelEnd) {
      updateData.end_date = metadata.travelEnd;
    }
    if (metadata?.assignedTo) {
      updateData.assigned_to = metadata.assignedTo;
    }
    if (metadata?.internalNotes) {
      updateData.internal_notes = metadata.internalNotes;
    }

    const { data, error } = await this.getDb()
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Workflow transition error:", error);
      return null;
    }

    return this.mapBookingToJourney(data);
  }

  /**
   * Bulk update reminders sent tracking.
   */
  async markReminderSent(bookingId: string, reminderType: string): Promise<boolean> {
    // We store reminders JSON in the booking's internal_notes or a separate field
    // For simplicity, we append to internal_notes
    const { data: current } = await this.getDb()
      .from("bookings")
      .select("internal_notes")
      .eq("id", bookingId)
      .single();

    const reminders = JSON.parse(current?.internal_notes || '{"reminders":[]}');
    reminders.reminders = reminders.reminders || [];
    reminders.reminders.push({ type: reminderType, sentAt: new Date().toISOString() });

    const { error } = await this.getDb()
      .from("bookings")
      .update({ internal_notes: JSON.stringify(reminders) })
      .eq("id", bookingId);

    return !error;
  }

  /**
   * Map a Supabase booking row to a ClientJourney.
   */
  private mapBookingToJourney(row: BookingRow): ClientJourney {
    return {
      id: row.id,
      clientName: row.client_name || "",
      email: row.client_email || "",
      phone: row.client_phone || "",
      state: (row.status as ConciergeState) || "new",
      assignedConcierge: row.assigned_to || undefined,
      enquiryDate: row.created_at?.split("T")[0] || "",
      destination: row.destination || undefined,
      preferredDates: row.start_date || undefined,
      guests: row.guests_count || undefined,
      notes: row.internal_notes || undefined,
      journeySummary: undefined,
      quoteAmount: row.total_amount ? Number(row.total_amount) : undefined,
      currency: "USD",
      quoteSentAt: undefined,
      depositAmount: row.deposit_amount ? Number(row.deposit_amount) : undefined,
      depositPaidAt: undefined,
      balanceAmount: row.balance_amount ? Number(row.balance_amount) : undefined,
      balancePaidAt: undefined,
      itineraryUrl: undefined,
      travelStart: row.start_date || undefined,
      travelEnd: row.end_date || undefined,
      remindersSent: [],
      followUpsSent: [],
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
}

export const workflowPersistence = new WorkflowPersistence();
