/**
 * Minimal iCal (.ics) generator for booking exports.
 * Produces valid VCALENDAR/VEVENT output without external dependencies.
 */

interface ICalEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location: string;
  organizer?: string;
}

function formatDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateICal(events: ICalEvent[]): string {
  const lines: string[] = [];

  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Kivara Luxury Travel//Bookings//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTART:${formatDate(event.start)}`);
    lines.push(`DTEND:${formatDate(event.end)}`);
    lines.push(`DTSTAMP:${formatDate(new Date())}`);
    lines.push(`SUMMARY:${escapeText(event.summary)}`);
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    lines.push(`LOCATION:${escapeText(event.location)}`);
    if (event.organizer) {
      lines.push(`ORGANIZER;CN=${escapeText(event.organizer)}:mailto:${event.organizer}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // Fold lines at 75 characters per RFC 5545
  const folded = lines.map((line) => {
    if (line.length <= 75) return line;
    const first = line.slice(0, 75);
    const rest = line.slice(75);
    const wrapped = rest.match(/.{1,74}/g) || [];
    return first + "\r\n " + wrapped.join("\r\n ");
  });

  return folded.join("\r\n") + "\r\n";
}

export function bookingToICalEvent(booking: {
  id: string;
  bookingReference: string;
  clientName: string;
  clientEmail?: string;
  destination?: string;
  propertyName?: string;
  startDate: string;
  endDate: string;
}): ICalEvent {
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);
  // iCal DTEND is exclusive, so add a day for "checkout" style bookings
  const endExclusive = new Date(end);
  endExclusive.setDate(endExclusive.getDate() + 1);

  const location = [booking.destination, booking.propertyName].filter(Boolean).join(" : ");
  const ref = booking.bookingReference || booking.id.slice(0, 8).toUpperCase();

  return {
    uid: `${booking.id}@kivara.luxury`,
    start,
    end: endExclusive,
    summary: `${booking.clientName} : ${ref}`,
    description: `Kivara Luxury Travel Booking\nReference: ${ref}\nClient: ${booking.clientName}\nDestination: ${location}`,
    location: location || "TBD",
    organizer: booking.clientEmail,
  };
}

/**
 * Generate an .ics file for a single booking.
 */
export function generateBookingICal(booking: Parameters<typeof bookingToICalEvent>[0]): string {
  return generateICal([bookingToICalEvent(booking)]);
}
