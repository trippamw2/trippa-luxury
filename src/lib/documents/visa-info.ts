// ─── Kivara Visa Information Document ───────────────────────────────────
// Branded HTML document with visa requirements for popular destinations.

import { wrapDocument, documentHeader, documentBody, documentFooter } from "./template";

export function generateVisaInfoDocument(): string {
  const html = `
    ${documentHeader({ title: "Visa Requirements", reference: "TRAVEL-INFO", clientName: "Valued Guest" })}
    ${documentBody(`
      <h1>Visa Requirements by Destination</h1>
      <p>Most visitors to Southern and East Africa require a visa. Below is a summary of visa requirements for popular Kivara destinations. We recommend checking with the relevant embassy for the most up-to-date information.</p>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 8px;">Zambia</h3>
        <p>Most nationalities require a visa. The Kaza UniVisa (Universal Visa) covers both Zambia and Zimbabwe and is available on arrival at major border crossings and airports. Cost: approximately USD 50.</p>
        <p style="color: #8B7D6B; font-size: 12px;">Required: Valid passport (6+ months), return ticket, proof of accommodation.</p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 8px;">Zimbabwe</h3>
        <p>Visa required for most nationalities. Available on arrival or via e-visa. The Kaza UniVisa covers both Zimbabwe and Zambia.</p>
        <p style="color: #8B7D6B; font-size: 12px;">Required: Valid passport (6+ months), USD cash for visa fee.</p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 8px;">Botswana</h3>
        <p>Many nationalities (including US, UK, EU) receive visa-free entry for up to 90 days. Others may require a visa in advance.</p>
        <p style="color: #8B7D6B; font-size: 12px;">Required: Valid passport (6+ months), proof of sufficient funds.</p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 8px;">Tanzania</h3>
        <p>Visa required for most nationalities. E-visa available online or visa on arrival at major airports. Cost: USD 50 (US citizens: USD 100).</p>
        <p style="color: #8B7D6B; font-size: 12px;">Required: Valid passport (6+ months), yellow fever certificate (if arriving from endemic area).</p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 8px;">Kenya</h3>
        <p>E-visa required for most nationalities. Apply online at evisa.go.ke. Cost: USD 50 (US citizens: USD 100).</p>
        <p style="color: #8B7D6B; font-size: 12px;">Required: Valid passport (6+ months), return ticket, proof of accommodation.</p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 8px;">South Africa</h3>
        <p>Many nationalities (including US, UK, EU) receive visa-free entry for up to 90 days. Others may require a visa in advance.</p>
        <p style="color: #8B7D6B; font-size: 12px;">Required: Valid passport (30+ days beyond departure), return ticket.</p>
      </div>

      <div style="background: #F5F0EB; padding: 16px; margin-bottom: 24px;">
        <p style="font-size: 12px; color: #8B7D6B; margin: 0;"><strong>Important:</strong> Visa requirements change frequently. We recommend verifying requirements with the relevant embassy or consulate at least 4 weeks before your departure. Your Kivara concierge can assist with visa applications for certain destinations.</p>
      </div>

      <p>For questions, contact your Kivara concierge at <strong style="color: #C9A96E;">concierge@kivara.luxury</strong></p>
    `)}
    ${documentFooter()}
  `;

  return wrapDocument(html, { title: "Visa Requirements — Kivara Travel Guide" });
}
