import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin-auth", () => {
  class AdminAuthError extends Error {
    constructor(
      message: string,
      public status: number = 401
    ) {
      super(message);
      this.name = "AdminAuthError";
    }
  }
  return { requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args), AdminAuthError };
});

const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  paymentReceiptEmail: (args: { clientName: string; amount: string; bookingRef: string }) => ({
    subject: `Receipt ${args.bookingRef}`,
    htmlContent: `<p>${args.amount}</p>`,
  }),
}));

/**
 * Supabase double. `.from(table)` returns a chainable tagged with its table so
 * the test can assert both which ledger tables received rows and what exact
 * values they got — the whole point of this route is that its inserts target
 * the real schema columns and actually carry a value.
 *
 * The write chain (update().eq()) resolves via the thenable; reads resolve via
 * single(); inserts resolve directly.
 */
const inserts: { table: string; values: Record<string, unknown> }[] = [];
const updates: { table: string; values: Record<string, unknown> }[] = [];
let bookingsRow: Record<string, unknown> | null = null;

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { POST } from "@/app/api/admin/bookings/[id]/confirm-payment/route";

// The mocked module's own AdminAuthError class — the route matches on
// `instanceof`, so the thrown error must be the exact class it checks.
import { AdminAuthError } from "@/lib/admin-auth";

const BOOKING_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const ADMIN_ID = "99999999-0000-1111-2222-333333333333";

const BOOKING = {
  id: BOOKING_ID,
  client_name: "Martin Kaponda",
  client_email: "martin@example.com",
  booking_reference: "KVR-2026-0001",
  total_amount: 5000,
  deposit_amount: 500,
  balance_amount: 4500,
  status: "provisional",
  currency: "USD",
  deposit_confirmed_at: null,
  internal_notes: null,
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/admin/bookings/${BOOKING_ID}/confirm-payment`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function params() {
  return { params: Promise.resolve({ id: BOOKING_ID }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  inserts.length = 0;
  updates.length = 0;
  bookingsRow = { ...BOOKING };
  mockRequireAdmin.mockResolvedValue({ profile: { id: ADMIN_ID } });
  mockSendEmail.mockResolvedValue(undefined);
  mockFrom.mockImplementation((table: string) => {
    const api = {
      table,
      mode: "select" as string,
      select() {
        this.mode = "select";
        return this;
      },
      update(values: Record<string, unknown>) {
        this.mode = "update";
        updates.push({ table: this.table, values });
        return this;
      },
      insert(values: Record<string, unknown>) {
        this.mode = "insert";
        inserts.push({ table: this.table, values });
        return Promise.resolve({ data: null, error: null });
      },
      eq() {
        return this;
      },
      single() {
        return Promise.resolve({
          data: bookingsRow,
          error: bookingsRow ? null : { message: "not found" },
        });
      },
      then(resolve: (v: unknown) => void) {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      },
    };
    return api;
  });
});

describe("POST /api/admin/bookings/[id]/confirm-payment — booking state", () => {
  it("records a deposit reference (-DEPOSIT) as a deposit, not a balance payment", async () => {
    const res = await POST(
      makeRequest({ paymentReference: "KVR-20260910-A1B2C3D4-DEPOSIT", amount: 500 }),
      params()
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ status: "deposit_paid", paidAmount: 500, balanceRemaining: 4500 });

    const bookingUpdate = updates.find((u) => u.table === "bookings");
    expect(bookingUpdate?.values).toMatchObject({
      status: "deposit_paid",
      payment_method: "wire_transfer",
      swift_confirmation_code: "KVR-20260910-A1B2C3D4-DEPOSIT",
      balance_amount: 4500,
    });

    // The exact regression this guards: a -DEPOSIT reference must not reach the
    // payments table as a balance payment (which used to mark the booking paid
    // and record the wrong transaction_type).
    const tx = inserts.find((i) => i.table === "transactions");
    expect(tx?.values).toMatchObject({
      booking_id: BOOKING_ID,
      transaction_type: "deposit",
      payment_method: "wire_transfer",
      payment_reference: "KVR-20260910-A1B2C3D4-DEPOSIT",
      amount: 500,
      currency: "USD",
    });
    const payment = inserts.find((i) => i.table === "payments");
    expect(payment?.values).toMatchObject({
      booking_id: BOOKING_ID,
      amount: 500,
      currency: "USD",
      payment_method: "wire_transfer",
      payment_type: "deposit",
      status: "completed",
      created_by: ADMIN_ID,
    });
  });

  it("still honours the legacy short -DEP suffix", async () => {
    const res = await POST(
      makeRequest({ paymentReference: "KVR-20240818-A1B2DE34-DEP", amount: 500 }),
      params()
    );

    expect((await res.json()).status).toBe("deposit_paid");
    const tx = inserts.find((i) => i.table === "transactions");
    expect(tx?.values).toMatchObject({ transaction_type: "deposit" });
  });

  it("records a full reference (-FULL) as a full payment", async () => {
    const res = await POST(
      makeRequest({ paymentReference: "KVR-20260910-A1B2C3D4-FULL", amount: 5000 }),
      params()
    );

    const json = await res.json();
    expect(json).toMatchObject({ status: "paid", paidAmount: 5000, balanceRemaining: 0 });
    const tx = inserts.find((i) => i.table === "transactions");
    expect(tx?.values).toMatchObject({ transaction_type: "full_payment", amount: 5000 });
    const payment = inserts.find((i) => i.table === "payments");
    expect(payment?.values).toMatchObject({ payment_type: "full", amount: 5000 });
  });

  it("records a balance reference (-BALANCE) as a balance payment", async () => {
    const res = await POST(
      makeRequest({ paymentReference: "KVR-20260910-A1B2C3D4-BALANCE", amount: 4500 }),
      params()
    );

    const json = await res.json();
    expect(json).toMatchObject({ status: "paid", paidAmount: 4500, balanceRemaining: 0 });
    const tx = inserts.find((i) => i.table === "transactions");
    expect(tx?.values).toMatchObject({ transaction_type: "balance", amount: 4500 });
  });
});

describe("POST /api/admin/bookings/[id]/confirm-payment — ledger and receipt", () => {
  it("marks receipt_sent on the ledger row only when the email actually sent", async () => {
    mockSendEmail.mockRejectedValue(new Error("SMTP down"));

    const res = await POST(
      makeRequest({ paymentReference: "KVR-20260910-A1B2C3D4-DEPOSIT", amount: 500 }),
      params()
    );

    expect(res.status).toBe(200);
    const tx = inserts.find((i) => i.table === "transactions");
    expect(tx?.values).toMatchObject({ receipt_sent: false });
  });

  it("writes both ledger tables even when the booking has no client email", async () => {
    bookingsRow = { ...BOOKING, client_email: null };

    const res = await POST(
      makeRequest({ paymentReference: "KVR-20260910-A1B2C3D4-DEPOSIT", amount: 500 }),
      params()
    );

    expect(res.status).toBe(200);
    expect(inserts.some((i) => i.table === "transactions")).toBe(true);
    expect(inserts.some((i) => i.table === "payments")).toBe(true);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("records the audit trail for both the booking and the transaction", async () => {
    await POST(
      makeRequest({ paymentReference: "KVR-20260910-A1B2C3D4-DEPOSIT", amount: 500 }),
      params()
    );

    const auditInserts = inserts.filter((i) => i.table === "audit_log");
    expect(auditInserts).toHaveLength(2);
    expect(auditInserts[0].values).toMatchObject({
      table_name: "bookings",
      action: "UPDATE",
      record_id: BOOKING_ID,
      performed_by: ADMIN_ID,
    });
    expect(auditInserts[1].values).toMatchObject({ table_name: "transactions", action: "CREATE" });
  });
});

describe("POST /api/admin/bookings/[id]/confirm-payment — refusals", () => {
  it("requires a payment reference and amount", async () => {
    const res = await POST(makeRequest({ paymentReference: "" }), params());
    expect(res.status).toBe(400);
    expect(inserts.length).toBe(0);
  });

  it("returns 404 when the booking does not exist", async () => {
    bookingsRow = null;
    const res = await POST(
      makeRequest({ paymentReference: "KVR-20260910-A1B2C3D4-DEPOSIT", amount: 500 }),
      params()
    );
    expect(res.status).toBe(404);
    expect(inserts.length).toBe(0);
  });

  it("bounces when the caller is not an authorised admin", async () => {
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Unauthorized", 401));

    const res = await POST(
      makeRequest({ paymentReference: "KVR-20260910-A1B2C3D4-DEPOSIT", amount: 500 }),
      params()
    );
    expect(res.status).toBe(401);
    expect(inserts.length).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});