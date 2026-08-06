// ─── Kivara Document Download API ────────────────────────────────────────
// Serves branded HTML documents as downloadable files (print-to-PDF ready).
// GET  /api/documents/download?type=quote&clientName=...&bookingRef=...

import { NextRequest, NextResponse } from "next/server";
import { generateQuoteDocument } from "@/lib/documents/quote";
import { generateInvoiceDocument, type InvoiceData } from "@/lib/documents/invoice";
import { generateReceiptDocument, type ReceiptDocumentData } from "@/lib/documents/receipt";
import { generateItineraryDocument } from "@/lib/documents/itinerary";
import { generateWelcomeDocument } from "@/lib/documents/welcome";
import { generateTravelBrief, type TravelBriefData } from "@/lib/documents/travel-brief";
import { generatePaymentReminderDocument } from "@/lib/documents/payment-reminder";
import { generateThankYouDocument } from "@/lib/documents/thank-you";
import { generateReferralDocument } from "@/lib/documents/referral";
import { generateFeedbackDocument } from "@/lib/documents/feedback";
import type { CuratedJourney } from "@/lib/ai/types";

const generators: Record<string, (data: Record<string, unknown>) => string> = {
  quote: (d) =>
    generateQuoteDocument(
      d.journey as CuratedJourney,
      d.meta as Parameters<typeof generateQuoteDocument>[1]
    ),
  invoice: (d) => generateInvoiceDocument(d as unknown as InvoiceData),
  receipt: (d) => generateReceiptDocument(d as unknown as ReceiptDocumentData),
  itinerary: (d) => generateItineraryDocument(d as unknown as CuratedJourney),
  welcome: (d) =>
    generateWelcomeDocument(d.clientName as string, d.bookingRef as string, d.destination as string),
  "travel-brief": (d) => generateTravelBrief(d as unknown as TravelBriefData),
  "payment-reminder": (d) =>
    generatePaymentReminderDocument(d as unknown as Parameters<typeof generatePaymentReminderDocument>[0]),
  "thank-you": (d) =>
    generateThankYouDocument(d.clientName as string, d.bookingRef as string, d.destination as string),
  referral: (d) => generateReferralDocument(d.clientName as string, d.bookingRef as string),
  feedback: (d) =>
    generateFeedbackDocument(d.clientName as string, d.bookingRef as string, d.destination as string),
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const bookingRef = url.searchParams.get("bookingRef") || "document";

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

    // Build data object from query params
    const data: Record<string, unknown> = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "type") {
        data[key] = value;
      }
    }

    const html = generator(data);

    const filename = `kivara-${type}-${bookingRef.replace(/[^a-zA-Z0-9-_]/g, "")}.html`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Document download error:", error);
    return NextResponse.json(
      { error: `Failed to generate document: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
