// ─── Kivara Travel Insurance Guide Document ──────────────────────────────
// Branded HTML document with travel insurance guidance.

import { wrapDocument, documentHeader, documentBody, documentFooter } from "./template";

export function generateTravelInsuranceDocument(): string {
  const html = `
    ${documentHeader({ title: "Travel Insurance Guide", reference: "TRAVEL-INFO", clientName: "Valued Guest" })}
    ${documentBody(`
      <h1>Travel Insurance for Your African Journey</h1>
      <p>Comprehensive travel insurance is essential for luxury travel in Africa. We strongly recommend purchasing insurance at the time of booking to protect your investment and ensure peace of mind throughout your journey.</p>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 12px;">What to Look For</h3>
        <ul style="padding-left: 20px; line-height: 2;">
          <li><strong>Trip cancellation/interruption:</strong> Coverage for non-refundable costs if you cancel or cut short your trip</li>
          <li><strong>Medical emergency:</strong> Minimum USD 100,000 coverage (including evacuation)</li>
          <li><strong>Medical evacuation:</strong> Coverage for emergency evacuation to the nearest adequate medical facility</li>
          <li><strong>Baggage and personal effects:</strong> Coverage for lost, stolen, or damaged luggage</li>
          <li><strong>Travel delay:</strong> Coverage for additional expenses due to flight delays</li>
          <li><strong>Adventure activities:</strong> Ensure game drives, walking safaris, and water activities are covered</li>
        </ul>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 12px;">Recommended Providers</h3>
        <p>The following providers offer comprehensive coverage for African travel:</p>
        <ul style="padding-left: 20px; line-height: 2;">
          <li><strong>World Nomads:</strong> Popular with adventure travellers, covers a wide range of activities</li>
          <li><strong>Allianz Global Assistance:</strong> Comprehensive plans with 24/7 emergency assistance</li>
          <li><strong>Travel Guard (AIG):</strong> Premium coverage options suitable for luxury travel</li>
          <li><strong>Berkshire Hathaway Travel Protection:</strong> High-limit coverage for high-value trips</li>
        </ul>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 12px;">Important Considerations</h3>
        <ul style="padding-left: 20px; line-height: 2;">
          <li>Purchase insurance within 14-21 days of your first trip deposit for maximum benefits</li>
          <li>Declare any pre-existing medical conditions</li>
          <li>Check if your credit card offers any travel insurance coverage</li>
          <li>Keep digital copies of your insurance policy and emergency contact numbers</li>
          <li>Some countries (e.g., Cuba) require specific insurance — check requirements</li>
        </ul>
      </div>

      <div style="background: #F5F0EB; padding: 16px; margin-bottom: 24px;">
        <p style="font-size: 12px; color: #8B7D6B; margin: 0;"><strong>Kivara Tip:</strong> For high-value luxury safaris, we recommend "Cancel for Any Reason" (CFAR) coverage, which typically reimburses 50-75% of trip costs regardless of the reason for cancellation. This provides the most flexibility for premium bookings.</p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 12px;">Emergency Contacts</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; font-size: 12px; color: #8B7D6B; border-bottom: 1px solid #EDE5DA;">Kivara Concierge</td><td style="padding: 8px 0; font-size: 14px; border-bottom: 1px solid #EDE5DA;">concierge@kivara.luxury</td></tr>
          <tr><td style="padding: 8px 0; font-size: 12px; color: #8B7D6B; border-bottom: 1px solid #EDE5DA;">Kivara Emergency</td><td style="padding: 8px 0; font-size: 14px; border-bottom: 1px solid #EDE5DA;">+260 97 123 4567</td></tr>
        </table>
      </div>

      <p>For questions, contact your Kivara concierge at <strong style="color: #C9A96E;">concierge@kivara.luxury</strong></p>
    `)}
    ${documentFooter()}
  `;

  return wrapDocument(html, { title: "Travel Insurance Guide — Kivara Travel Guide" });
}
