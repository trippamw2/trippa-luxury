import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { gateAiAction, ActionBlockedError, actionBlockedResponse } from "@/lib/ai/action-gate";
import { quoteEngine } from "@/lib/ai/quote-engine";
import { warmJourneyInputs } from "@/lib/ai/journey-engine";
import { runQualityGate, recordQcDecision } from "@/lib/ai/quality-gate";
import { sendEmail } from "@/lib/email";
import { persistQuote } from "@/lib/services/quote-persistence";
import { generateQuotePDFBuffer } from "@/lib/documents/quote-pdf";
import type { GuestProfile } from "@/lib/ai/types";

/**
 * POST /api/ai/send-quote
 * Generates a quote, gates it on quality, persists it, and emails the guest.
 *
 * Admin-only - requires at least editor role.
 *
 * This endpoint sends real email to a caller-supplied address and writes to the
 * database. Left unauthenticated it is an open relay: anyone who learns the URL
 * can send arbitrary branded mail through the company Brevo account, exhaust the
 * sending quota, and spam third parties from a trusted domain.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin({ module: "finance", minRole: "editor" });

    const body = await request.json();
    const profile: GuestProfile = body.profile;
    const inquiryId: string | undefined = body.inquiryId;

    if (!profile || !profile.name || !profile.email) {
      return NextResponse.json(
        { error: "Missing required fields: profile.name, profile.email" },
        { status: 400 }
      );
    }

    // 1. Generate the quote (AI-curated journey + pricing). Warm the pricing
    // and catalog caches first so the synchronous generateQuote() prices from
    // the operator's platform_settings rates and active properties.
    await warmJourneyInputs();
    const quote = quoteEngine.generateQuote(profile);

    // 2. Run the Quality Control gate — never send a broken/incoherent proposal.
    const qc = runQualityGate(quote.journey, quote.depositRequired);

    // 2a. Persist the verdict BEFORE acting on it, so a blocked send is durable
    // evidence too. `recordQcDecision` never throws: losing the history write
    // must not change whether we send.
    const qcRecord = await recordQcDecision({
      verdict: qc,
      journeyTitle: quote.journey.title,
      journeyId: quote.journey.id,
    });
    if (!qcRecord.ok) {
      console.error("Quality gate decision not persisted:", qcRecord.error);
    }

    if (!qc.ok) {
      return NextResponse.json(
        {
          error: "Quote failed quality control and was not sent.",
          qc: { severity: qc.severity, issues: qc.issues },
        },
        { status: 422 }
      );
    }
    if (qc.severity === "warn") {
      console.warn(
        `Quote ${quote.quoteRef} passed with warnings:`,
        qc.issues.map((i) => `[${i.code}] ${i.message}`)
      );
    }

    // 2b. Governance gate. Placed after QC and before any outward effect: the
    // QC verdict above is deliberately persisted even for a send that never
    // happens, so it must not sit behind a governance refusal. The quote total
    // is passed as the exposure so a high-value dispatch raises
    // `high_value_exposure` instead of being waved through on a stale default.
    try {
      await gateAiAction(
        "send-quote",
        {},
        {
          entityType: "quote",
          entityId: quote.journey.id ?? null,
          amount: quote.journey.pricing.total,
        }
      );
    } catch (gateError) {
      if (gateError instanceof ActionBlockedError) {
        return actionBlockedResponse(gateError);
      }
      throw gateError;
    }

    // 3. Generate the HTML email
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
      subject: `Your Curated Journey : ${quote.quoteRef} : kivara.africa`,
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
      if (error instanceof AdminAuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error("Send quote error:", error);
      return NextResponse.json(
        { error: "Failed to generate and send quote" },
        { status: 500 }
      );
    }
}
