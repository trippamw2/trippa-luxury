// ─── Kivara Nurture Engine ────────────────────────────────────────────────
// Re-engagement copy for leads who showed interest and then went quiet.
//
// This is the last funnel gap: booking-adjacent messages already flow through
// the stage-and-review pipeline, but a lead who never converted had no arm at
// all. Like every other outbound message, nurture is composed into
// `staged_reminders` for a human to read before a lead ever sees it — this
// module only renders the message, it never sends.
//
// Nurture is treated as marketing mail, not service mail: it is a promotional
// re-engagement, so a plain unsubscribe stops it. That decision is encoded in
// the row's `kind` ('nurture'), which dispatch reads to pick the right
// suppression scope.

/** `kind` recorded on a staged nurture row. Dispatch keys suppression scope off this. */
export const NURTURE_KIND = "nurture";

/** `message_type` recorded on a staged nurture row. */
export const NURTURE_MESSAGE_TYPE = "nurture";

/**
 * A lead counts as "quiet" once nothing has touched them for this long. Long
 * enough that a normal back-and-forth is not interrupted, short enough that the
 * journey is still warm in their mind.
 */
export const QUIET_LEAD_DAYS = 7;

/**
 * Lead statuses that are still in play. 'booking' and 'lost' are excluded: a
 * lead who converted is a booking and gets booking reminders, and a lead marked
 * lost has been deliberately closed — re-engaging them would be the platform
 * overriding an operator's decision.
 */
export const OPEN_LEAD_STATUSES: readonly string[] = [
  "new",
  "contacted",
  "qualified",
  "discovery",
  "journey_design",
  "proposal_sent",
  "negotiation",
];

/** The subset of a `leads` row this engine reads. */
export interface NurtureLead {
  full_name: string | null;
  email: string;
  /** JSONB array of destination names, as stored on `leads.preferred_destinations`. */
  preferred_destinations?: unknown;
  preferred_start_date?: string | null;
  occasion?: string | null;
  lead_status?: string | null;
  last_contacted_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The most recent instant anything touched this lead — a logged contact, an
 * edit, or its own creation. `last_contacted_at` alone is unreliable because a
 * lead may never have been explicitly contacted, and `updated_at` alone fires
 * on every unrelated admin edit; the latest of the three is the honest answer
 * to "when did we last engage this person". Returns null when the row carries
 * no usable timestamp at all.
 */
export function lastTouchOn(lead: NurtureLead): Date | null {
  const candidates = [
    parseDate(lead.last_contacted_at),
    parseDate(lead.updated_at),
    parseDate(lead.created_at),
  ].filter((d): d is Date => d !== null);

  if (candidates.length === 0) return null;
  return candidates.reduce((latest, d) => (d > latest ? d : latest));
}

/** True when the lead is still open and has been untouched for `quietDays`. */
export function isQuietLead(
  lead: NurtureLead,
  now: Date = new Date(),
  quietDays: number = QUIET_LEAD_DAYS
): boolean {
  if (lead.lead_status && !OPEN_LEAD_STATUSES.includes(lead.lead_status)) return false;
  const lastTouch = lastTouchOn(lead);
  if (lastTouch === null) return false;
  const cutoff = new Date(now.getTime() - quietDays * 24 * 60 * 60 * 1000);
  return lastTouch < cutoff;
}

/**
 * First destination named on the lead, if any. `preferred_destinations` is
 * JSONB and may be absent, null, a string, or an array of strings/objects —
 * anything unexpected degrades to null rather than throwing, because a
 * malformed preference must not stop the run.
 */
export function nurtureDestination(lead: NurtureLead): string | null {
  const raw = lead.preferred_destinations;
  if (!Array.isArray(raw)) return null;
  for (const entry of raw) {
    if (typeof entry === "string" && entry.trim() !== "") return entry.trim();
    if (entry && typeof entry === "object") {
      const name = (entry as Record<string, unknown>).name;
      if (typeof name === "string" && name.trim() !== "") return name.trim();
    }
  }
  return null;
}

function emailHtml(bodyContent: string): string {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; color: #1A1A1A;">
      <div style="background: #1A1A1A; padding: 24px 40px; text-align: center;">
        <h1 style="font-family: 'Times New Roman', serif; color: #D4BC8A; font-size: 20px; margin: 0; letter-spacing: 2px;">KIVARA</h1>
      </div>
      <div style="padding: 32px 40px;">
        ${bodyContent}
      </div>
      <div style="background: #EDE5DA; padding: 16px 40px; text-align: center;">
        <p style="font-size: 10px; color: #8B7D6B; margin: 0;">kivara.africa : concierge@kivara.africa</p>
      </div>
    </div>`;
}

/**
 * Renders the re-engagement email for one lead. Kept a pure function of the lead
 * so the staged row and the delivered message cannot drift.
 */
export function renderNurtureEmail(lead: NurtureLead): { subject: string; html: string } {
  const firstName = (lead.full_name || "").trim().split(/\s+/)[0] || "there";
  const destination = nurtureDestination(lead);
  const travelDate = parseDate(lead.preferred_start_date)?.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const subject = destination
    ? `Still dreaming of ${destination}?`
    : "Your Kivara journey is still waiting";

  const destinationLine = destination
    ? `<p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">When we last spoke, <strong>${destination}</strong> was on your mind${travelDate ? ` for around <strong>${travelDate}</strong>` : ""}. Journeys like that are worth taking at the right moment — not a hurried one.</p>`
    : `<p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">When we last spoke, you were considering a Kivara journey. We design each one around the traveller, so nothing is lost by starting the conversation again.</p>`;

  return {
    subject,
    html: emailHtml(`
      <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">${firstName},</h2>
      ${destinationLine}
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">If you would like to pick the thread back up, your concierge is here. A single reply is enough — we will take it from there.</p>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 16px 0 0;">With warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Concierge</strong></p>
    `),
  };
}
