// ─── Kivara Proposal Agent (Master OS §7 — Proposal Agent) ───────────────────
// Generates highly personalised, story-driven proposals that go beyond a quote.
// A proposal leads with the emotional "why" of the journey (from the Romance
// Intelligence agent), then the itinerary, then the investment. It passes
// through the Quality Gate before release.
// ─────────────────────────────────────────────────────────────────────────────

import { JourneyEngine } from "./journey-engine";
import { runQualityGate, type QcVerdict } from "./quality-gate";
import type { GuestProfile, CuratedJourney } from "./types";
import type { EmotionalProfile } from "./romance-engine";
import { callLlmJson } from "./llm";
import { journeyIntro, journeyOverview } from "@/lib/voice";

const engine = new JourneyEngine();

export interface Proposal {
  ref: string;
  createdFor: string;
  emotionalProfile: EmotionalProfile;
  openingNarrative: string;
  journey: CuratedJourney;
  investment: {
    subtotal: number;
    taxes: number;
    total: number;
    currency: string;
    depositPercent: number;
    depositRequired: number;
  };
  validUntil: string;
  paymentTerms: string;
  quality: QcVerdict;
  createdAt: string;
}

function openingFor(profile: EmotionalProfile, name: string, destinations: string[]): string {
  return `Every great love story has a setting that lets it breathe. ${
    journeyIntro(name, destinations.join(" and "))
  } This journey is ${profile.occasionLabel.toLowerCase()}, crafted around ${profile.couplePsychology.toLowerCase()} ${profile.privacyNeeds.toLowerCase()}`;
}

export class ProposalEngine {
  /**
   * Generate a full story-driven proposal. The opening narrative is written by
   * the LLM in Kivara's voice when available, with a deterministic template
   * fallback. Never throws.
   */
  async generateProposal(profile: GuestProfile, emotion: EmotionalProfile): Promise<Proposal> {
    const journey = engine.generate(profile);
    const total = journey.pricing.total;
    const subtotal = journey.pricing.subtotal;
    const taxes = journey.pricing.taxes;
    const currency = journey.pricing.currency;
    const depositPercent = 30;
    const depositRequired = Math.round(total * (depositPercent / 100));

    const quality = runQualityGate(journey, depositRequired);

    const fallbackNarrative = openingFor(emotion, profile.name, journey.destinations);

    // LLM narrative with graceful fallback to the template.
    let openingNarrative = fallbackNarrative;
    try {
      const { data } = await callLlmJson<{ narrative: string }>(
        [
          {
            role: "system",
            content:
              "You are Kivara's senior proposal writer for an ultra-luxury Zambian travel house. " +
              "Write a 2-3 sentence opening narrative (max 60 words) that leads with the emotional 'why' of the journey. " +
              "Use warm, understated, editorial luxury language. Mention the journey's destination(s). " +
              "Never mention pricing, itineraries, or logistics in the opening.",
          },
          {
            role: "user",
            content: [
              `Guest: ${profile.name}`,
              `Occasion: ${emotion.occasionLabel}`,
              `Couple psychology: ${emotion.couplePsychology}`,
              `Privacy needs: ${emotion.privacyNeeds}`,
              `Destinations: ${journey.destinations.join(", ")}`,
            ].join("\n"),
          },
        ],
        { temperature: 0.8, maxTokens: 260 }
      );
      const narrative = data.narrative?.trim();
      if (narrative) openingNarrative = narrative;
    } catch (err: unknown) {
      console.warn("Proposal narrative LLM unavailable, using template:", err instanceof Error ? err.message : String(err));
    }

    return {
      ref: `P-${journey.id}`,
      createdFor: profile.name,
      emotionalProfile: emotion,
      openingNarrative,
      journey,
      investment: {
        subtotal,
        taxes,
        total,
        currency,
        depositPercent,
        depositRequired,
      },
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      paymentTerms:
        "A 30% deposit is requested to secure your reservation. The balance will be due 30 days before your departure. We will never alter pricing once confirmed.",
      quality,
      createdAt: new Date().toISOString(),
    };
  }

  generateProposalHtml(proposal: Proposal): string {
    const j = proposal.journey;
    const itinerary = j.itinerary
      .map(
        (d) => `
        <div style="margin-bottom: 14px; padding: 14px; background: #F5F0EB; border-left: 3px solid #C9A96E;">
          <p style="font-size: 11px; color: #C9A96E; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Day ${d.day}</p>
          <h3 style="font-size: 16px; color: #1A1A1A; margin: 0 0 4px; font-family: 'Times New Roman', serif;">${d.title}</h3>
          <p style="font-size: 12px; color: #8B7D6B; margin: 0;">${d.accommodation} · ${d.location}</p>
        </div>`
      )
      .join("");

    return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #FAF7F2; color: #1A1A1A;">
      <div style="background: #141414; padding: 40px 48px 30px; text-align: center;">
        <p style="color: #D4BC8A; font-size: 10px; text-transform: uppercase; letter-spacing: 4px; margin: 0 0 8px;">KIVARA</p>
        <p style="color: #A89880; font-size: 12px; font-style: italic; margin: 0;">The African Love Story</p>
      </div>
      <div style="padding: 40px;">
        <h2 style="font-family: 'Times New Roman', serif; font-size: 24px; color: #1A1A1A; margin: 0 0 12px;">${proposal.createdFor},</h2>
        <p style="font-size: 15px; color: #4A4A4A; line-height: 1.8; margin: 0 0 20px;">${proposal.openingNarrative}</p>

        <div style="background: #F5F0EB; padding: 16px; border-left: 3px solid #C9A96E; margin-bottom: 24px;">
          <p style="font-size: 13px; color: #8B7D6B; margin: 0; font-style: italic;">${proposal.emotionalProfile.occasionLabel}</p>
        </div>

        <h3 style="font-size: 13px; color: #1A1A1A; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #EDE5DA; padding-bottom: 8px; margin: 0 0 12px;">Your Journey</h3>
        <p style="font-size: 18px; color: #1A1A1A; margin: 0 0 4px; font-weight: 600;">${j.title}</p>
        <p style="font-size: 13px; color: #8B7D6B; margin: 0 0 16px;">${journeyOverview(j.destinations, j.duration)}</p>

        <h3 style="font-size: 13px; color: #1A1A1A; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #EDE5DA; padding-bottom: 8px; margin: 0 0 12px;">Itinerary</h3>
        ${itinerary}

        <h3 style="font-size: 13px; color: #1A1A1A; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #EDE5DA; padding-bottom: 8px; margin: 24px 0 12px;">Investment</h3>
        <p style="font-size: 13px; color: #4A4A4A;">Total Investment: <strong style="color: #C9A96E;">$${proposal.investment.total.toLocaleString()} ${proposal.investment.currency}</strong></p>
        <p style="font-size: 13px; color: #4A4A4A;">Deposit to reserve: <strong>$${proposal.investment.depositRequired.toLocaleString()} (${proposal.investment.depositPercent}%)</strong></p>
        <p style="font-size: 12px; color: #8B7D6B; margin-top: 8px;">Valid until ${proposal.validUntil}. ${proposal.paymentTerms}</p>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/payment?ref=${proposal.ref}" style="display: inline-block; padding: 14px 40px; background: #1A1A1A; color: #FAF7F2; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Reserve This Story</a>
        </div>
        <p style="font-size: 13px; color: #4A4A4A; text-align: center; margin-top: 24px;">With warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Concierge</strong></p>
      </div>
    </div>`;
  }
}

export const proposalEngine = new ProposalEngine();
