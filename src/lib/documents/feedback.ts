// ─── Kivara Feedback / Review Request Document ─────────────────────────

import { wrapDocument, documentHeader, documentBody, documentFooter } from "./template";

export function generateFeedbackDocument(clientName: string, bookingRef: string, destination: string): string {
  const html = `
    ${documentHeader({ title: "We Value Your Feedback", reference: bookingRef, clientName })}
    ${documentBody(`
      <h1>How Was Your Journey, ${clientName}?</h1>
      <p>It has been a week since your return from ${destination}. We would be honored if you would share your experience with us.</p>

      <div style="text-align: center; margin: 32px 0;">
        <div style="font-size: 36px; margin-bottom: 12px;">
          <span style="color: #C9A96E;">★</span>
          <span style="color: #C9A96E;">★</span>
          <span style="color: #C9A96E;">★</span>
          <span style="color: #C9A96E;">★</span>
          <span style="color: #C9A96E;">★</span>
        </div>
        <p style="font-size: 14px; color: #8B7D6B;">Tap the stars to rate your experience</p>
      </div>

      <h3>We'd Love to Hear</h3>
      <ul style="padding-left: 20px; font-size: 13px; color: #4A4A4A; line-height: 1.8; margin-bottom: 24px;">
        <li>What was the highlight of your journey?</li>
        <li>How was the service from your concierge?</li>
        <li>Were the accommodations to your liking?</li>
        <li>What could we improve?</li>
        <li>Would you recommend Kivara to others?</li>
      </ul>

      <div style="background: #F5F0EB; padding: 16px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 12px; color: #8B7D6B; margin-bottom: 8px;">Share your feedback online:</p>
        <p style="font-size: 16px; color: #C9A96E; font-weight: 600;">kivara.luxury/review</p>
      </div>

      <p>Alternatively, simply reply to this email with your thoughts. We treasure every word.</p>
      <p>With warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Team</strong></p>
    `)}
    ${documentFooter()}
  `;
  return wrapDocument(html, { title: `Feedback ${bookingRef}` });
}
