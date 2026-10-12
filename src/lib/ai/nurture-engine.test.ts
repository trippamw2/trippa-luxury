import { describe, it, expect } from "vitest";
import {
  lastTouchOn,
  isQuietLead,
  nurtureDestination,
  renderNurtureEmail,
  OPEN_LEAD_STATUSES,
  NURTURE_KIND,
  NURTURE_MESSAGE_TYPE,
  type NurtureLead,
} from "@/lib/ai/nurture-engine";

const NOW = new Date("2026-10-12T00:00:00Z");
const daysAgo = (n: number): string =>
  new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

function lead(overrides: Partial<NurtureLead> = {}): NurtureLead {
  return {
    full_name: "Naledi Okafor",
    email: "lead@example.com",
    preferred_destinations: ["Victoria Falls"],
    preferred_start_date: null,
    occasion: "honeymoon",
    lead_status: "proposal_sent",
    last_contacted_at: daysAgo(20),
    updated_at: daysAgo(20),
    created_at: daysAgo(40),
    ...overrides,
  };
}

describe("lastTouchOn", () => {
  it("returns the most recent of the three timestamps", () => {
    const touch = lastTouchOn(
      lead({ last_contacted_at: daysAgo(30), updated_at: daysAgo(2), created_at: daysAgo(60) })
    );
    expect(touch?.toISOString()).toBe(new Date(daysAgo(2)).toISOString());
  });

  it("returns null when there is no usable timestamp", () => {
    expect(
      lastTouchOn(
        lead({ last_contacted_at: null, updated_at: null, created_at: null })
      )
    ).toBeNull();
  });

  it("ignores an unparseable timestamp rather than throwing", () => {
    const touch = lastTouchOn(
      lead({ last_contacted_at: "not-a-date", updated_at: daysAgo(3), created_at: null })
    );
    expect(touch?.toISOString()).toBe(new Date(daysAgo(3)).toISOString());
  });
});

describe("isQuietLead", () => {
  it("is true for an open lead untouched for longer than the quiet window", () => {
    expect(isQuietLead(lead(), NOW)).toBe(true);
  });

  it("is false for a lead touched inside the quiet window", () => {
    expect(isQuietLead(lead({ last_contacted_at: daysAgo(1), updated_at: daysAgo(1) }), NOW)).toBe(
      false
    );
  });

  // A converted lead is a booking and gets booking reminders; a lost lead was
  // closed on purpose. Neither should be re-engaged.
  it("is false for a converted or lost lead", () => {
    expect(isQuietLead(lead({ lead_status: "booking" }), NOW)).toBe(false);
    expect(isQuietLead(lead({ lead_status: "lost" }), NOW)).toBe(false);
  });

  it("honours a custom quiet window", () => {
    expect(isQuietLead(lead({ last_contacted_at: daysAgo(3), updated_at: daysAgo(3) }), NOW, 2)).toBe(
      true
    );
  });

  it("is false when the lead has no usable timestamp at all", () => {
    expect(
      isQuietLead(lead({ last_contacted_at: null, updated_at: null, created_at: null }), NOW)
    ).toBe(false);
  });
});

describe("nurtureDestination", () => {
  it("returns the first named destination", () => {
    expect(nurtureDestination(lead({ preferred_destinations: ["South Luangwa", "Kafue"] }))).toBe(
      "South Luangwa"
    );
  });

  it("reads a destination object's name", () => {
    expect(
      nurtureDestination(lead({ preferred_destinations: [{ name: "Lower Zambezi" }] }))
    ).toBe("Lower Zambezi");
  });

  it("returns null for a missing or malformed preference", () => {
    expect(nurtureDestination(lead({ preferred_destinations: undefined }))).toBeNull();
    expect(nurtureDestination(lead({ preferred_destinations: "Victoria Falls" }))).toBeNull();
    expect(nurtureDestination(lead({ preferred_destinations: [] }))).toBeNull();
    expect(nurtureDestination(lead({ preferred_destinations: [42, ""] }))).toBeNull();
  });
});

describe("renderNurtureEmail", () => {
  it("names the destination in the subject and body", () => {
    const { subject, html } = renderNurtureEmail(lead());
    expect(subject).toContain("Victoria Falls");
    expect(html).toContain("Victoria Falls");
    expect(html).toContain("Naledi");
  });

  it("falls back to a generic subject when no destination is known", () => {
    const { subject, html } = renderNurtureEmail(lead({ preferred_destinations: [] }));
    expect(subject).toBe("Your Kivara journey is still waiting");
    expect(html).toContain("Kivara journey");
  });

  it("addresses a nameless lead without an empty salutation", () => {
    const { html } = renderNurtureEmail(lead({ full_name: null }));
    expect(html).toContain("there,");
  });

  it("includes the travel month when a start date is known", () => {
    const { html } = renderNurtureEmail(lead({ preferred_start_date: "2027-03-15" }));
    expect(html).toContain("March");
  });
});

describe("nurture constants", () => {
  it("excludes converted and lost leads from the open set", () => {
    expect(OPEN_LEAD_STATUSES).not.toContain("booking");
    expect(OPEN_LEAD_STATUSES).not.toContain("lost");
  });

  it("tags the row kind and message type for dispatch", () => {
    expect(NURTURE_KIND).toBe("nurture");
    expect(NURTURE_MESSAGE_TYPE).toBe("nurture");
  });
});
