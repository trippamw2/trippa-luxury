// ─── Kivara Document Generation API ─────────────────────────────────────
// Generates branded HTML documents (print-to-PDF ready).
// POST  /api/documents/generate  : Generate a document by type and data

import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

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

    if (!data) {
      return NextResponse.json({ error: "Document data is required" }, { status: 400 });
    }

    const html = generator(data);

    return NextResponse.json({
      success: true,
      type,
      html,
      meta: {
        generatedAt: new Date().toISOString(),
        title: `Kivara ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      },
    });
  } catch (error: unknown) {
    console.error("Document generation error:", error);
    return NextResponse.json(
      { error: `Failed to generate document: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
