// ─── Kivara Marketing Intelligence Agent (Master OS §13 — Marketing Assistant) ──
// Generates cross-channel campaigns and content that express Kivara's romance
// brand: 'Bush ⭐ Beach ⭐ Romance'. Maps guest segments to the emotional tones
// the Romance Intelligence agent surfaced, producing channel-ready copy with a
// graceful rule-based fallback when the LLM is unavailable.
// ─────────────────────────────────────────────────────────────────────────────

import { callLlmJson } from "./llm";
import { getBrandKnowledge } from "./knowledge";

export type Channel = "email" | "instagram" | "website" | "whatsapp" | "print";

export interface CampaignContent {
  subject: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface Campaign {
  id: string;
  name: string;
  audience: string;
  destination?: string;
  channels: Channel[];
  content: Partial<Record<Channel, CampaignContent>>;
  createdAt: string;
}

const AUDIENCE_TONES: Record<string, string> = {
  honeymoon: "newlyweds beginning their shared story",
  anniversary: "couples rekindling their connection",
  proposal: "partners planning a once-in-a-lifetime moment",
  "romantic-escape": "couples seeking a quiet escape",
  wedding: "couples celebrating their commitment",
};

const DESTINATION_IMAGERY: Record<string, string> = {
  zanzibar: "powder-white sands and turquoise shallows",
  "south-africa": "the bushveld under a golden African sky",
  mauritius: "lagoons of liquid turquoise",
  kenya: "savannahs that stretch to the horizon",
  seychelles: "granite boulders and hidden coves",
};

function rulesContent(audience: string, destination?: string): CampaignContent {
  const tone = AUDIENCE_TONES[audience.toLowerCase()] || "couples seeking the extraordinary";
  const imagery = (destination && DESTINATION_IMAGERY[destination.toLowerCase()]) || "landscapes made for two";
  const destSection = destination ? ` in ${destination}` : "";
  return {
    subject: `A story meant for two${destination ? `: ${destination}` : ""}`,
    headline: `Your ${audience} begins here`,
    body: `Imagine ${imagery}${destSection} — where every moment is curated for ${tone}. Bush, beach, and romance, woven into a journey that feels unmistakably yours.`,
    ctaLabel: "Begin Your Story",
    ctaUrl: "/",
  };
}

function channelContent(content: CampaignContent, channel: Channel): CampaignContent {
  if (channel === "instagram") {
    return {
      subject: content.subject,
      headline: content.headline,
      body: `${content.body} #BushBeachRomance #Kivara`,
      ctaLabel: "Explore",
      ctaUrl: content.ctaUrl,
    };
  }
  if (channel === "whatsapp") {
    return {
      subject: content.subject,
      headline: content.headline,
      body: `${content.headline} — ${content.body}`,
      ctaLabel: "Chat With Us",
      ctaUrl: "https://wa.me/",
    };
  }
  return content;
}

export class MarketingEngine {
  /**
   * Generate a cross-channel campaign. Uses the LLM to draft copy when
   * available; otherwise deterministic, brand-consistent copy. Never throws.
   */
  async generateCampaign(input: {
    audience: string;
    destination?: string;
    channels: Channel[];
    season?: string;
  }): Promise<Campaign> {
    const id = `CAMP-${Date.now().toString(36).toUpperCase()}`;
    const base = rulesContent(input.audience, input.destination);

    const content: Partial<Record<Channel, CampaignContent>> = {};
    for (const channel of input.channels) content[channel] = channelContent(base, channel);

    // Try to enrich the primary email copy with the LLM for a more emotional draft.
    try {
      const brand = getBrandKnowledge();
      const res = await callLlmJson<{ subject: string; headline: string; body: string }>([
        {
          role: "system",
          content: `You are Kivara's Marketing agent.${brand?.tagline ? ` Brand: ${brand.tagline}.` : ""} Write luxurious, romantic campaign copy. Output STRICT JSON: {subject, headline, body} with no markdown.`,
        },
        {
          role: "user",
          content: `Audience: ${input.audience}. Destination: ${input.destination || "any"}. Season: ${input.season || "any"}. Emit JSON.`,
        },
      ]);
      if (res.data?.subject && res.data?.body) {
        const llmBase = {
          subject: res.data.subject,
          headline: res.data.headline || base.headline,
          body: res.data.body,
          ctaLabel: base.ctaLabel,
          ctaUrl: base.ctaUrl,
        };
        for (const channel of input.channels) content[channel] = channelContent(llmBase, channel);
      }
    } catch {
      // deterministic copy already in place
    }

    return {
      id,
      name: `${input.audience} campaign${input.destination ? ` · ${input.destination}` : ""}`,
      audience: input.audience,
      destination: input.destination,
      channels: input.channels,
      content,
      createdAt: new Date().toISOString(),
    };
  }
}

export const marketingEngine = new MarketingEngine();
