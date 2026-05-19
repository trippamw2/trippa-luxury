// ─── Kivara Final Itinerary Document ───────────────────────────────────

import { wrapDocument, documentHeader, documentBody, documentFooter, refBox, infoGrid } from "./template";
import type { CuratedJourney } from "@/lib/ai/types";

export function generateItineraryDocument(journey: CuratedJourney): string {
  const daysHtml = journey.itinerary.map(d => {
    const activitiesList = d.activities.map(a => `
      <div style="display: flex; gap: 12px; margin-bottom: 10px; padding: 8px 12px; background: #FAF7F2;">
        ${a.time ? `<div style="width: 70px; font-size: 11px; color: #C9A96E; font-weight: 600; flex-shrink: 0;">${a.time}</div>` : ""}
        <div style="flex: 1;">
          <p style="font-size: 13px; font-weight: 600; margin-bottom: 2px; color: #1A1A1A;">${a.title}</p>
          <p style="font-size: 12px; color: #8B7D6B; margin: 0;">${a.description}</p>
        </div>
        <div style="font-size: 10px; color: #8B7D6B; flex-shrink: 0;">${a.duration}</div>
      </div>`).join("");

    const transfersList = d.transfers.map(t => `
      <div style="font-size: 12px; color: #8B7D6B; margin-bottom: 4px;">
        <span style="color: #C9A96E;">✈</span> ${t.from} → ${t.to}
        <span style="color: #A89880;"> (${t.mode} · ${t.duration})</span>
      </div>`).join("");

    return `
      <div style="margin-bottom: 24px; page-break-inside: avoid;">
        <div style="background: #1A1A1A; padding: 12px 16px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 11px; color: #C9A96E; text-transform: uppercase; letter-spacing: 2px;">Day ${d.day}</span>
              <h3 style="font-size: 16px; color: white; margin: 4px 0 0;">${d.title}</h3>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 12px; color: #A89880; margin: 0;">${d.accommodation}</p>
              <p style="font-size: 11px; color: #8B7D6B; margin: 0;">${d.location}</p>
            </div>
          </div>
        </div>

        ${transfersList ? `<div style="margin-bottom: 12px;">${transfersList}</div>` : ""}

        ${activitiesList}

        <div style="margin-top: 8px; display: flex; gap: 6px;">
          ${d.meals.map(m => `<span style="font-size: 10px; background: #C9A96E; color: white; padding: 2px 8px;">${m}</span>`).join("")}
        </div>

        ${d.highlights.length > 0 ? `
        <div style="margin-top: 8px; padding: 8px 12px; background: #F5F0EB; border-left: 2px solid #C9A96E;">
          <p style="font-size: 11px; color: #C9A96E; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Highlights</p>
          <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #4A4A4A;">
            ${d.highlights.map(h => `<li>${h}</li>`).join("")}
          </ul>
        </div>` : ""}
      </div>`;
  }).join("");

  const html = `
    ${documentHeader({ title: "Final Itinerary", reference: journey.id, clientName: journey.guestProfile.name })}
    ${documentBody(`
      <h1>Dear ${journey.guestProfile.name},</h1>
      <p>Your journey is confirmed. Every detail has been arranged for your comfort and delight. Inside this document, you will find the complete itinerary for your Kivara experience.</p>

      ${refBox("Journey Reference", journey.id)}

      ${infoGrid([
        { label: "Guest", value: journey.guestProfile.name },
        { label: "Duration", value: `${journey.duration} Nights` },
        { label: "Destinations", value: journey.destinations.map(d => d.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())).join(", ") },
        { label: "Total Investment", value: `$${journey.pricing.total.toLocaleString()} ${journey.pricing.currency}` },
      ])}

      <h3>Journey Overview</h3>
      <p style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">${journey.title}</p>
      <p style="font-size: 13px; color: #8B7D6B; margin-bottom: 24px;">${journey.subtitle}</p>

      <h3>Your Itinerary</h3>
      ${daysHtml}

      <hr class="divider" />

      <h3>Journey Highlights</h3>
      <ul style="padding-left: 20px; font-size: 13px; color: #4A4A4A; line-height: 1.8;">
        ${journey.highlights.map(h => `<li>${h}</li>`).join("")}
      </ul>

      <h3>Included in Your Journey</h3>
      <ul style="padding-left: 20px; font-size: 13px; color: #4A4A4A; line-height: 1.8;">
        ${journey.includedExtras.map(e => `<li>${e}</li>`).join("")}
      </ul>

      <hr class="divider" />

      <div style="background: #F5F0EB; padding: 20px; margin-bottom: 24px;">
        <h3 style="font-size: 12px; color: #C9A96E; border: none; padding: 0; margin-bottom: 8px;">Concierge Contact</h3>
        <p style="font-size: 13px; color: #4A4A4A; margin-bottom: 4px;">Your personal concierge is available 24/7 during your travels.</p>
        <p style="font-size: 13px; color: #4A4A4A; margin-bottom: 2px;">Email: <strong>concierge@kivara.luxury</strong></p>
        <p style="font-size: 13px; color: #4A4A4A; margin: 0;">WhatsApp: <strong>+27 87 123 4567</strong></p>
      </div>

      <p>Warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Concierge</strong></p>
    `)}
    ${documentFooter()}
  `;

  return wrapDocument(html, { title: `Itinerary ${journey.id}` });
}
