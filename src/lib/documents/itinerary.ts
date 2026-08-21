// ─── Kivara Final Itinerary Document ───────────────────────────────────

import { wrapDocument, documentHeader, documentBody, documentFooter, refBox, infoGrid } from "./template";
import type { CuratedJourney } from "@/lib/ai/types";

export function generateItineraryDocument(journey: CuratedJourney): string {
  const isCouple = journey.guestProfile.isCouple ?? true;
  const guestCount = isCouple ? 2 : 1;
  const transferCost = journey.pricing.transfers.reduce((s, t) => s + t.cost, 0);
  const accomSubtotal = journey.pricing.subtotal - transferCost;
  const occasion = journey.guestProfile.specialOccasion;
  const prefs = journey.guestProfile.preferences;

  // Occasion-specific greeting
  let occasionSection = "";
  if (occasion === "honeymoon") {
    occasionSection = `
      <div style="background: linear-gradient(135deg, #FAF7F2, #F5F0EB); padding: 24px; margin-bottom: 24px; border-left: 3px solid #C9A96E;">
        <p style="font-size: 14px; color: #C9A96E; font-family: 'Playfair Display', serif; font-style: italic; margin-bottom: 8px;">A Romance Written in the Stars</p>
        <p style="font-size: 13px; color: #4A4A4A; margin: 0;">This journey was curated for the beginning of your forever. Every moment has been designed to deepen your connection and create memories that will last a lifetime. From sunrise to starlight, this is your love story, written across Africa.</p>
      </div>`;
  } else if (occasion === "anniversary") {
    occasionSection = `
      <div style="background: linear-gradient(135deg, #FAF7F2, #F5F0EB); padding: 24px; margin-bottom: 24px; border-left: 3px solid #C9A96E;">
        <p style="font-size: 14px; color: #C9A96E; font-family: 'Playfair Display', serif; font-style: italic; margin-bottom: 8px;">Celebrating Your Journey Together</p>
        <p style="font-size: 13px; color: #4A4A4A; margin: 0;">The years you have shared deserve a celebration as extraordinary as your bond. This journey honors the depth of your connection — quiet moments of reconnection, shared adventures, and the kind of intimacy that only comes from truly knowing another person.</p>
      </div>`;
  } else if (occasion === "birthday") {
    occasionSection = `
      <div style="background: linear-gradient(135deg, #FAF7F2, #F5F0EB); padding: 24px; margin-bottom: 24px; border-left: 3px solid #C9A96E;">
        <p style="font-size: 14px; color: #C9A96E; font-family: 'Playfair Display', serif; font-style: italic; margin-bottom: 8px;">A Birthday Celebration in the Wild</p>
        <p style="font-size: 13px; color: #4A4A4A; margin: 0;">You deserve a birthday unlike any other. Surprise moments, unexpected delights, and the raw beauty of Africa as your celebration backdrop. This journey is your gift — from us, and from the wild.</p>
      </div>`;
  } else if (occasion === "proposal") {
    occasionSection = `
      <div style="background: linear-gradient(135deg, #FAF7F2, #F5F0EB); padding: 24px; margin-bottom: 24px; border-left: 3px solid #C9A96E;">
        <p style="font-size: 14px; color: #C9A96E; font-family: 'Playfair Display', serif; font-style: italic; margin-bottom: 8px;">The Most Important Question</p>
        <p style="font-size: 13px; color: #4A4A4A; margin: 0;">Every moment of this journey has been designed to build toward that one perfect second. A secret photographer, champagne on standby, and a setting so beautiful the answer is already in the air. We will handle every detail — you just speak from the heart.</p>
      </div>`;
  }

  // Travel style reflection
  let styleReflection = "";
  if (prefs.travelStyle === "romantic") {
    styleReflection = `<p style="font-size: 12px; color: #8B7D6B; margin-bottom: 4px;"><strong>Your Style:</strong> Romantic — intimate moments, private settings, and the kind of closeness that only comes from being truly alone together.</p>`;
  } else if (prefs.travelStyle === "adventure") {
    styleReflection = `<p style="font-size: 12px; color: #8B7D6B; margin-bottom: 4px;"><strong>Your Style:</strong> Adventure — walking safaris, game drives, and the thrill of discovering Africa's wild heart together.</p>`;
  } else if (prefs.travelStyle === "relaxation") {
    styleReflection = `<p style="font-size: 12px; color: #8B7D6B; margin-bottom: 4px;"><strong>Your Style:</strong> Relaxation — unhurried days, stillness, and the luxury of having nothing to do but be together.</p>`;
  } else if (prefs.travelStyle === "cultural") {
    styleReflection = `<p style="font-size: 12px; color: #8B7D6B; margin-bottom: 4px;"><strong>Your Style:</strong> Cultural — connection with local people, ancient traditions, and the soul of Africa.</p>`;
  }

  const accommodationRows = journey.pricing.accommodation.map(a => {
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
      <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #4A4A4A; margin-bottom: 6px; padding: 6px 10px; background: #F9F6F0; border-left: 2px solid #C9A96E;">
        <span style="font-size: 14px; flex-shrink: 0;">${t.mode === "flight" ? "✈" : "🚙"}</span>
        <div style="flex: 1;">
          <span style="font-weight: 600;">${t.from}</span>
          <span style="color: #C9A96E; margin: 0 4px;">→</span>
          <span style="font-weight: 600;">${t.to}</span>
          <div style="font-size: 10px; color: #8B7D6B; margin-top: 1px;">
            ${t.mode === "flight" ? "Charter flight" : "Private road transfer"} · ${t.duration}
            ${t.cost ? ` · <span style="color: #C9A96E;">$${t.cost.toLocaleString()}/person</span>` : ""}
          </div>
        </div>
        ${t.notes ? `<div style="font-size: 10px; color: #8B7D6B; max-width: 200px; text-align: right; line-height: 1.4;">${t.notes}</div>` : ""}
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
      ${occasionSection}
      <p>Your journey is confirmed. Every detail has been arranged for your comfort and delight. Inside this document, you will find the complete itinerary for your Kivara experience — a journey designed specifically around your story.</p>

      ${refBox("Journey Reference", journey.id)}

      ${infoGrid([
        { label: "Guest", value: journey.guestProfile.name },
        { label: "Party", value: `${isCouple ? "Couple" : "Solo Traveller"} · ${isCouple ? "2 Guests" : "1 Guest"}` },
        { label: "Duration", value: `${journey.duration} Nights` },
        { label: "Destinations", value: journey.destinations.map(d => d.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())).join(", ") },
      ])}

      ${styleReflection}

      <h3>Journey Overview</h3>
      <p style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">${journey.title}</p>
      <p style="font-size: 13px; color: #8B7D6B; margin-bottom: 24px;">${journey.subtitle}</p>

      <h3>Investment Summary</h3>
      <table>
        <thead>
          <tr><th>Accommodation</th><th class="text-center">Nights</th><th class="text-right">PPPN</th><th class="text-right">${isCouple ? "Per Couple" : "Per Person"}/Night</th><th class="text-right">Subtotal</th></tr>
        </thead>
        <tbody>${accommodationRows}</tbody>
        <tfoot>
          <tr><td colspan="4" class="text-right subtotal-label">Accommodation Subtotal</td><td class="text-right">$${accomSubtotal.toLocaleString()}</td></tr>
          <tr><td colspan="4" class="text-right subtotal-label">Private Charters & Transfers</td><td class="text-right">$${transferCost.toLocaleString()}</td></tr>
          <tr><td colspan="4" class="text-right subtotal-label">Taxes & Fees (10%)</td><td class="text-right font-bold">$${journey.pricing.taxes.toLocaleString()}</td></tr>
          <tr class="total-row"><td colspan="4" class="text-right">Total</td><td class="text-right total-amount">$${journey.pricing.total.toLocaleString()} ${journey.pricing.currency}</td></tr>
        </tfoot>
      </table>
      <p class="text-earth text-xs">${isCouple ? "PPPN = Per Person Per Night (double occupancy). Per Couple/Night = PPPN × 2." : "PPPN = Per Person Per Night (single occupancy)."} Transfer costs cover all private charters and road transfers for your entire party.</p>

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
