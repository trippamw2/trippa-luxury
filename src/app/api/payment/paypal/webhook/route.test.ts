import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/**
 * Minimal bookings/payments double for the webhook route. The route reads the
 * booking via select().eq().single(), settles via update().eq() (awaited but
 * not destructured), and writes the ledger via insert() (destructured). The
 * double records those writes so the tests can assert what actually happened.
 */
function webhookTable(
  booking: Record<string, unknown> | null,
  opts: { insertError?: unknown } = {}
) {
  const state: { mode: "select" | "update" | "insert"; insertError: unknown } = {
    mode: "select",
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
      return Promise.resolve({
        data: booking,
        error: booking ? null : { message: "not found" },
      });
    },
    then(resolve: (v: unknown) => void) {
      return Promise.resolve(
        state.mode === "update" || state.mode === "insert"
          ? { data: null, error: null }
          : { data: booking, error: null }
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

const mockVerifySignature = vi.fn();
const mockReadHeaders = vi.fn();
vi.mock("@/lib/payments/paypal-signature", () => ({
  readPayPalHeaders: (...args: unknown[]) => mockReadHeaders(...args),
  verifyPayPalSignature: (...args: unknown[]) => mockVerifySignature(...args),
}));

import { POST } from "@/app/api/payment/paypal/webhook/route";

const BOOKING_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const BOOKING = {
  id: BOOKING_ID,
  client_name: "Martin Kaponda",
  client_email: "martin@example.com",
  booking_reference: "KVR-2026-0001",
  total_amount: 5000,
  deposit_amount: 500,
  balance_amount: 4500,
  currency: "USD",
  status: "provisional",
  swift_confirmation_code: "KVR-20260910-AB12CD34-DEPOSIT",
};

function makeRequest(body: string): NextRequest {
  return new NextRequest("http://localhost/api/payment/paypal/webhook", {
    method: "POST",
    body,
  });
}

function completedEvent(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: "WH-1",
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    create_time: "2026-09-10T10:00:00Z",
    resource: {
      id: "CAPTURE-1",
      custom_id: BOOKING_ID,
      amount: { currency_code: "USD", value: "500.00" },
    },
    ...over,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue(webhookTable(BOOKING));
  mockReadHeaders.mockReturnValue({});
  mockVerifySignature.mockResolvedValue({ verified: true });
  mockSendEmail.mockResolvedValue(undefined);
});

describe("POST /api/payment/paypal/webhook — settling real payments", () => {
  it("settles a deposit when the guest never returns from PayPal", async () => {
    const res = await POST(makeRequest(completedEvent()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toMatchObject({
      status: "deposit_paid",
      payment_method: "paypal",
      balance_amount: 4500,
    });
    expect(table.inserted).toMatchObject({
      booking_id: BOOKING_ID,
      amount: 500,
      currency: "USD",
      payment_method: "paypal",
      payment_type: "deposit",
      paypal_transaction_id: "CAPTURE-1",
      status: "completed",
    });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("settles a balance capture to paid", async () => {
    const res = await POST(
      makeRequest(
        completedEvent({
          resource: {
            id: "CAPTURE-2",
            custom_id: BOOKING_ID,
            amount: { currency_code: "USD", value: "4500.00" },
          },
        })
      )
    );

    expect(res.status).toBe(200);
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toMatchObject({
      status: "paid",
      payment_method: "paypal",
      balance_amount: 0,
    });
    expect(table.inserted).toMatchObject({
      payment_type: "balance",
      paypal_transaction_id: "CAPTURE-2",
    });
  });

  it("settles a full capture to paid", async () => {
    const res = await POST(
      makeRequest(
        completedEvent({
          resource: {
            id: "CAPTURE-3",
            custom_id: BOOKING_ID,
            amount: { currency_code: "USD", value: "5000.00" },
          },
        })
      )
    );

    expect(res.status).toBe(200);
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toMatchObject({ status: "paid", balance_amount: 0 });
    expect(table.inserted).toMatchObject({
      payment_type: "full",
      paypal_transaction_id: "CAPTURE-3",
    });
  });
});

describe("POST /api/payment/paypal/webhook — refusing to clobber bookings", () => {
  it("never marks a booking paid when the capture matches no payable amount", async () => {
    // THE REGRESSION: the old webhook force-marked any capture with a
    // matching booking as paid and zeroed the balance, so a $42 capture
    // (or a webhook retry) could destroy a deposit-only booking's state.
    const res = await POST(
      makeRequest(
        completedEvent({
          resource: {
            id: "CAPTURE-4",
            custom_id: BOOKING_ID,
            amount: { currency_code: "USD", value: "42.00" },
          },
        })
      )
    );

    expect(res.status).toBe(200);
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toBeNull();
    expect(table.inserted).toBeNull();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not regress an already deposit-paid booking on a duplicate deposit capture", async () => {
    mockFrom.mockReturnValue(
      webhookTable({ ...BOOKING, status: "deposit_paid" })
    );

    const res = await POST(makeRequest(completedEvent()));

    expect(res.status).toBe(200);
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toBeNull();
    expect(mockSendEmail).not.toHaveBeenCalled();
    // The ledger still records the capture id so reconciliation sees it.
    expect(table.inserted).toMatchObject({ paypal_transaction_id: "CAPTURE-1" });
  });

  it("does not write a second receipt when the booking was settled by the execute route first", async () => {
    // The booking is already past the state this capture would settle.
    mockFrom.mockReturnValue(webhookTable({ ...BOOKING, status: "paid" }));

    const res = await POST(makeRequest(completedEvent()));

    expect(res.status).toBe(200);
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toBeNull();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not touch anything when the capture carries no readable amount", async () => {
    const res = await POST(
      makeRequest(
        completedEvent({
          resource: { id: "CAPTURE-5", custom_id: BOOKING_ID },
        })
      )
    );

    expect(res.status).toBe(200);
    const table = mockFrom.mock.results[0].value;
    expect(table.updated).toBeNull();
    expect(table.inserted).toBeNull();
  });
});

describe("POST /api/payment/paypal/webhook — races and failures", () => {
  it("tolerates the execute route having already written the payments row (23505)", async () => {
    mockFrom.mockReturnValue(
      webhookTable(BOOKING, { insertError: { code: "23505", message: "duplicate key" } })
    );

    const res = await POST(makeRequest(completedEvent()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  it("rejects a webhook whose signature does not verify", async () => {
    mockVerifySignature.mockResolvedValue({
      verified: false,
      reason: "cert",
      detail: "untrusted certificate url",
    });

    const res = await POST(makeRequest(completedEvent()));

    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("acknowledges an event without a booking id without touching the database", async () => {
    const res = await POST(
      makeRequest(
        completedEvent({
          resource: { id: "CAPTURE-6", amount: { currency_code: "USD", value: "1.00" } },
        })
      )
    );

    expect(res.status).toBe(200);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("acknowledges a capture for a booking that no longer exists", async () => {
    mockFrom.mockReturnValue(webhookTable(null));

    const res = await POST(makeRequest(completedEvent()));

    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("responds 400 to a body that is not JSON", async () => {
    mockVerifySignature.mockResolvedValue({ verified: true });

    const res = await POST(makeRequest("this is not json"));

    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});