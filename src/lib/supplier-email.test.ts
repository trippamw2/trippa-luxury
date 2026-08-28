import { describe, it, expect, vi } from "vitest";

// Mock the emailShell util so the templates can be tested in isolation
// without pulling in the (possibly env-dependent) email module internals.
vi.mock("@/lib/email", () => ({
  emailShell: (subjectLine: string, bodyHtml: string) =>
    `<shell>${subjectLine}::${bodyHtml}</shell>`,
}));

import {
  supplierBookingConfirmed,
  supplierBookingUpdated,
  supplierPaymentReceived,
} from "@/lib/supplier-email";

const base = {
  supplierName: "Chinzombo Camp",
  clientName: "Martinez Kaponda",
  bookingRef: "TRP-0011",
  destination: "South Luangwa",
};

describe("supplierBookingConfirmed", () => {
  it("emails a confirmation subject with the booking reference", () => {
    const { subject } = supplierBookingConfirmed(base);
    expect(subject).toContain("Booking Confirmed");
    expect(subject).toContain("TRP-0011");
  });

  it("includes supplier, guest, booking and destination details", () => {
    const { htmlContent } = supplierBookingConfirmed(base);
    expect(htmlContent).toContain("Chinzombo Camp");
    expect(htmlContent).toContain("Martinez Kaponda");
    expect(htmlContent).toContain("TRP-0011");
    expect(htmlContent).toContain("South Luangwa");
  });

  it("includes dates and special requests when provided", () => {
    const { htmlContent } = supplierBookingConfirmed({
      ...base,
      dates: "Aug 10 – Aug 17",
      notes: "Honeymoon suite requested",
    });
    expect(htmlContent).toContain("Aug 10 – Aug 17");
    expect(htmlContent).toContain("Honeymoon suite requested");
  });
});

describe("supplierBookingUpdated", () => {
  it("emails an update subject with the booking reference", () => {
    const { subject } = supplierBookingUpdated({
      ...base,
      changes: "Date changed",
    });
    expect(subject).toContain("Booking Updated");
    expect(subject).toContain("TRP-0011");
  });

  it("includes supplier, guest, booking and destination details", () => {
    const { htmlContent } = supplierBookingUpdated(base);
    expect(htmlContent).toContain("Chinzombo Camp");
    expect(htmlContent).toContain("Martinez Kaponda");
    expect(htmlContent).toContain("TRP-0011");
    expect(htmlContent).toContain("South Luangwa");
  });

  it("renders the change description when provided", () => {
    const { htmlContent } = supplierBookingUpdated({
      ...base,
      changes: "Status changed from provisional to confirmed",
    });
    expect(htmlContent).toContain("Status changed from provisional to confirmed");
  });

  it("omits the changes row when not provided", () => {
    const { htmlContent } = supplierBookingUpdated(base);
    expect(htmlContent).not.toContain("Status changed");
  });
});

describe("supplierPaymentReceived", () => {
  it("emails a payment received subject with the booking reference", () => {
    const { subject } = supplierPaymentReceived({
      ...base,
      amount: "$3,000",
    });
    expect(subject).toContain("Payment Received");
    expect(subject).toContain("TRP-0011");
  });

  it("includes the amount paid", () => {
    const { htmlContent } = supplierPaymentReceived({
      ...base,
      amount: "$3,000.00",
    });
    expect(htmlContent).toContain("$3,000.00");
  });

  it("includes the payment method when provided", () => {
    const { htmlContent } = supplierPaymentReceived({
      ...base,
      amount: "$3,000",
      paymentMethod: "Wire Transfer",
    });
    expect(htmlContent).toContain("Wire Transfer");
  });

  it("omits the method row when not provided", () => {
    const { htmlContent } = supplierPaymentReceived({
      ...base,
      amount: "$3,000",
    });
    expect(htmlContent).not.toContain("Wire Transfer");
  });
});
