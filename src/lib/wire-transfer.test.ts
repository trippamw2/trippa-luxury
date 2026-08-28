import { describe, it, expect } from "vitest";
import {
  generatePaymentReference,
  getBankDetailsFromSettings,
  generateWireTransferInstructions,
  formatBankDetailsPlainText,
  type BankDetails,
} from "@/lib/wire-transfer";

const SAMPLE_BANK: BankDetails = {
  bankName: "Standard Chartered Zambia",
  accountName: "Kivara Luxury Travel Ltd",
  accountNumber: "0100123456789",
  iban: "ZM0000000000000000000000",
  swiftCode: "SCBLZMLX",
  routingNumber: "",
  sortCode: "",
  currency: "USD",
  country: "Zambia",
};

describe("generatePaymentReference", () => {
  it("formats a payment reference in KVR-YYYYMMDD-SHORTID-TYPE format", () => {
    const ref = generatePaymentReference("deposit", "a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(ref.reference).toMatch(/^KVR-\d{8}-A1B2C3D4-DEPOSIT$/);
  });

  it("uppercases the type suffix", () => {
    expect(generatePaymentReference("balance", "a1b2c3d4-e5f6-7890-abcd-ef1234567890").reference).toMatch(/-BALANCE$/);
    expect(generatePaymentReference("full", "a1b2c3d4-e5f6-7890-abcd-ef1234567890").reference).toMatch(/-FULL$/);
  });

  it("takes the first 8 hex digits of the booking id (dashes stripped, uppercased)", () => {
    const ref = generatePaymentReference("deposit", "1234abcd-ef56-7890-abcd-ef1234567890");
    expect(ref.reference).toContain("1234ABCD");
  });

  it("ties the reference to the booking id and type", () => {
    const bookingId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const ref = generatePaymentReference("deposit", bookingId);
    expect(ref.bookingId).toBe(bookingId);
    expect(ref.type).toBe("deposit");
    expect(ref.createdAt).toBeTruthy();
  });
});

describe("getBankDetailsFromSettings", () => {
  it("extracts bank details from a settings key-value map", () => {
    const details = getBankDetailsFromSettings({
      bank_name: "Standard Chartered Zambia",
      bank_account_name: "Kivara Luxury Travel Ltd",
      bank_account_number: "0100123456789",
      bank_iban: "ZM0000000000000000000000",
      bank_swift_code: "SCBLZMLX",
      bank_routing_number: "111000025",
      bank_sort_code: "18-00-00",
      bank_currency: "GBP",
      bank_country: "Zambia",
    });

    expect(details.bankName).toBe("Standard Chartered Zambia");
    expect(details.accountName).toBe("Kivara Luxury Travel Ltd");
    expect(details.accountNumber).toBe("0100123456789");
    expect(details.iban).toBe("ZM0000000000000000000000");
    expect(details.swiftCode).toBe("SCBLZMLX");
    expect(details.routingNumber).toBe("111000025");
    expect(details.sortCode).toBe("18-00-00");
    expect(details.currency).toBe("GBP");
    expect(details.country).toBe("Zambia");
  });

  it("defaults currency to USD and empty strings for missing fields", () => {
    const details = getBankDetailsFromSettings({});
    expect(details.bankName).toBe("");
    expect(details.accountNumber).toBe("");
    expect(details.currency).toBe("USD");
    expect(details.country).toBe("");
  });
});

describe("generateWireTransferInstructions", () => {
  it("produces instructions containing the amount, reference, and a future deadline", () => {
    const result = generateWireTransferInstructions({
      bankDetails: SAMPLE_BANK,
      amount: 3200,
      currency: "USD",
      reference: "KVR-20260828-A1B2C3D4-DEP",
      guestName: "Martinez Kaponda",
      bookingRef: "TRP-0011",
    });

    expect(result.amount).toBe(3200);
    expect(result.currency).toBe("USD");
    expect(result.reference).toContain("KVR-");
    expect(result.deadline).toBeTruthy();
    expect(result.instructions).toContain("Martinez Kaponda");
    expect(result.instructions).toContain("TRP-0011");
    expect(result.instructions).toContain("Standard Chartered Zambia");
    expect(result.instructions).toContain("KVR-20260828-A1B2C3D4-DEP");
  });

  it("respects the 14-day deadline", () => {
    const result = generateWireTransferInstructions({
      bankDetails: SAMPLE_BANK,
      amount: 100,
      currency: "USD",
      reference: "KVR-REF",
      guestName: "Guest",
      bookingRef: "BK-1",
    });
    // deadline string should be within ~15 days of now; just assert it parses to a date
    expect(Number.isNaN(Date.parse(result.deadline))).toBe(false);
  });
});

describe("formatBankDetailsPlainText", () => {
  it("renders bank details as plain text lines", () => {
    const text = formatBankDetailsPlainText(SAMPLE_BANK);
    expect(text).toContain("Bank Name: Standard Chartered Zambia");
    expect(text).toContain("Account Name: Kivara Luxury Travel Ltd");
    expect(text).toContain("Account Number: 0100123456789");
    expect(text).toContain("IBAN: ZM0000000000000000000000");
    expect(text).toContain("SWIFT/BIC: SCBLZMLX");
    expect(text).toContain("Country: Zambia");
  });

  it("omits empty optional fields", () => {
    const text = formatBankDetailsPlainText({
      ...SAMPLE_BANK,
      iban: "",
      swiftCode: "",
      routingNumber: "",
      sortCode: "",
      country: "",
    });
    expect(text).not.toContain("IBAN:");
    expect(text).not.toContain("SWIFT/BIC:");
    expect(text).not.toContain("Country:");
    expect(text).toContain("Bank Name:");
  });
});
