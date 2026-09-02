// ─── Kivara Ops Orchestrator (Master OS §8) ─────────────────────────────────
// Coordinates the journey from arrival → transfer → accommodation → experiences
// → activities → dining → safari → celebration → departure, matching suppliers
// and services and surfacing gaps, risks, an ops checklist and emergency contacts.
// Deterministic and rule-based; reads real bookings + suppliers + services.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/admin";

export interface OpsLeg {
  leg: string;
  label: string;
  timing: string;
  matchedSuppliers: { id: string; name: string; category?: string }[];
  gaps: string[];
  notes: string;
}

export interface BookingContext {
  id: string;
  bookingReference?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  durationNights?: number;
  specialRequests?: string;
  status?: string;
}

export interface OpsPlan {
  booking: BookingContext;
  legs: OpsLeg[];
  checklist: string[];
  gaps: string[];
  risks: string[];
  emergencyContacts: string[];
  generatedAt: string;
}

const LEGS: { leg: string; label: string }[] = [
  { leg: "arrival", label: "Arrival" },
  { leg: "transfer", label: "Transfer" },
  { leg: "accommodation", label: "Accommodation" },
  { leg: "experiences", label: "Experiences" },
  { leg: "activities", label: "Activities" },
  { leg: "dining", label: "Dining" },
  { leg: "safari", label: "Safari" },
  { leg: "celebration", label: "Celebration" },
  { leg: "departure", label: "Departure" },
];

const LEG_TO_CATEGORY: Record<string, string> = {
  transfer: "transfer",
  accommodation: "lodge",
  safari: "safari",
  activities: "activity",
  experiences: "experience",
  dining: "restaurant",
  celebration: "experience",
};

export interface SupplierRef {
  id: string;
  name: string;
  category?: string;
}

/**
 * Pure: match suppliers to legs by category and build the ops plan.
 * Unit-testable — no DB access.
 */
export function buildOpsPlan(
  booking: Record<string, unknown>,
  suppliers: SupplierRef[],
  destination?: string
): OpsPlan {
  const ctx: BookingContext = {
    id: String(booking.id || ""),
    bookingReference: (booking.booking_reference as string) || undefined,
    destination: (booking.destination as string) || destination,
    startDate: (booking.start_date as string) || undefined,
    endDate: (booking.end_date as string) || undefined,
    durationNights: booking.duration_nights as number | undefined,
    specialRequests: (booking.special_requests as string) || undefined,
    status: (booking.status as string) || undefined,
  };

  const legs: OpsLeg[] = LEGS.map(({ leg, label }) => {
    const matched = suppliers.filter((s) => {
      const cat = (s.category || "").toLowerCase();
      const want = LEG_TO_CATEGORY[leg];
      return want ? cat === want || cat.includes(want) : false;
    });
    return {
      leg,
      label,
      timing: timingFor(leg, ctx.startDate, ctx.durationNights),
      matchedSuppliers: matched,
      gaps: matched.length ? [] : [`No matched supplier for ${leg}`],
      notes: noteFor(leg, matched),
    };
  });

  const gaps = legs.flatMap((l) => l.gaps);
  const risks = buildRisks(ctx, legs);
  const checklist = buildChecklist(ctx, legs);

  return {
    booking: ctx,
    legs,
    checklist,
    gaps,
    risks,
    emergencyContacts: emergencyContacts(ctx),
    generatedAt: new Date().toISOString(),
  };
}

function timingFor(leg: string, startDate?: string, _nights?: number): string {
  if (!startDate) return "To be scheduled";
  if (leg === "arrival") return `Day 1 · ${startDate}`;
  if (leg === "departure") return `Final day`;
  if (leg === "transfer") return "Per connection";
  return "During stay";
}

function noteFor(leg: string, matched: SupplierRef[]): string {
  if (matched.length) return `Matched ${matched.length} supplier(s).`;
  return "No supplier matched — coordinate manually.";
}

function buildRisks(ctx: BookingContext, legs: OpsLeg[]): string[] {
  const risks: string[] = [];
  if (!ctx.destination) risks.push("No destination recorded for this booking.");
  if (ctx.status === "provisional") risks.push("Booking is provisional — not fully confirmed.");
  const unhandled = legs.filter((l) => l.gaps.length > 0 && l.leg !== "dining" && l.leg !== "celebration");
  if (unhandled.length) risks.push(`Unhandled legs may cause gaps: ${unhandled.map((l) => l.leg).join(", ")}.`);
  return risks;
}

function buildChecklist(ctx: BookingContext, legs: OpsLeg[]): string[] {
  const items: string[] = [];
  legs.forEach((l) => {
    if (l.matchedSuppliers.length) {
      items.push(`Confirm ${l.label} with ${l.matchedSuppliers.map((s) => s.name).join(", ")}.`);
    } else {
      items.push(`Book & assign supplier for ${l.label}.`);
    }
  });
  if (ctx.specialRequests) items.push(`Honour special request: ${ctx.specialRequests}`);
  return items;
}

function emergencyContacts(ctx: BookingContext): string[] {
  const contacts: string[] = ["Kivara on-call concierge", "Local tourist police (record destination-specific number)"];
  if (ctx.destination) contacts.push(`${ctx.destination} emergency services contact`);
  return contacts;
}

export class OpsOrchestrator {
  /**
   * Build the ops plan for a real booking by id. Returns null if not found.
   */
  async planBookingOperations(bookingId: string): Promise<OpsPlan | null> {
    const supabase = createAdminClient();

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error || !booking) return null;

    const { data: supplierRows } = await supabase
      .from("suppliers")
      .select("id, name, supplier_categories!left(slug)");

    const suppliers: SupplierRef[] = (supplierRows || []).map((s: Record<string, unknown>) => ({
      id: String(s.id),
      name: String(s.name || "Unknown"),
      category: ((s.supplier_categories as { slug?: string } | null)?.slug) || undefined,
    }));

    return buildOpsPlan(booking as Record<string, unknown>, suppliers, (booking as Record<string, unknown>).destination as string | undefined);
  }
}

export const opsOrchestrator = new OpsOrchestrator();
