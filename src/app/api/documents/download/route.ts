// ─── Kivara Document Download API ────────────────────────────────────────
// Serves branded HTML documents as downloadable files (print-to-PDF ready).
// GET  /api/documents/download?type=quote&clientName=...&bookingRef=...

import { NextRequest, NextResponse } from "next/server";
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
  "travel-brief": (d: any) => generateTravelBrief(d as TravelBriefData),
  "payment-reminder": generatePaymentReminderDocument,
  "thank-you": (d: any) => generateThankYouDocument(d.clientName, d.bookingRef, d.destination),
  referral: (d: any) => generateReferralDocument(d.clientName, d.bookingRef),
  feedback: (d: any) => generateFeedbackDocument(d.clientName, d.bookingRef, d.destination),
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
    const data: Record<string, any> = {};
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
  } catch (error: any) {
    console.error("Document download error:", error);
    return NextResponse.json(
      { error: `Failed to generate document: ${error.message}` },
      { status: 500 }
    );
  }
}
