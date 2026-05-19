import { NextRequest, NextResponse } from "next/server";
import { quoteEngine } from "@/lib/ai/quote-engine";
import { sendEmail } from "@/lib/email";
import type { GuestProfile } from "@/lib/ai/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile: GuestProfile = body.profile;

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

    // 3. Send via Brevo
    const result = await sendEmail({
      to: [{ email: profile.email, name: profile.name }],
      subject: `Your Curated Journey — ${quote.quoteRef} — Kivara Luxury Travel`,
      htmlContent: html,
    });

    return NextResponse.json(
      {
        success: true,
        quoteRef: quote.quoteRef,
        messageId: result.messageId,
        journey: quote.journey,
        validUntil: quote.validUntil,
        depositRequired: quote.depositRequired,
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
