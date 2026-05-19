// ─── Kivara Referral Request Document ───────────────────────────────────

import { wrapDocument, documentHeader, documentBody, documentFooter } from "./template";

export function generateReferralDocument(clientName: string, bookingRef: string): string {
  const html = `
    ${documentHeader({ title: "Referral Request", reference: bookingRef, clientName })}
    ${documentBody(`
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="font-size: 40px; color: #C9A96E; margin-bottom: 8px;">♡</div>
        <h1>Do You Know Someone Who Deserves the Kivara Experience?</h1>
      </div>

      <p>Dear ${clientName},</p>
      <p>We hope the memories of your Kivara journey are settling beautifully into your everyday life. It was a privilege to curate your African escape.</p>

      <p>If you know someone who would treasure a Kivara journey — a couple celebrating their love, friends seeking adventure, or family in need of renewal — we would be honored by an introduction.</p>

      <div style="background: #F5F0EB; padding: 24px; text-align: center; margin: 32px 0;">
        <p style="font-size: 11px; color: #8B7D6B; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Referral Reward</p>
        <p style="font-size: 14px; color: #1A1A1A; margin: 0;">As a token of our gratitude, referred bookings include a <strong style="color: #C9A96E;">complimentary upgrade or special amenity</strong> on your next journey.</p>
      </div>

      <p>To refer someone, simply reply to this email with their contact details, or share this link:</p>
      <p style="text-align: center; font-size: 14px; color: #C9A96E; margin: 16px 0;"><strong>kivara.luxury/refer</strong></p>

      <p>Thank you for being part of the Kivara family.</p>
      <p>With gratitude,<br><strong style="color: #C9A96E;">Your Kivara Team</strong></p>
    `)}
    ${documentFooter()}
  `;
  return wrapDocument(html, { title: `Referral ${bookingRef}` });
}
