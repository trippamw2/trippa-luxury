import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────

/**
 * Minimal bookings-table double. Distinguishes the read chain
 * (select().eq().single()) from the write chain (update().eq()), because the
 * route depends on the write's error to decide whether to report success.
 */
function bookingsTable(row: unknown, opts: { updateError?: unknown; insertError?: unknown } = {}) {
  const state: { mode: "select" | "update" | "insert"; updateError: unknown; insertError: unknown } = {
    mode: "select",
    updateError: opts.updateError ?? null,
    insertError: opts.insertError ?? null,
  };
  let updated: Record<string, unknown> | null = null;
  let inserted: Record<string, unknown> | null = null;

  const api = {
    select() {
      state.mode = "select";
      return api;
    },
    update(values: Record<string, unknown>) {
      state.mode = "update";
      updated = values;
      return api;
    },
    insert(values: Record<string, unknown>) {
      state.mode = "insert";
      inserted = values;
      return Promise.resolve({ data: null, error: state.insertError });
    },
    eq() {
      return api;
    },
    single() {
      return Promise.resolve({ data: row, error: row ? null : { message: "not found" } });
    },
    then(resolve: (v: unknown) => void) {
      return Promise.resolve(
        state.mode === "update"
          ? { data: null, error: state.updateError }
          : { data: row, error: null }
      ).then(resolve);
    },
    get updated() {
      return updated;
    },
    get inserted() {
      return inserted;
    },
  };
  return api;
}

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  paymentReceiptEmail: (args: { clientName: string; amount: string; bookingRef: string }) => ({
    subject: `Receipt ${args.bookingRef}`,
    htmlContent: `<p>${args.amount}</p>`,
  }),
}));

const mockExecutePayment = vi.fn();
vi.mock("@/lib/paypal", () => ({
  PayPalClient: class {
    executePayment = mockExecutePayment;
  },
}));

import { GET } from "@/app/api/payment/paypal/execute/route";

const BOOKING_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const VICTIM_BOOKING_ID = "ffffffff-1111-2222-3333-444444444444";

const BOOKING = {
  id: BOOKING_ID,
  client_name: "Martin Kaponda",
  client_email: "martin@example.com",
  booking_reference: "KVR-2026-0001",
  total_amount: 5000,
  deposit_amount: 500,
  currency: "USD",
};
const BALANCE_DUE = 4500;

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/payment/paypal/execute");
  for (const [k, v] of Object.entries({
    paymentId: "PAYID-1",
    PayerID: "PAYER-1",
    bookingId: BOOKING_ID,
    token: "ORDER-TOKEN-1",
    type: "balance",
    ...params,
  })) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function locationOf(res: Response): string {
  return res.headers.get("location") || "";
}

/** A capture that legitimately settles `BOOKING_ID`'s balance. */
function goodCapture(over: Record<string, unknown> = {}) {
  return {
    id: "CAPTURE-1",
    status: "COMPLETED",
    currency: "USD",
    amount: BALANCE_DUE,
    bookingReference: BOOKING_ID,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue(bookingsTable(BOOKING));
  mockExecutePayment.mockResolvedValue(goodCapture());
  mockSendEmail.mockResolvedValue(undefined);
});

describe("GET /api/payment/paypal/execute — settling a real payment", () => {
  it("confirms the booking when the capture matches the amount, currency and booking", async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(307);
    expect(locationOf(res)).toContain("/payment/success");
    expect(locationOf(res)).toContain(`bookingId=${BOOKING_ID}`);

    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toMatchObject({
      status: "paid",
      payment_method: "paypal",
      balance_amount: 0,
    });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("records a deposit as a deposit, not as a completed booking", async () => {
    mockExecutePayment.mockResolvedValue(
      goodCapture({ amount: 500, bookingReference: BOOKING_ID })
    );

    const res = await GET(makeRequest({ type: "deposit" }));

    expect(locationOf(res)).toContain("/payment/success");
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toMatchObject({
      status: "deposit_paid",
      balance_amount: 4500,
    });
  });

  it("accepts a capture that differs by sub-cent rounding", async () => {
    mockExecutePayment.mockResolvedValue(
      goodCapture({ amount: BALANCE_DUE + 0.001, bookingReference: BOOKING_ID })
    );

    const res = await GET(makeRequest());
    expect(locationOf(res)).toContain("/payment/success");
  });
});

describe("GET /api/payment/paypal/execute — refusing unearned settlement", () => {
  it("refuses a token payment on an order raised for a different booking", async () => {
    // THE ATTACK: a cheap order, correctly captured, pointed at somebody
    // else's booking. The order was never created for this booking.
    mockExecutePayment.mockResolvedValue(
      goodCapture({ amount: 1, bookingReference: "some-other-booking-id" })
    );

    const res = await GET(makeRequest({ bookingId: VICTIM_BOOKING_ID }));

    expect(locationOf(res)).toContain("error=order_mismatch");
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toBeNull();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("refuses a short payment even when the order is for this booking", async () => {
    mockExecutePayment.mockResolvedValue(
      goodCapture({ amount: 1, bookingReference: BOOKING_ID })
    );

    const res = await GET(makeRequest());

    expect(locationOf(res)).toContain("error=amount_mismatch");
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toBeNull();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("refuses a capture whose amount cannot be read, rather than assuming zero", async () => {
    // PayPal returned no amount we could parse. Unknown is not "paid".
    mockExecutePayment.mockResolvedValue(
      goodCapture({ amount: Number.NaN, bookingReference: BOOKING_ID })
    );

    const res = await GET(makeRequest());

    expect(locationOf(res)).toContain("error=amount_unverifiable");
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toBeNull();
  });

  it("refuses a capture in a different currency", async () => {
    mockExecutePayment.mockResolvedValue(
      goodCapture({ currency: "EUR", bookingReference: BOOKING_ID })
    );

    const res = await GET(makeRequest());

    expect(locationOf(res)).toContain("error=currency_mismatch");
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toBeNull();
  });

  it("refuses a capture that carries no currency at all", async () => {
    // An absent currency is unknown, not a pass. The guard used to read
    // `if (capture.currency && ...)`, so an empty string skipped the check
    // entirely and the booking settled with the currency never verified.
    mockExecutePayment.mockResolvedValue(
      goodCapture({ currency: "", bookingReference: BOOKING_ID })
    );

    const res = await GET(makeRequest());

    expect(locationOf(res)).toContain("error=currency_unverifiable");
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toBeNull();
  });

  it("refuses a capture that PayPal did not complete", async () => {
    mockExecutePayment.mockResolvedValue(
      goodCapture({ status: "PENDING", bookingReference: BOOKING_ID })
    );

    const res = await GET(makeRequest());

    expect(locationOf(res)).toContain("error=payment_not_captured");
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toBeNull();
  });

  it("refuses an unknown payment type instead of defaulting it to a full payment", async () => {
    const res = await GET(makeRequest({ type: "everything-free" }));

    expect(locationOf(res)).toContain("error=invalid_payment_type");
    expect(mockExecutePayment).not.toHaveBeenCalled();
  });

  it("refuses to settle a booking it cannot price", async () => {
    mockFrom.mockReturnValue(bookingsTable({ ...BOOKING, total_amount: 0 }));

    const res = await GET(makeRequest());

    expect(locationOf(res)).toContain("error=booking_not_payable");
    expect(mockExecutePayment).not.toHaveBeenCalled();
  });

  it("redirects to cancel when the booking does not exist", async () => {
    mockFrom.mockReturnValue(bookingsTable(null));

    const res = await GET(makeRequest());

    expect(locationOf(res)).toContain("error=booking_not_found");
    expect(mockExecutePayment).not.toHaveBeenCalled();
  });

  it("refuses when required parameters are missing", async () => {
    const url = new URL("http://localhost/api/payment/paypal/execute");
    url.searchParams.set("bookingId", BOOKING_ID);
    const res = await GET(new NextRequest(url));

    expect(locationOf(res)).toContain("error=missing_params");
    expect(mockExecutePayment).not.toHaveBeenCalled();
  });
});

describe("GET /api/payment/paypal/execute — money taken but booking not settled", () => {
  it("does not report success when the booking update fails after capture", async () => {
    mockFrom.mockReturnValue(
      bookingsTable(BOOKING, { updateError: { message: "deadlock detected" } })
    );

    const res = await GET(makeRequest());

    expect(locationOf(res)).toContain("error=booking_update_failed");
    expect(locationOf(res)).not.toContain("/payment/success");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("keeps the receipt when the capture succeeds but email fails", async () => {
    mockSendEmail.mockRejectedValue(new Error("SMTP down"));

    const res = await GET(makeRequest());

    expect(locationOf(res)).toContain("/payment/success");
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toMatchObject({ status: "paid" });
  });

  it("does not settle when the PayPal capture call throws", async () => {
    mockExecutePayment.mockRejectedValue(new Error("PayPal 500"));

    const res = await GET(makeRequest());

    expect(locationOf(res)).toContain("error=capture_failed");
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toBeNull();
  });
});
