// ─── Kivara Quote / Proposal Document ──────────────────────────────────
// Branded PDF-ready HTML for luxury travel quotes.

import { wrapDocument, documentHeader, documentBody, documentFooter, refBox, infoGrid, KIVARA_BRAND } from "./template";
import type { CuratedJourney } from "@/lib/ai/types";

export function generateQuoteDocument(journey: CuratedJourney, meta: {
  reference: string;
  validUntil: string;
  depositRequired: number;
  depositPercent: number;
  paymentTerms: string;
}): string {
  const { pricing } = journey;

  const isCouple = journey.guestProfile.isCouple ?? true;
  const guestCount = isCouple ? 2 : 1;
  const guestLabel = isCouple ? "Couple" : "Solo Traveller";

  const accommodationRows = pricing.accommodation.map(a => {
    const pppn = a.ratePerNightPPPN || Math.round(a.ratePerNight / guestCount);
    const perNightTotal = a.ratePerNight;
    return `
    <tr>
      <td>${a.label}</td>
      <td class="text-center">${a.nights}</td>
      <td class="text-right">$${pppn.toLocaleString()}</td>
      <td class="text-right">$${perNightTotal.toLocaleString()}</td>
      <td class="text-right font-bold">$${a.subtotal.toLocaleString()}</td>
    </tr>`;
  }).join("");

  const itineraryPreview = journey.itinerary.slice(0, 5).map(d => `
    <tr>
      <td style="width: 40px; font-size: 11px; color: #C9A96E;">Day ${d.day}</td>
      <td>${d.title}</td>
      <td style="color: #8B7D6B;">${d.accommodation}</td>
      <td style="color: #8B7D6B;">${d.location}</td>
    </tr>`).join("");

  const highlightsList = journey.highlights.map(h => `<li style="margin-bottom: 6px;">${h}</li>`).join("");

  const html = `
    ${documentHeader({ title: "Journey Proposal", reference: meta.reference, clientName: journey.guestProfile.name })}
    ${documentBody(`
      <h1>Dear ${journey.guestProfile.name},</h1>
      <p>It is our privilege to present this personally curated journey for you. Every element has been selected with care — from the properties that will host you to the moments waiting to be discovered.</p>

      ${refBox("Quote Reference", meta.reference)}

      <div class="info-grid">
        <div class="info-item">
          <label>Guest</label>
          <span>${journey.guestProfile.name}</span>
        </div>
        <div class="info-item">
          <label>Party</label>
          <span>${guestLabel} &middot; ${isCouple ? "2 Guests" : "1 Guest"}</span>
        </div>
        <div class="info-item">
          <label>Duration</label>
          <span>${journey.duration} Nights</span>
        </div>
        <div class="info-item">
          <label>Valid Until</label>
          <span>${meta.validUntil}</span>
        </div>
        <div class="info-item">
          <label>Destinations</label>
          <span>${journey.destinations.map(d => d.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())).join(", ")}</span>
        </div>
      </div>

      <h3>Journey Overview</h3>
      <p style="font-size: 15px; font-weight: 600; margin-bottom: 4px;">${journey.title}</p>
      <p style="font-size: 13px; color: #8B7D6B; margin-bottom: 24px;">${journey.subtitle}</p>

      <h3>Itinerary Summary</h3>
      <table>
        <thead>
          <tr><th>Day</th><th>Activity</th><th>Accommodation</th><th>Location</th></tr>
        </thead>
        <tbody>${itineraryPreview}</tbody>
      </table>
      ${journey.itinerary.length > 5 ? `<p style="font-size: 11px; color: #8B7D6B;">Full ${journey.itinerary.length}-day itinerary available in attached document.</p>` : ""}

      <h3>Investment</h3>
      <table>
        <thead>
          <tr><th>Accommodation</th><th class="text-center">Nights</th><th class="text-right">PPPN</th><th class="text-right">${isCouple ? "Per Couple" : "Per Person"}/Night</th><th class="text-right">Subtotal</th></tr>
        </thead>
        <tbody>${accommodationRows}</tbody>
        <tfoot>
          <tr><td colspan="4" class="text-right subtotal-label">Subtotal</td><td class="text-right font-bold">$${pricing.subtotal.toLocaleString()}</td></tr>
          <tr><td colspan="4" class="text-right subtotal-label">Taxes & Fees (10%)</td><td class="text-right font-bold">$${pricing.taxes.toLocaleString()}</td></tr>
          <tr class="total-row"><td colspan="4" class="text-right">Total</td><td class="text-right total-amount">$${pricing.total.toLocaleString()} ${pricing.currency}</td></tr>
        </tfoot>
      </table>
      <p class="text-earth text-xs">${isCouple ? "PPPN = Per Person Per Night (double occupancy). Per Couple/Night = PPPN × 2." : "PPPN = Per Person Per Night (single occupancy)."}</p>

      <h3>Journey Highlights</h3>
      <ul style="padding-left: 20px; font-size: 13px; color: #4A4A4A; line-height: 1.7;">${highlightsList}</ul>

      <h3>What's Included</h3>
      <ul style="padding-left: 20px; font-size: 13px; color: #4A4A4A; line-height: 1.7;">
        ${journey.includedExtras.map(extra => `<li>${extra}</li>`).join("")}
      </ul>

      <hr class="divider" />

      <h3>Terms & Payment</h3>
      <div class="ref-box">
        <p style="font-size: 12px; color: #8B7D6B; margin-bottom: 8px;">Deposit Required: <strong style="color: ${KIVARA_BRAND.colors.gold};">$${meta.depositRequired.toLocaleString()} (${meta.depositPercent}%)</strong></p>
        <p style="font-size: 12px; color: #8B7D6B; margin-bottom: 4px;">${meta.paymentTerms}</p>
        <p style="font-size: 12px; color: #8B7D6B;">Quote valid until: <strong>${meta.validUntil}</strong></p>
      </div>

      <p>Should you wish to adjust any element of this journey, simply reply to this document. Your personal concierge is ready to refine every detail until it feels perfectly yours.</p>
      <p>Warmest regards,<br><strong style="color: ${KIVARA_BRAND.colors.gold};">Your Kivara Concierge</strong></p>
    `)}
    ${documentFooter()}
  `;

  return wrapDocument(html, { title: `Quote ${meta.reference}` });
}

export function generateQuoteHtmlEmail(journey: CuratedJourney, meta: {
  reference: string;
  validUntil: string;
  depositRequired: number;
  depositPercent: number;
}): string {
  // Return just the email-friendly HTML (no wrapper)
  const body = generateQuoteDocument(journey, {
    ...meta,
    paymentTerms: "30% deposit to secure. Balance due 60 days before travel.",
  });
  // Extract just the document-body content for email
  return body;
}
