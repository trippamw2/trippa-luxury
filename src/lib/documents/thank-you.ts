// ─── Kivara Thank You Document ─────────────────────────────────────────

import { wrapDocument, documentHeader, documentBody, documentFooter } from "./template";

export function generateThankYouDocument(clientName: string, bookingRef: string, destination: string): string {
  const html = `
    ${documentHeader({ title: "Thank You", reference: bookingRef, clientName })}
    ${documentBody(`
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="font-size: 48px; color: #C9A96E; margin-bottom: 12px;">✦</div>
        <h1>Thank You, ${clientName}.</h1>
        <p style="font-size: 15px; color: #8B7D6B; font-style: italic;">Your journey with Kivara has been a privilege.</p>
      </div>

      <p>We hope your time in ${destination} was everything you dreamed of : and more. It has been our honor to curate this experience for you, and we trust you will carry the memories with you always.</p>

      <div style="background: #F5F0EB; padding: 24px; text-align: center; margin: 32px 0;">
        <p style="font-size: 14px; color: #1A1A1A; font-style: italic; margin-bottom: 8px;">
          "Travel is the only thing you buy that makes you richer."
        </p>
        <p style="font-size: 12px; color: #8B7D6B; margin: 0;">: We hope Africa has enriched your soul.</p>
      </div>

      <p>We would be honored if you would share your experience with others who might treasure a Kivara journey. Your voice is our greatest endorsement.</p>

      <h3>Share Your Experience</h3>
      <p>Leave a review: <strong style="color: #C9A96E;">kivara.luxury/review</strong></p>
      <p>Refer a friend: <strong style="color: #C9A96E;">kivara.luxury/refer</strong></p>

      <hr class="divider" />

      <p>Until we meet again,${clientName.includes("&") ? "" : ""}</p>
      <p>With deepest gratitude,<br><strong style="color: #C9A96E;">The Kivara Team</strong></p>
    `)}
    ${documentFooter()}
  `;
  return wrapDocument(html, { title: `Thank You ${bookingRef}` });
}
