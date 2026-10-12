// ─── booking-payload tests ───────────────────────────────────────────────
// The regression this suite guards: the download route used to hand flat query
// params to generators that expect nested typed objects, so every booking
// document threw. Each test builds the payload from a booking row and runs the
// REAL generator over it — if a builder forgets a field the generator dereferences,
// these tests throw exactly where production did.

import { describe, it, expect } from "vitest";
import {
  buildDocumentData,
  isBookingDocumentType,
  type BookingRow,
  type SavedJourneyRow,
} from "./booking-payload";
import { generateInvoiceDocument } from "./invoice";
import { generateReceiptDocument } from "./receipt";
import { generateItineraryDocument } from "./itinerary";
import { generateTravelBrief } from "./travel-brief";
import { generatePaymentReminderDocument } from "./payment-reminder";
import { generateWelcomeDocument } from "./welcome";
import { generateThankYouDocument } from "./thank-you";

const NOW = new Date("2026-01-15T09:00:00.000Z");

const booking: BookingRow = {
  id: "11111111-2222-3333-4444-555555555555",
  bookingReference: "KVR-2026-A1B2",
  clientName: "Ada Lovelace",
  clientEmail: "ada@example.com",
  destination: "south-luangwa",
  startDate: "2026-06-01",
  endDate: "2026-06-05",
  guestsCount: 2,
  totalAmount: 12000,
  depositAmount: 3000,
  balanceAmount: 9000,
  balanceDueDate: "2026-05-01",
  currency: "USD",
  depositMethod: "Wire Transfer",
};

const journey: SavedJourneyRow = {
  id: "j-1",
  title: "Romantic Zambia",
  subtitle: "A love story across the bush",
  guestName: "Ada Lovelace",
  guestEmail: "ada@example.com",
  isCouple: true,
  destinations: ["South Luangwa", "Victoria Falls"],
  duration: 4,
  itinerary: [
    {
      day: 1,
      title: "Arrival in the Bush",
      location: "South Luangwa",
      accommodation: "Kaya Mawa",
      meals: ["Dinner"],
      activities: [
        { title: "Sunset game drive", description: "Leopards at dusk", duration: "3h", included: true, type: "safari" },
      ],
      transfers: [{ from: "Mfuwe Airport", to: "Kaya Mawa", mode: "road", duration: "1h", cost: 120 }],
      highlights: ["Leopard sighting"],
    },
  ],
  pricing: {
    accommodation: [{ label: "Kaya Mawa", nights: 4, ratePerNight: 800, ratePerNightPPPN: 400, subtotal: 3200 }],
    activities: [{ label: "Sunset game drive", cost: 200 }],
    transfers: [{ label: "Airport transfer", cost: 120 }],
    subtotal: 3520,
    taxes: 0,
    total: 3520,
    currency: "USD",
  },
  highlights: ["Private plunge pool"],
  includedExtras: ["Champagne on arrival"],
};

describe("isBookingDocumentType", () => {
  it("recognises the booking document types and rejects the rest", () => {
    expect(isBookingDocumentType("invoice")).toBe(true);
    expect(isBookingDocumentType("itinerary")).toBe(true);
    expect(isBookingDocumentType("quote")).toBe(false);
    expect(isBookingDocumentType("nope")).toBe(false);
  });
});

describe("buildDocumentData → real generators", () => {
  it("builds an invoice that the invoice generator renders without throwing", () => {
    const data = buildDocumentData("invoice", booking, { now: NOW });
    const html = generateInvoiceDocument(data as unknown as Parameters<typeof generateInvoiceDocument>[0]);
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("INV-KVR-2026-A1B2");
    expect(html).toContain("12,000");
  });

  it("builds a receipt from the deposit paid", () => {
    const data = buildDocumentData("receipt", booking, { now: NOW });
    const html = generateReceiptDocument(data as unknown as Parameters<typeof generateReceiptDocument>[0]);
    expect(html).toContain("Payment Received");
    expect(html).toContain("RCP-KVR-2026-A1B2");
    expect(html).toContain("3,000");
  });

  it("builds an itinerary even when the booking has NO saved journey (the original 500)", () => {
    const data = buildDocumentData("itinerary", booking, { now: NOW });
    const html = generateItineraryDocument(data as unknown as Parameters<typeof generateItineraryDocument>[0]);
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("South Luangwa");
  });

  it("builds a rich itinerary from the saved journey the quote flow attached", () => {
    const data = buildDocumentData("itinerary", booking, { journey, now: NOW });
    const html = generateItineraryDocument(data as unknown as Parameters<typeof generateItineraryDocument>[0]);
    expect(html).toContain("Romantic Zambia");
    expect(html).toContain("Arrival in the Bush");
    expect(html).toContain("Sunset game drive");
    expect(html).toContain("Champagne on arrival");
  });

  it("builds a travel brief with packing tips", () => {
    const data = buildDocumentData("travel-brief", booking, { now: NOW });
    const html = generateTravelBrief(data as unknown as Parameters<typeof generateTravelBrief>[0]);
    expect(html).toContain("Pre-Travel Brief");
    expect(html).toContain("sunscreen");
  });

  it("builds a payment reminder for the outstanding balance", () => {
    const data = buildDocumentData("payment-reminder", booking, { now: NOW });
    const html = generatePaymentReminderDocument(data as unknown as Parameters<typeof generatePaymentReminderDocument>[0]);
    expect(html).toContain("Payment Reminder");
    expect(html).toContain("9,000");
    expect(html).toContain("KVR-2026-A1B2");
  });

  it("formats welcome and thank-you from the booking identity", () => {
    const welcome = buildDocumentData("welcome", booking, { now: NOW });
    const welcomeHtml = generateWelcomeDocument(
      welcome.clientName as string,
      welcome.bookingRef as string,
      welcome.destination as string
    );
    expect(welcomeHtml).toContain("Ada Lovelace");

    const thanks = buildDocumentData("thank-you", booking, { now: NOW });
    const thanksHtml = generateThankYouDocument(
      thanks.clientName as string,
      thanks.bookingRef as string,
      thanks.destination as string
    );
    expect(thanksHtml).toContain("Ada Lovelace");
  });

  it("survives a booking row with nulls everywhere", () => {
    const bare: BookingRow = { id: "99999999-0000-0000-0000-000000000000" };
    for (const type of ["invoice", "receipt", "itinerary", "travel-brief", "payment-reminder"] as const) {
      const data = buildDocumentData(type, bare, { now: NOW });
      expect(typeof data).toBe("object");
    }
  });
});
