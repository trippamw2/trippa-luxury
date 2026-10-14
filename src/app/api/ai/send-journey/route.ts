import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { gateAiAction, ActionBlockedError, actionBlockedResponse } from "@/lib/ai/action-gate";
import { sendEmail } from "@/lib/email";
import { generateQuotePDFBuffer } from "@/lib/documents/quote-pdf";
import { generateQuoteHtmlEmail } from "@/lib/documents/quote";
import type { CuratedJourney } from "@/lib/ai/types";

/**
 * POST /api/ai/send-journey
 * Emails an operator-curated journey proposal to the guest, with the complete
 * proposal PDF attached.
 *
 * Admin-only - requires at least editor access to the journeys module.
 *
 * Like `/api/ai/send-quote`, this dispatches real email to a caller-supplied
 * address through the company Brevo account. Left unauthenticated it is an open
 * relay, so it is gated by `requireAdmin` and the AI action gate before any
 * outbound effect.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin({ module: "journeys", minRole: "editor" });

    const body = await request.json();
    const journey: CuratedJourney | undefined = body.journey;
    const to: string | undefined = body.to || journey?.guestProfile?.email;
    const name: string | undefined = body.name || journey?.guestProfile?.name;

    if (!journey || !journey.itinerary || !journey.pricing) {
      return NextResponse.json(
        { error: "Missing required field: journey" },
        { status: 400 }
      );
    }
    if (!to) {
      return NextResponse.json(
        { error: "Missing recipient: provide `to` or journey.guestProfile.email" },
        { status: 400 }
      );
    }

    // Governance gate: refuses before any outbound effect and records the
    // verdict to the decisions ledger. Placed before generation/send so a
    // blocked dispatch costs nothing.
    try {
      await gateAiAction(
        "send-journey",
        {},
        {
          entityType: "journey",
          entityId: journey.id ?? null,
          amount: journey.pricing.total,
        }
      );
    } catch (gateError) {
      if (gateError instanceof ActionBlockedError) {
        return actionBlockedResponse(gateError);
      }
      throw gateError;
    }

    const reference = journey.id || "KIVARA-JOURNEY";
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const depositPercent = 30;
    const depositRequired = Math.round(journey.pricing.total * (depositPercent / 100));
    const paymentTerms =
      "30% deposit upon acceptance, balance due 60 days before travel";

    // 1. HTML email body (full branded proposal document).
    const html = generateQuoteHtmlEmail(journey, {
      reference,
      validUntil,
      depositRequired,
      depositPercent,
    });

    // 2. PDF attachment (non-fatal: the email still sends without it).
    let pdfAttachment: { content: string; name: string } | undefined;
    try {
      const pdfBuffer = await generateQuotePDFBuffer({
        journey,
        quoteRef: reference,
        validUntil,
        depositRequired,
        depositPercent,
        paymentTerms,
      });
      pdfAttachment = {
        content: pdfBuffer.toString("base64"),
        name: `Kivara-Journey-Proposal-${reference}.pdf`,
      };
    } catch (pdfError) {
      console.error("PDF generation error (non-fatal):", pdfError);
    }

    // 3. Dispatch via Brevo (with the PDF attached when generated).
    const emailResult = await sendEmail({
      to: [{ email: to, name: name || undefined }],
      subject: `Your Kivara Journey Proposal : ${reference} : kivara.africa`,
      htmlContent: html,
      ...(pdfAttachment ? { attachment: [pdfAttachment] } : {}),
      meta: { journeyId: journey.id, reference },
    });

    return NextResponse.json(
      {
        success: true,
        reference,
        messageId: emailResult.messageId,
        pdfAttached: !!pdfAttachment,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Send journey error:", error);
    return NextResponse.json(
      { error: "Failed to send journey proposal" },
      { status: 500 }
    );
  }
}
