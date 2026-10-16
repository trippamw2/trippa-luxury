import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

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
  newBookingNotification: vi.fn(),
  paymentReceiptEmail: (args: { clientName: string; amount: string; bookingRef: string }) => ({
    subject: `Receipt ${args.bookingRef}`,
    htmlContent: `<p>${args.amount}</p>`,
  }),
}));

vi.mock("@/lib/supplier-email", () => ({
  supplierBookingConfirmed: vi.fn(),
  supplierBookingUpdated: vi.fn(),
  supplierPaymentReceived: vi.fn(),
}));

const mockHandleUpdate = vi.fn();
vi.mock("@/lib/api-helpers", () => ({
  handleGetOne: vi.fn(),
  handleUpdate: (...args: unknown[]) => mockHandleUpdate(...args),
  handleDelete: vi.fn(),
  mapKeysToCamel: (obj: unknown) => obj,
}));

/**
 * Supabase double. `.from(table)` returns a chainable that resolves reads via
 * single() and write chains via the thenable, so the guard's status fetch and
 * the post-update email lookups both work.
 */
let currentBooking: Record<string, unknown> | null = null;
let mockItineraryItems: Record<string, unknown>[] = [];
let mockSuppliers: Record<string, unknown>[] = [];

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { PUT } from "@/app/api/admin/bookings/[id]/route";

const BOOKING_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/admin/bookings/${BOOKING_ID}`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function params() {
  return { params: Promise.resolve({ id: BOOKING_ID }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  currentBooking = {
    id: BOOKING_ID,
    status: "provisional",
    payment_method: null,
    swift_confirmation_code: null,
    deposit_method: null,
  };
  mockItineraryItems = [];
  mockSuppliers = [];
  mockRequireAdmin.mockResolvedValue({ profile: { id: "admin-1" } });
  mockSendEmail.mockResolvedValue(undefined);
  mockHandleUpdate.mockResolvedValue(
    NextResponse.json({ id: BOOKING_ID, status: "paid" })
  );
  mockFrom.mockImplementation((table: string) => {
    const api = {
      table,
      mode: "select" as string,
      select() {
        this.mode = "select";
        return this;
      },
      update() {
        this.mode = "update";
        return this;
      },
      insert() {
        return Promise.resolve({ data: null, error: null });
      },
      eq() {
        return this;
      },
      not() {
        return this;
      },
      in() {
        return this;
      },
      single() {
        return Promise.resolve({
          data: currentBooking,
          error: currentBooking ? null : { message: "not found" },
        });
      },
      then(resolve: (v: unknown) => void) {
        // Awaited, non-single reads resolve per table: the journey's supplier
        // items feed the compliance gate, the suppliers read feeds its verdict,
        // and everything else (booking_suppliers lookup) resolves empty.
        if (table === "itinerary_items") {
          return Promise.resolve({ data: mockItineraryItems, error: null }).then(resolve);
        }
        if (table === "suppliers") {
          return Promise.resolve({ data: mockSuppliers, error: null }).then(resolve);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve);
      },
    };
    return api;
  });
});

describe("PUT /api/admin/bookings/[id] — wire-transfer ledger guard", () => {
  it("refuses to mark a wire-transfer booking paid via the generic editor", async () => {
    currentBooking = {
      id: BOOKING_ID,
      status: "deposit_paid",
      payment_method: "wire_transfer",
      swift_confirmation_code: "KVR-20260910-A1B2C3D4-DEPOSIT",
      deposit_method: null,
    };

    const res = await PUT(
      makeRequest({ status: "paid", client_name: "Martin Kaponda" }),
      params()
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/Confirm Payment Received/);
    expect(mockHandleUpdate).not.toHaveBeenCalled();
  });

  it("refuses to mark a booking deposit-paid when a swift code is set on it", async () => {
    currentBooking = {
      id: BOOKING_ID,
      status: "provisional",
      payment_method: "wire_transfer",
      swift_confirmation_code: "KVR-20260910-A1B2C3D4-DEPOSIT",
      deposit_method: null,
    };

    const res = await PUT(makeRequest({ status: "deposit_paid" }), params());

    expect(res.status).toBe(409);
    expect(mockHandleUpdate).not.toHaveBeenCalled();
  });

  it("refuses when the payload itself carries a swift code and a money status", async () => {
    // No wire evidence on the stored booking — the operator is adding it now
    currentBooking = {
      id: BOOKING_ID,
      status: "provisional",
      payment_method: null,
      swift_confirmation_code: null,
      deposit_method: null,
    };

    const res = await PUT(
      makeRequest({
        status: "paid",
        swift_confirmation_code: "KVR-20260910-A1B2C3D4-FULL",
      }),
      params()
    );

    expect(res.status).toBe(409);
    expect(mockHandleUpdate).not.toHaveBeenCalled();
  });

  it("leaves non-wire status changes alone", async () => {
    currentBooking = {
      id: BOOKING_ID,
      status: "provisional",
      payment_method: "paypal",
      swift_confirmation_code: null,
      deposit_method: null,
    };

    const res = await PUT(makeRequest({ status: "paid" }), params());

    expect(res.status).toBe(200);
    expect(mockHandleUpdate).toHaveBeenCalled();
  });

  it("leaves wire booking edits alone when the status does not change", async () => {
    currentBooking = {
      id: BOOKING_ID,
      status: "paid",
      payment_method: "wire_transfer",
      swift_confirmation_code: "KVR-20260910-A1B2C3D4-FULL",
      deposit_method: null,
    };

    const res = await PUT(
      makeRequest({ status: "paid", client_name: "Martin Kaponda" }),
      params()
    );

    expect(res.status).toBe(200);
    expect(mockHandleUpdate).toHaveBeenCalled();
  });

  it("leaves wire booking edits alone when moving to a non-money status", async () => {
    currentBooking = {
      id: BOOKING_ID,
      status: "provisional",
      payment_method: "wire_transfer",
      swift_confirmation_code: null,
      deposit_method: null,
    };

    const res = await PUT(makeRequest({ status: "confirmed" }), params());

    expect(res.status).toBe(200);
    expect(mockHandleUpdate).toHaveBeenCalled();
  });
});

describe("PUT /api/admin/bookings/[id] — supplier compliance gate", () => {
  const JOURNEY_ID = "11111111-1111-1111-1111-111111111111";

  function bookingOnJourney(status: string): Record<string, unknown> {
    return {
      id: BOOKING_ID,
      status,
      payment_method: "paypal",
      swift_confirmation_code: null,
      deposit_method: null,
      journey_id: JOURNEY_ID,
    };
  }

  it("refuses to confirm a booking whose supplier lacks compliance files", async () => {
    currentBooking = bookingOnJourney("provisional");
    mockItineraryItems = [{ supplier_id: "sup-1" }];
    mockSuppliers = [
      {
        id: "sup-1",
        name: "Rift Valley Safaris",
        contract_on_file: false,
        insurance_on_file: true,
      },
    ];

    const res = await PUT(makeRequest({ status: "confirmed" }), params());

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/Rift Valley Safaris/);
    expect(json.error).toMatch(/contract and\/or insurance/);
    expect(mockHandleUpdate).not.toHaveBeenCalled();
  });

  it("confirms when every journey supplier is compliant", async () => {
    currentBooking = bookingOnJourney("provisional");
    mockItineraryItems = [{ supplier_id: "sup-1" }];
    mockSuppliers = [
      {
        id: "sup-1",
        name: "Rift Valley Safaris",
        contract_on_file: true,
        insurance_on_file: true,
      },
    ];

    const res = await PUT(makeRequest({ status: "confirmed" }), params());

    expect(res.status).toBe(200);
    expect(mockHandleUpdate).toHaveBeenCalled();
  });

  it("does not gate a journey with no linked suppliers", async () => {
    currentBooking = bookingOnJourney("provisional");
    mockItineraryItems = [];
    mockSuppliers = [];

    const res = await PUT(makeRequest({ status: "confirmed" }), params());

    expect(res.status).toBe(200);
    expect(mockHandleUpdate).toHaveBeenCalled();
  });
});