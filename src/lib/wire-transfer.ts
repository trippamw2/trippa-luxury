// ─── Kivara Wire Transfer Module ───────────────────────────────────────
// Wire transfer (SWIFT/IBAN) payment flow: reference generation,
// bank details extraction, and instruction generation.

/** Describes a payment reference tied to a specific booking and payment type. */
export interface PaymentReference {
  /** Unique payment reference string, e.g. "KVR-20240818-A1B2DE34-DEP". */
  reference: string;
  /** The booking UUID this payment applies to. */
  bookingId: string;
  /** The type of payment this reference covers. */
  type: "deposit" | "balance" | "full";
  /** ISO timestamp when the reference was generated. */
  createdAt: string;
}

/**
 * Bank account details for receiving wire transfers.
 * Stored in `platform_settings` as individual key-value pairs.
 */
export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  routingNumber: string;
  sortCode: string;
  currency: string;
  country: string;
}

/** Human-readable wire transfer instructions for the guest. */
export interface WireTransferInstructions {
  bankDetails: BankDetails;
  amount: number;
  currency: string;
  reference: string;
  instructions: string;
  deadline: string;
}

/**
 * Generate a unique payment reference for a booking.
 *
 * Format: `KVR-YYYYMMDD-{first8ofUUID}-{TYPE}`
 *
 * @param type - The payment type ("deposit", "balance", or "full")
 * @param bookingId - The booking UUID (at least 8 characters)
 * @returns A payment reference string
 *
 * @example generatePaymentReference("deposit", "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
 * // "KVR-20240818-A1B2C3D4-DEP"
 */
export function generatePaymentReference(
  type: "deposit" | "balance" | "full",
  bookingId: string
): PaymentReference {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  // Take first 8 hex chars from the UUID, uppercased
  const shortId = bookingId.replace(/-/g, "").slice(0, 8).toUpperCase();

  const typeSuffix = type.toUpperCase() as Uppercase<typeof type>;
  const reference = `KVR-${dateStr}-${shortId}-${typeSuffix}`;

  return {
    reference,
    bookingId,
    type,
    createdAt: now.toISOString(),
  };
}

/**
 * Extract bank details from platform_settings rows.
 *
 * Expected settings keys:
 * - `bank_name`, `bank_account_name`, `bank_account_number`,
 * - `bank_iban`, `bank_swift_code`, `bank_routing_number`,
 * - `bank_sort_code`, `bank_currency`, `bank_country`
 *
 * @param settingsMap - A record of setting key→value pairs
 * @returns BankDetails object with all fields populated (empty strings for missing values)
 */
export function getBankDetailsFromSettings(
  settingsMap: Record<string, string>
): BankDetails {
  return {
    bankName: settingsMap.bank_name || "",
    accountName: settingsMap.bank_account_name || "",
    accountNumber: settingsMap.bank_account_number || "",
    iban: settingsMap.bank_iban || "",
    swiftCode: settingsMap.bank_swift_code || "",
    routingNumber: settingsMap.bank_routing_number || "",
    sortCode: settingsMap.bank_sort_code || "",
    currency: settingsMap.bank_currency || "USD",
    country: settingsMap.bank_country || "",
  };
}

/**
 * Format a bank details object into a human-readable HTML block
 * suitable for embedding in emails and documents.
 */
function formatBankDetailsHtml(details: BankDetails): string {
  const rows: string[] = [];

  rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;width:160px;">Bank Name</td><td style="padding:8px 0;font-size:14px;font-weight:600;border-bottom:1px solid #EDE5DA;">${details.bankName}</td></tr>`);
  rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Account Name</td><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #EDE5DA;">${details.accountName}</td></tr>`);
  rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Account Number</td><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #EDE5DA;letter-spacing:1px;">${details.accountNumber}</td></tr>`);

  if (details.iban) {
    rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">IBAN</td><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #EDE5DA;letter-spacing:1px;">${details.iban}</td></tr>`);
  }
  if (details.swiftCode) {
    rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">SWIFT / BIC</td><td style="padding:8px 0;font-size:14px;font-weight:600;border-bottom:1px solid #EDE5DA;letter-spacing:1px;">${details.swiftCode}</td></tr>`);
  }
  if (details.routingNumber) {
    rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Routing Number</td><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #EDE5DA;">${details.routingNumber}</td></tr>`);
  }
  if (details.sortCode) {
    rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Sort Code</td><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #EDE5DA;">${details.sortCode}</td></tr>`);
  }
  if (details.country) {
    rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Country</td><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #EDE5DA;">${details.country}</td></tr>`);
  }

  return `<table style="width:100%;margin-bottom:24px;">${rows.join("")}</table>`;
}

/**
 * Generate wire transfer instructions with bank details and formatting.
 *
 * @param params - Payment details
 * @returns WireTransferInstructions with formatted HTML instructions
 */
export function generateWireTransferInstructions(params: {
  bankDetails: BankDetails;
  amount: number;
  currency: string;
  reference: string;
  guestName: string;
  bookingRef: string;
}): WireTransferInstructions {
  const { bankDetails, amount, currency, reference, guestName, bookingRef } = params;

  // Deadline = 14 days from now
  const deadlineDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const deadline = deadlineDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const bankDetailsHtml = formatBankDetailsHtml(bankDetails);

  const instructions = `
    <div style="margin-bottom:24px;">
      <h3 style="font-size:14px;color:#1A1A1A;margin-bottom:12px;">Wire Transfer Details</h3>
      <p style="font-size:13px;color:#4A4A4A;line-height:1.7;margin-bottom:16px;">
        Dear ${guestName}, to complete your payment for booking <strong>${bookingRef}</strong>,
        please arrange a wire transfer using the details below. Kindly ensure the payment
        reference is included in the transfer description so we can match it to your booking.
      </p>

      <div style="background:#F5F0EB;padding:20px;margin-bottom:16px;">
        <p style="font-size:11px;color:#8B7D6B;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Amount Due</p>
        <p style="font-size:28px;font-weight:700;color:#C9A96E;margin:0;">${currency} ${amount.toLocaleString()}</p>
        <p style="font-size:11px;color:#8B7D6B;margin-top:4px;">Payment Reference: <strong style="color:#1A1A1A;letter-spacing:1px;">${reference}</strong></p>
      </div>

      ${bankDetailsHtml}

      <div style="background:#F5F0EB;padding:16px;margin-top:16px;">
        <p style="font-size:11px;color:#8B7D6B;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Important</p>
        <ul style="font-size:12px;color:#4A4A4A;line-height:1.8;padding-left:16px;margin:0;">
          <li>Include payment reference <strong>${reference}</strong> in the transfer description</li>
          <li>Ensure the exact amount of <strong>${currency} ${amount.toLocaleString()}</strong> is transferred</li>
          <li>Wire transfers typically take 2–5 business days to process</li>
          <li>Please complete payment by <strong>${deadline}</strong></li>
        </ul>
      </div>
    </div>
  `;

  return {
    bankDetails,
    amount,
    currency,
    reference,
    instructions,
    deadline,
  };
}

/**
 * Generate a plain-text version of bank details (for email fallback / SMS).
 */
export function formatBankDetailsPlainText(details: BankDetails): string {
  const lines: string[] = [];
  lines.push(`Bank Name: ${details.bankName}`);
  lines.push(`Account Name: ${details.accountName}`);
  lines.push(`Account Number: ${details.accountNumber}`);
  if (details.iban) lines.push(`IBAN: ${details.iban}`);
  if (details.swiftCode) lines.push(`SWIFT/BIC: ${details.swiftCode}`);
  if (details.routingNumber) lines.push(`Routing Number: ${details.routingNumber}`);
  if (details.sortCode) lines.push(`Sort Code: ${details.sortCode}`);
  if (details.country) lines.push(`Country: ${details.country}`);
  return lines.join("\n");
}
