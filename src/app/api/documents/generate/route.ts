// ─── Kivara Document Generation API ─────────────────────────────────────
// Generates branded HTML documents (print-to-PDF ready).
// POST  /api/documents/generate  : Generate a document by type and data

import { NextResponse } from "next/server";
import { generateQuoteDocument } from "@/lib/documents/quote";
import { generateInvoiceDocument } from "@/lib/documents/invoice";
import { generateReceiptDocument } from "@/lib/documents/receipt";
import { generateItineraryDocument } from "@/lib/documents/itinerary";
import { generateWelcomeDocument } from "@/lib/documents/welcome";
import { generateTravelBrief, type TravelBriefData } from "@/lib/documents/travel-brief";
import { generatePaymentReminderDocument } from "@/lib/documents/payment-reminder";
import { generateThankYouDocument } from "@/lib/documents/thank-you";
import { generateReferralDocument } from "@/lib/documents/referral";
import { generateFeedbackDocument } from "@/lib/documents/feedback";

const generators: Record<string, (data: any) => string> = {
  quote: (d: any) => generateQuoteDocument(d.journey, d.meta),
  invoice: generateInvoiceDocument,
  receipt: generateReceiptDocument,
  itinerary: generateItineraryDocument,
  welcome: (d: any) => generateWelcomeDocument(d.clientName, d.bookingRef, d.destination),
  "travel-brief": (d: any) =>
    generateTravelBrief(d as TravelBriefData),
  "payment-reminder": generatePaymentReminderDocument,
  "thank-you": (d: any) => generateThankYouDocument(d.clientName, d.bookingRef, d.destination),
  referral: (d: any) => generateReferralDocument(d.clientName, d.bookingRef),
  feedback: (d: any) => generateFeedbackDocument(d.clientName, d.bookingRef, d.destination),
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
  } catch (error: any) {
    console.error("Document generation error:", error);
    return NextResponse.json(
      { error: `Failed to generate document: ${error.message}` },
      { status: 500 }
    );
  }
}
