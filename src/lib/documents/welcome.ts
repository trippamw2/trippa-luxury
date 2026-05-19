// ─── Kivara Welcome Document ───────────────────────────────────────────

import { wrapDocument, documentHeader, documentBody, documentFooter } from "./template";

export function generateWelcomeDocument(clientName: string, bookingRef: string, destination: string): string {
  const html = `
    ${documentHeader({ title: "Welcome", reference: bookingRef, clientName })}
    ${documentBody(`
      <h1>Welcome to Kivara, ${clientName}.</h1>
      <p>Thank you for choosing Kivara for your African journey. You have taken the first step toward an experience that will linger in your memory forever.</p>

      <div style="text-align: center; margin: 32px 0;">
        <div style="font-size: 42px; color: #C9A96E; margin-bottom: 8px;">✦</div>
        <p style="font-size: 14px; color: #8B7D6B; font-style: italic; max-width: 400px; margin: 0 auto;">
          "${destination} awaits — a world of wonder, intimacy, and discovery."
        </p>
      </div>

      <h3>What Happens Next</h3>
      <div style="margin-bottom: 24px;">
        <div style="display: flex; gap: 16px; margin-bottom: 16px;">
          <div style="width: 28px; height: 28px; background: #1A1A1A; color: #C9A96E; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0;">1</div>
          <div><p style="font-weight: 600; margin-bottom: 2px;">Journey Curation</p><p style="font-size: 12px; color: #8B7D6B; margin: 0;">Your personal concierge will craft a bespoke itinerary tailored to your preferences.</p></div>
        </div>
        <div style="display: flex; gap: 16px; margin-bottom: 16px;">
          <div style="width: 28px; height: 28px; background: #1A1A1A; color: #C9A96E; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0;">2</div>
          <div><p style="font-weight: 600; margin-bottom: 2px;">Proposal & Confirmation</p><p style="font-size: 12px; color: #8B7D6B; margin: 0;">Review your curated journey, confirm dates, and complete your booking.</p></div>
        </div>
        <div style="display: flex; gap: 16px;">
          <div style="width: 28px; height: 28px; background: #1A1A1A; color: #C9A96E; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0;">3</div>
          <div><p style="font-weight: 600; margin-bottom: 2px;">Final Itinerary</p><p style="font-size: 12px; color: #8B7D6B; margin: 0;">Receive your detailed itinerary, travel documents, and pre-trip guidance.</p></div>
        </div>
      </div>

      <div style="background: #F5F0EB; padding: 20px; margin-bottom: 24px;">
        <p style="font-size: 12px; color: #C9A96E; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Your Booking Reference</p>
        <p style="font-size: 24px; font-weight: 700; color: #1A1A1A; font-family: 'Courier New', monospace; margin: 0;">${bookingRef}</p>
      </div>

      <p>We are honored to be part of your story.</p>
      <p>Warmest regards,<br><strong style="color: #C9A96E;">The Kivara Team</strong></p>
    `)}
    ${documentFooter()}
  `;
  return wrapDocument(html, { title: `Welcome ${bookingRef}` });
}
