// ─── Kivara Travel Brief Document ───────────────────────────────────────

import { wrapDocument, documentHeader, documentBody, documentFooter, infoGrid } from "./template";

export interface TravelBriefData {
  clientName: string;
  bookingRef: string;
  destination: string;
  travelDates: string;
  accommodation: string;
  emergencyContact: string;
  weather: string;
  currency: string;
  language: string;
  timezone: string;
  visaRequirements: string;
  healthAdvice: string;
  packingTips: string[];
}

export function generateTravelBrief(data: TravelBriefData): string {
  const html = `
    ${documentHeader({ title: "Travel Brief", reference: data.bookingRef, clientName: data.clientName })}
    ${documentBody(`
      <h1>Pre-Travel Brief</h1>
      <p>Dear ${data.clientName}, please find below essential information for your upcoming journey to ${data.destination}. Please review carefully before departure.</p>

      ${infoGrid([
        { label: "Destination", value: data.destination },
        { label: "Travel Dates", value: data.travelDates },
        { label: "Accommodation", value: data.accommodation },
        { label: "Emergency Contact", value: data.emergencyContact },
        { label: "Weather", value: data.weather },
        { label: "Local Currency", value: data.currency },
        { label: "Language", value: data.language },
        { label: "Timezone", value: data.timezone },
      ])}

      <h3>Travel Requirements</h3>
      <div style="background: #F5F0EB; padding: 16px; margin-bottom: 24px;">
        <p style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Visa Requirements</p>
        <p style="font-size: 13px; color: #4A4A4A; line-height: 1.7;">${data.visaRequirements}</p>
      </div>

      <div style="background: #F5F0EB; padding: 16px; margin-bottom: 24px;">
        <p style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Health Advice</p>
        <p style="font-size: 13px; color: #4A4A4A; line-height: 1.7;">${data.healthAdvice}</p>
      </div>

      <h3>Packing Recommendations</h3>
      <ul style="padding-left: 20px; font-size: 13px; color: #4A4A4A; line-height: 1.8;">
        ${data.packingTips.map(tip => `<li>${tip}</li>`).join("")}
      </ul>

      <hr class="divider" />

      <div style="background: #1A1A1A; padding: 20px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 11px; color: #C9A96E; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px;">24/7 Concierge</p>
        <p style="font-size: 14px; color: white; margin: 0;">${data.emergencyContact}</p>
      </div>

      <p>Your Kivara concierge is available around the clock. Reach out anytime.</p>
      <p>Warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Concierge</strong></p>
    `)}
    ${documentFooter()}
  `;
  return wrapDocument(html, { title: `Travel Brief ${data.bookingRef}` });
}
