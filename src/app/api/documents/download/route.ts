// ─── Kivara Document Download API ────────────────────────────────────────
// Serves branded HTML documents as downloadable files (print-to-PDF ready).
//
//   GET /api/documents/download?type=invoice&bookingId=<uuid>
//   GET /api/documents/download?type=quote&clientName=... (legacy flat params)
//
// Booking-derived documents (invoice, receipt, itinerary, welcome,
// travel-brief, payment-reminder, thank-you) are built server-side from the
// booking row — and, for itineraries, from the saved journey the quote flow
// attached. The route used to shovel flat query params straight into generators
// that expect nested typed objects, which threw for every booking document.

import { NextRequest, NextResponse } from "next/server";
import { generateQuoteDocument } from "@/lib/documents/quote";
import { generateInvoiceDocument } from "@/lib/documents/invoice";
import { generateReceiptDocument } from "@/lib/documents/receipt";
import { generateItineraryDocument } from "@/lib/documents/itinerary";
import { generateWelcomeDocument } from "@/lib/documents/welcome";
import { generateTravelBrief } from "@/lib/documents/travel-brief";
import { generatePaymentReminderDocument } from "@/lib/documents/payment-reminder";
import { generateThankYouDocument } from "@/lib/documents/thank-you";
import { generateReferralDocument } from "@/lib/documents/referral";
import { generateFeedbackDocument } from "@/lib/documents/feedback";
import type { CuratedJourney } from "@/lib/ai/types";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapKeysToCamel } from "@/lib/api-helpers";
import {
  buildDocumentData,
  isBookingDocumentType,
  type BookingRow,
  type SavedJourneyRow,
} from "@/lib/documents/booking-payload";

type AdminClient = ReturnType<typeof createAdminClient>;

const generators: Record<string, (data: Record<string, unknown>) => string> = {
  quote: (d) =>
    generateQuoteDocument(
      d.journey as CuratedJourney,
      d.meta as Parameters<typeof generateQuoteDocument>[1]
    ),
  invoice: (d) => generateInvoiceDocument(d as unknown as Parameters<typeof generateInvoiceDocument>[0]),
  receipt: (d) => generateReceiptDocument(d as unknown as Parameters<typeof generateReceiptDocument>[0]),
  itinerary: (d) => generateItineraryDocument(d as unknown as CuratedJourney),
  welcome: (d) =>
    generateWelcomeDocument(d.clientName as string, d.bookingRef as string, d.destination as string),
  "travel-brief": (d) => generateTravelBrief(d as unknown as Parameters<typeof generateTravelBrief>[0]),
  "payment-reminder": (d) =>
    generatePaymentReminderDocument(d as unknown as Parameters<typeof generatePaymentReminderDocument>[0]),
  "thank-you": (d) =>
    generateThankYouDocument(d.clientName as string, d.bookingRef as string, d.destination as string),
  referral: (d) => generateReferralDocument(d.clientName as string, d.bookingRef as string),
  feedback: (d) =>
    generateFeedbackDocument(d.clientName as string, d.bookingRef as string, d.destination as string),
};

/** `platform_settings` as a key→value map (bank details, payment links, …). */
async function loadSettingsMap(supabase: AdminClient): Promise<Record<string, string>> {
  const { data } = await supabase.from("platform_settings").select("key, value");
  const map: Record<string, string> = {};
  for (const row of (data ?? []) as { key?: unknown; value?: unknown }[]) {
    if (row && typeof row.key === "string") {
      map[row.key] = typeof row.value === "string" ? row.value : String(row.value ?? "");
    }
  }
  return map;
}

/**
 * The journey the quote flow linked to this booking, so the itinerary document
 * can be rebuilt from real data. Falls back to the most recent journey for the
 * guest's email; returns null when the booking has none.
 */
async function loadSavedJourney(supabase: AdminClient, booking: BookingRow): Promise<SavedJourneyRow | null> {
  const byBooking = await supabase
    .from("saved_journeys")
    .select("*")
    .eq("booking_id", booking.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byBooking.data) return mapKeysToCamel<SavedJourneyRow>(byBooking.data);

  if (booking.clientEmail) {
    const byEmail = await supabase
      .from("saved_journeys")
      .select("*")
      .eq("guest_email", booking.clientEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byEmail.data) return mapKeysToCamel<SavedJourneyRow>(byEmail.data);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    // These render official Kivara documents — real letterhead, real payment
    // instructions, real contact details — from values the caller supplies. Left
    // open, anyone could mint a convincing forged invoice or receipt bearing the
    // company's name, which is a phishing kit rather than a data leak. The only
    // caller is the admin bookings page.
    await requireAdmin({ module: "bookings", minRole: "agent" });

    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const requestedRef = url.searchParams.get("bookingRef") || "document";

    if (!type) {
      return NextResponse.json({ error: "Document type is required" }, { status: 400 });
    }

    const generator = generators[type];
    if (!generator) {
      return NextResponse.json(
        {
          error: `Unknown document type: ${type}`,
          availableTypes: Object.keys(generators),
        },
        { status: 400 }
      );
    }

    const bookingId = url.searchParams.get("bookingId")?.trim() || "";
    let bookingRef = requestedRef;
    let data: Record<string, unknown>;

    if (isBookingDocumentType(type) && (bookingId || requestedRef !== "document")) {
      const supabase = createAdminClient();
      const query = supabase.from("bookings").select("*");
      const { data: bookingRow, error } = bookingId
        ? await query.eq("id", bookingId).maybeSingle()
        : await query.eq("booking_reference", requestedRef).maybeSingle();

      if (error || !bookingRow) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      const booking = mapKeysToCamel<BookingRow>(bookingRow);
      bookingRef = booking.bookingReference || booking.id.slice(0, 8).toUpperCase();

      const settings = await loadSettingsMap(supabase);
      const journey = type === "itinerary" ? await loadSavedJourney(supabase, booking) : null;

      data = buildDocumentData(type, booking, { settings, journey });
    } else {
      // Legacy flat-parameter path: quote / referral / feedback and any older
      // links that predate server-side booking lookup.
      data = {};
      for (const [key, value] of url.searchParams.entries()) {
        if (key !== "type") {
          data[key] = value;
        }
      }
    }

    const html = generator(data);

    const filename = `kivara-${type}-${bookingRef.replace(/[^a-zA-Z0-9-_]/g, "")}.html`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        // The body is caller-supplied HTML; make sure nothing treats it as
        // anything other than a download.
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      },
    });
  } catch (error: unknown) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Document download error:", error);
    // Log the detail, but do not hand an internal message to the caller.
    return NextResponse.json({ error: "Failed to generate document" }, { status: 500 });
  }
}
