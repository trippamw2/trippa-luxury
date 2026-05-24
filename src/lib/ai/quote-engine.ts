// ─── Kivara Quote Engine (Brand Voice) ───────────────────────────────────
// Generates formatted luxury quote emails and PDF-ready HTML.
// All guest-facing prose uses the KIVARA brand voice.

import { JourneyEngine } from "./journey-engine";
import type { GuestProfile, CuratedJourney } from "./types";
import { journeyIntro, signature } from "@/lib/voice";

const engine = new JourneyEngine();

export interface QuoteData {
  journey: CuratedJourney;
  quoteRef: string;
  validUntil: string;
  paymentTerms: string;
  depositRequired: number;
  depositPercent: number;
}

export class QuoteEngine {
  generateQuote(profile: GuestProfile): QuoteData {
    const journey = engine.generate(profile);
    const total = journey.pricing.total;
    const depositPercent = 30;
    const depositAmount = Math.round(total * (depositPercent / 100));

    return {
      journey,
      quoteRef: `Q-${journey.id}`,
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      paymentTerms: "A 30% deposit is requested to secure your reservation. The balance will be due 60 days before your departure.",
      depositRequired: depositAmount,
      depositPercent,
    };
  }

  generateQuoteHtml(quote: QuoteData): string {
    const j = quote.journey;
    const lineItems = j.pricing.accommodation
      .map((a) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #EDE5DA; font-size: 14px; color: #1A1A1A;">${a.label}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #EDE5DA; font-size: 14px; color: #8B7D6B; text-align: center;">${a.nights}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #EDE5DA; font-size: 14px; color: #8B7D6B; text-align: right;">$${a.ratePerNight.toLocaleString()}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #EDE5DA; font-size: 14px; color: #1A1A1A; text-align: right; font-weight: 600;">$${a.subtotal.toLocaleString()}</td>
        </tr>`)
      .join("");

    const highlightsHtml = j.highlights
      .map((h) => `<li style="font-size: 13px; color: #4A4A4A; margin-bottom: 6px; line-height: 1.6;">${h}</li>`)
      .join("");

    const itineraryHtml = j.itinerary
      .map(
        (d) => `
        <div style="margin-bottom: 16px; padding: 16px; background: #F5F0EB; border-left: 3px solid #C9A96E;">
          <p style="font-size: 11px; color: #C9A96E; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Day ${d.day}</p>
          <h3 style="font-size: 16px; color: #1A1A1A; margin: 0 0 4px; font-family: 'Times New Roman', serif;">${d.title}</h3>
          <p style="font-size: 12px; color: #8B7D6B; margin: 0 0 8px;">${d.accommodation} · ${d.location}</p>
          <ul style="margin: 0; padding-left: 16px;">
            ${d.activities.slice(0, 2).map((a) => `<li style="font-size: 12px; color: #4A4A4A; margin-bottom: 2px;">${a.title}</li>`).join("")}
          </ul>
        </div>`)
      .join("");

    return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; color: #1A1A1A;">
      <div style="background: #1A1A1A; padding: 40px; text-align: center;">
        <h1 style="font-family: 'Times New Roman', serif; color: #D4BC8A; font-size: 28px; margin: 0; letter-spacing: 3px;">KIVARA</h1>
        <p style="color: #A89880; font-size: 10px; text-transform: uppercase; letter-spacing: 4px; margin: 6px 0 0;">Your Curated Journey</p>
      </div>

      <div style="padding: 40px;">
        <h2 style="font-family: 'Times New Roman', serif; font-size: 22px; color: #1A1A1A; margin: 0 0 8px;">${j.guestProfile.name},</h2>
        <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 24px;">
          ${journeyIntro(j.guestProfile.name, j.destinations.join(" and "))}
        </p>

        <div style="background: #1A1A1A; padding: 20px; text-align: center; margin-bottom: 24px;">
          <p style="font-size: 10px; color: #A89880; text-transform: uppercase; letter-spacing: 2px; margin: 0;">Quote Reference</p>
          <p style="font-size: 20px; color: #D4BC8A; margin: 4px 0 0; font-family: 'Times New Roman', serif;">${quote.quoteRef}</p>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; color: #1A1A1A; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px; border-bottom: 1px solid #EDE5DA; padding-bottom: 8px;">Your Journey</h3>
          <p style="font-size: 15px; color: #1A1A1A; margin: 0; font-weight: 600;">${j.title}</p>
          <p style="font-size: 13px; color: #8B7D6B; margin: 4px 0 0;">${j.duration} nights · ${j.destinations.length} destinations</p>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; color: #1A1A1A; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px; border-bottom: 1px solid #EDE5DA; padding-bottom: 8px;">Itinerary Overview</h3>
          ${itineraryHtml}
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; color: #1A1A1A; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px; border-bottom: 1px solid #EDE5DA; padding-bottom: 8px;">Investment</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="font-size: 11px; color: #8B7D6B; text-transform: uppercase; letter-spacing: 1px;">
                <th style="text-align: left; padding: 8px 0; border-bottom: 1px solid #EDE5DA;">Accommodation</th>
                <th style="text-align: center; padding: 8px 0; border-bottom: 1px solid #EDE5DA;">Nights</th>
                <th style="text-align: right; padding: 8px 0; border-bottom: 1px solid #EDE5DA;">Rate/Night</th>
                <th style="text-align: right; padding: 8px 0; border-bottom: 1px solid #EDE5DA;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItems}
            </tbody>
            <tfoot>
              ${(() => {
                const transferCost = j.pricing.transfers.reduce((s: number, t: any) => s + t.cost, 0);
                const accomSub = j.pricing.subtotal - transferCost;
                let rows = `<tr><td colspan="3" style="text-align: right; padding: 12px 0 4px; font-size: 13px; color: #8B7D6B;">Accommodation Subtotal</td><td style="text-align: right; padding: 12px 0 4px; font-size: 14px; color: #1A1A1A;">$${accomSub.toLocaleString()}</td></tr>`;
                if (transferCost > 0) {
                  rows += `<tr><td colspan="3" style="text-align: right; padding: 4px 0; font-size: 13px; color: #8B7D6B;">Private Charters & Transfers</td><td style="text-align: right; padding: 4px 0; font-size: 14px; color: #1A1A1A;">$${transferCost.toLocaleString()}</td></tr>`;
                }
                rows += `<tr><td colspan="3" style="text-align: right; padding: 4px 0; font-size: 13px; color: #8B7D6B;">Taxes & Fees (10%)</td><td style="text-align: right; padding: 4px 0; font-size: 14px; color: #1A1A1A;">$${j.pricing.taxes.toLocaleString()}</td></tr>`;
                rows += `<tr><td colspan="3" style="text-align: right; padding: 8px 0; font-size: 16px; color: #1A1A1A; font-weight: 700; border-top: 2px solid #1A1A1A;">Total Investment</td><td style="text-align: right; padding: 8px 0; font-size: 18px; color: #C9A96E; font-weight: 700; border-top: 2px solid #1A1A1A;">$${j.pricing.total.toLocaleString()} ${j.pricing.currency}</td></tr>`;
                return rows;
              })()}
            </tfoot>
          </table>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; color: #1A1A1A; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px; border-bottom: 1px solid #EDE5DA; padding-bottom: 8px;">Journey Highlights</h3>
          <ul style="margin: 0; padding-left: 20px;">${highlightsHtml}</ul>
        </div>

        <div style="margin-bottom: 24px; padding: 16px; background: #F5F0EB;">
          <p style="font-size: 11px; color: #8B7D6B; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Terms & Validity</p>
          <p style="font-size: 12px; color: #4A4A4A; margin: 0 0 4px;">Quote valid until: <strong>${quote.validUntil}</strong></p>
          <p style="font-size: 12px; color: #4A4A4A; margin: 0 0 4px;">${quote.paymentTerms}</p>
          <p style="font-size: 12px; color: #4A4A4A; margin: 0;">Deposit requested: <strong style="color: #C9A96E;">$${quote.depositRequired.toLocaleString()} (${quote.depositPercent}%)</strong></p>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/payment?ref=${quote.quoteRef}" style="display: inline-block; padding: 14px 40px; background: #1A1A1A; color: #FAF7F2; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Reserve Your Journey</a>
        </div>

        <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">Should you wish to refine any element of this journey, simply reply to this email. Your personal concierge is ready to adjust every detail until it feels perfectly yours.</p>
        <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 16px 0 0;">With warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Concierge</strong></p>
      </div>

      <div style="background: #EDE5DA; padding: 20px 40px; text-align: center;">
        <p style="font-size: 10px; color: #8B7D6B; margin: 0;">Kivara Luxury Travel · concierge@kivara.luxury</p>
        <p style="font-size: 10px; color: #8B7D6B; margin: 4px 0 0;">${process.env.NEXT_PUBLIC_SITE_URL || "kivara.com"}</p>
      </div>
    </div>`;
  }
}

export const quoteEngine = new QuoteEngine();
