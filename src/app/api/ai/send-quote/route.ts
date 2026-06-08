import { NextRequest, NextResponse } from "next/server";
import { quoteEngine } from "@/lib/ai/quote-engine";
import { sendEmail } from "@/lib/email";
import { persistQuote } from "@/lib/services/quote-persistence";
import { generateQuotePDFBuffer } from "@/lib/documents/quote-pdf";
import type { GuestProfile } from "@/lib/ai/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile: GuestProfile = body.profile;
    const inquiryId: string | undefined = body.inquiryId;

    if (!profile || !profile.name || !profile.email) {
      return NextResponse.json(
        { error: "Missing required fields: profile.name, profile.email" },
        { status: 400 }
      );
    }

    // 1. Generate the quote (AI-curated journey + pricing)
    const quote = quoteEngine.generateQuote(profile);

    // 2. Generate the HTML email
    const html = quoteEngine.generateQuoteHtml(quote);

    // 3. Generate the PDF attachment
    let pdfAttachment: { content: string; name: string } | undefined;
    try {
      const pdfBuffer = await generateQuotePDFBuffer({
        journey: quote.journey,
        quoteRef: quote.quoteRef,
        validUntil: quote.validUntil,
        depositRequired: quote.depositRequired,
        depositPercent: quote.depositPercent,
        paymentTerms: quote.paymentTerms,
      });
      pdfAttachment = {
        content: pdfBuffer.toString("base64"),
        name: `Kivara-Journey-Proposal-${quote.quoteRef}.pdf`,
      };
    } catch (pdfError) {
      console.error("PDF generation error (non-fatal):", pdfError);
      // Non-fatal : email still sends without attachment
    }

    // 4. Send via Brevo (with PDF attachment if generated)
    const emailResult = await sendEmail({
      to: [{ email: profile.email, name: profile.name }],
      subject: `Your Curated Journey : ${quote.quoteRef} : Kivara Luxury Travel`,
      htmlContent: html,
      ...(pdfAttachment ? { attachment: [pdfAttachment] } : {}),
    });

    // 5. Persist to database (guest profile, saved journey, provisional booking)
    const persistenceResult = await persistQuote(profile, quote, inquiryId);

    return NextResponse.json(
      {
        success: true,
        quoteRef: quote.quoteRef,
        messageId: emailResult.messageId,
        journey: quote.journey,
        validUntil: quote.validUntil,
        depositRequired: quote.depositRequired,
        guestProfileId: persistenceResult.guestProfileId,
        journeyId: persistenceResult.journeyId,
        bookingId: persistenceResult.bookingId,
        bookingReference: persistenceResult.bookingReference,
        pdfAttached: !!pdfAttachment,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send quote error:", error);
    return NextResponse.json(
      { error: "Failed to generate and send quote" },
      { status: 500 }
    );
  }
}
