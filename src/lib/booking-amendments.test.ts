import { describe, it, expect } from "vitest";
import { coerceAmendmentValue, hasAmendmentDrifted } from "./booking-amendments";

describe("coerceAmendmentValue", () => {
  it("parses amounts, tolerating separators", () => {
    expect(coerceAmendmentValue("total_amount", "12,500.50")).toEqual({ ok: true, value: 12500.5 });
    expect(coerceAmendmentValue("deposit_amount", " 3000 ")).toEqual({ ok: true, value: 3000 });
  });

  it("rejects negative or non-numeric amounts", () => {
    expect(coerceAmendmentValue("total_amount", "-5").ok).toBe(false);
    expect(coerceAmendmentValue("total_amount", "abc").ok).toBe(false);
  });

  it("requires whole numbers for guest counts", () => {
    expect(coerceAmendmentValue("guests_count", "2")).toEqual({ ok: true, value: 2 });
    expect(coerceAmendmentValue("guests_count", "2.5").ok).toBe(false);
  });

  it("accepts ISO dates and rejects anything else", () => {
    expect(coerceAmendmentValue("start_date", "2027-03-04")).toEqual({ ok: true, value: "2027-03-04" });
    expect(coerceAmendmentValue("start_date", "04/03/2027").ok).toBe(false);
    expect(coerceAmendmentValue("start_date", "2027-13-40").ok).toBe(false);
  });

  it("only accepts known booking statuses", () => {
    expect(coerceAmendmentValue("status", "confirmed")).toEqual({ ok: true, value: "confirmed" });
    expect(coerceAmendmentValue("status", "pending-payment").ok).toBe(false);
  });

  it("passes through text fields", () => {
    expect(coerceAmendmentValue("client_email", " guest@example.com ")).toEqual({
      ok: true,
      value: "guest@example.com",
    });
  });

  it("allows clearing optional fields but not required ones", () => {
    expect(coerceAmendmentValue("internal_notes", "")).toEqual({ ok: true, value: null });
    expect(coerceAmendmentValue("client_name", "").ok).toBe(false);
    expect(coerceAmendmentValue("status", null).ok).toBe(false);
  });

  it("refuses fields outside the allowlist", () => {
    expect(coerceAmendmentValue("id", "abc").ok).toBe(false);
    expect(coerceAmendmentValue("created_at", "2027-01-01").ok).toBe(false);
  });
});

describe("hasAmendmentDrifted", () => {
  it("is false when nothing was recorded or the values match", () => {
    expect(hasAmendmentDrifted(5000, null)).toBe(false);
    expect(hasAmendmentDrifted(5000, "5000")).toBe(false);
    expect(hasAmendmentDrifted("confirmed", " confirmed ")).toBe(false);
    expect(hasAmendmentDrifted("2027-01-01", "2027-01-01")).toBe(false);
  });

  it("is true when the booking has moved on", () => {
    expect(hasAmendmentDrifted(6000, "5000")).toBe(true);
    expect(hasAmendmentDrifted(null, "5000")).toBe(true);
    expect(hasAmendmentDrifted("cancelled", "confirmed")).toBe(true);
  });
});
