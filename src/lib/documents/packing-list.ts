// ─── Kivara Packing List Document ───────────────────────────────────────
// Branded HTML document with packing checklist by season.

import { wrapDocument, documentHeader, documentBody, documentFooter } from "./template";

export function generatePackingListDocument(): string {
  const html = `
    ${documentHeader({ title: "Packing Checklist", reference: "TRAVEL-INFO", clientName: "Valued Guest" })}
    ${documentBody(`
      <h1>Packing Checklist for Your African Journey</h1>
      <p>Whether you are heading into the bush or along the coast, here is a curated packing guide to ensure you are perfectly prepared.</p>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 12px;">Essentials (All Seasons)</h3>
        <ul style="padding-left: 20px; line-height: 2;">
          <li>Passport (valid 6+ months) + visa copies</li>
          <li>Travel insurance documents</li>
          <li>Printed booking confirmations</li>
          <li>International driving permit (if self-driving)</li>
          <li>Cash (USD for visa fees, small denominations)</li>
          <li>Credit/debit cards (notify bank of travel)</li>
          <li>Phone + charger + universal adapter</li>
          <li>Camera + extra batteries/memory cards</li>
          <li>Sunscreen SPF 50+ and lip balm with SPF</li>
          <li>Insect repellent (DEET-based)</li>
          <li>Personal medications + basic first aid</li>
        </ul>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 12px;">Dry Season (May – October)</h3>
        <ul style="padding-left: 20px; line-height: 2;">
          <li>Light layers (warm days, cool mornings)</li>
          <li>Fleece or warm jacket for morning game drives</li>
          <li>Neutral-coloured clothing (khaki, olive, tan)</li>
          <li>Wide-brimmed hat + sunglasses</li>
          <li>Comfortable walking shoes</li>
          <li>Light scarf or buff for dust</li>
          <li>Binoculars (essential for wildlife viewing)</li>
        </ul>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 12px;">Green Season (November – April)</h3>
        <ul style="padding-left: 20px; line-height: 2;">
          <li>Lightweight, breathable clothing</li>
          <li>Rain jacket or poncho</li>
          <li>Waterproof bag for electronics</li>
          <li>Quick-dry clothing</li>
          <li>Waterproof hiking sandals</li>
          <li>Mosquito net (if not provided by lodge)</li>
        </ul>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 12px;">Beach & Coastal Destinations</h3>
        <ul style="padding-left: 20px; line-height: 2;">
          <li>Swimwear (2-3 sets)</li>
          <li>Beach cover-up or sarong</li>
          <li>Reef-safe sunscreen</li>
          <li>Snorkelling gear (or rent locally)</li>
          <li>Light cotton clothing</li>
          <li>Water shoes for rocky areas</li>
        </ul>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C9A96E; font-size: 16px; margin-bottom: 12px;">Luxury Extras</h3>
        <ul style="padding-left: 20px; line-height: 2;">
          <li>Sundress or smart casual outfit for lodge dinners</li>
          <li>Light shawl for air-conditioned interiors</li>
          <li>Quality leather journal and pen</li>
          <li>A good book for travel days</li>
          <li>Portable speaker for private moments</li>
        </ul>
      </div>

      <div style="background: #F5F0EB; padding: 16px; margin-bottom: 24px;">
        <p style="font-size: 12px; color: #8B7D6B; margin: 0;"><strong>Packing Tip:</strong> Most luxury lodges offer laundry service, so you can pack lighter than you think. We recommend soft-sided luggage for bush flights (weight limits typically 15-20kg).</p>
      </div>

      <p>For questions, contact your Kivara concierge at <strong style="color: #C9A96E;">concierge@kivara.luxury</strong></p>
    `)}
    ${documentFooter()}
  `;

  return wrapDocument(html, { title: "Packing Checklist — Kivara Travel Guide" });
}
