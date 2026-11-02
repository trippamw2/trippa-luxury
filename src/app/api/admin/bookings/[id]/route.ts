import { NextRequest, NextResponse } from "next/server";
import { handleGetOne, handleUpdate, handleDelete } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  newBookingNotification,
  paymentReceiptEmail,
} from "@/lib/email";
import {
  supplierBookingConfirmed,
  supplierBookingUpdated,
  supplierPaymentReceived,
} from "@/lib/supplier-email";
import { mapKeysToCamel } from "@/lib/api-helpers";
import { createNotification } from "@/lib/notifications";
import { ensureGuestAuthUser } from "@/lib/guest-auth-provision";
import {
  registerSupplierReservationsForBooking,
  registerTripDelivery,
} from "@/lib/pipeline/register";

const TABLE = "bookings";

type CamelBooking = {
  clientName?: string;
  bookingReference?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  totalAmount?: string;
  depositAmount?: string;
  paymentMethod?: string;
  specialRequests?: string;
};

type SupplierRow = {
  id: string;
  name: string;
  email: string | null;
  contact_person: string | null;
};

type BookingSupplierRow = {
  supplier_id: string;
  service_name: string | null;
  cost: number | null;
  suppliers: SupplierRow | null;
};

/**
 * The guest's address from a booking payload, or null when it carries none.
 *
 * The admin editor sends `client_email` (snake_case, the column name);
 * `clientEmail` is accepted too, because the generic admin helpers accept
 * both spellings. A booking without an address has no guest to provision.
 */
function readClientEmail(body: Record<string, unknown>): string | null {
  const raw = body.client_email ?? body.clientEmail;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * True when the incoming address is new for this booking or differs from the
 * one the booking carries today.
 *
 * The comparison is case- and whitespace-insensitive: an address that differs
 * only in case or padding is the same guest, not a new one. A booking that
 * had no address at all counts as new the moment one is set.
 */
function clientEmailChanged(stored: string | null, incoming: string): boolean {
  const storedNormalized = (stored ?? "").trim().toLowerCase();
  if (storedNormalized.length === 0) return true;
  return storedNormalized !== incoming.trim().toLowerCase();
}

/**
 * Map a new booking status to the appropriate email type and template data.
 * Returns null if no email should be auto-sent for this status.
 */
async function sendStatusEmail(
  bookingId: string,
  newStatus: string,
  oldStatus: string
): Promise<void> {
  if (newStatus === oldStatus) return;

  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (!booking || !booking.client_email) return;

  const b = mapKeysToCamel<CamelBooking>(booking);
  const clientName = b.clientName || "Valued Guest";
  const bookingRef = b.bookingReference || bookingId.slice(0, 8).toUpperCase();

  let subject: string;
  let htmlContent: string;

  try {
    switch (newStatus) {
      case "deposit_paid": {
        // Deposit received → send receipt
        const receipt = paymentReceiptEmail({
          clientName,
          bookingRef,
          amount: b.depositAmount
            ? `$${parseFloat(b.depositAmount).toLocaleString()}`
            : "$0",
          paymentMethod: b.paymentMethod || undefined,
        });
        subject = receipt.subject;
        htmlContent = receipt.htmlContent;
        break;
      }

      case "confirmed": {
        // Booking confirmed → send confirmation
        const notif = newBookingNotification({
          bookingRef,
          clientName,
          destination: b.destination,
          startDate: b.startDate
            ? new Date(b.startDate).toLocaleDateString()
            : undefined,
          totalAmount: b.totalAmount
            ? `$${parseFloat(b.totalAmount).toLocaleString()}`
            : undefined,
        });
        subject = notif.subject;
        htmlContent = notif.htmlContent;
        break;
      }

      case "paid": {
        // Fully paid → send receipt
        const receipt = paymentReceiptEmail({
          clientName,
          bookingRef,
          amount: b.totalAmount
            ? `$${parseFloat(b.totalAmount).toLocaleString()}`
            : "$0",
          paymentMethod: b.paymentMethod || undefined,
        });
        subject = receipt.subject;
        htmlContent = receipt.htmlContent;
        break;
      }

      default:
        return; // No auto-email for other status transitions
    }

    await sendEmail({
      to: [{ email: booking.client_email, name: clientName }],
      subject,
      htmlContent,
    });
  } catch (err) {
    // Email failure should never break the booking update
    console.error(`Auto-email failed for booking ${bookingId}:`, err);
  }
}

/**
 * Notify suppliers when a booking status changes.
 * Looks up suppliers via the booking_suppliers join table.
 */
async function sendSupplierEmails(
  bookingId: string,
  newStatus: string,
  oldStatus: string
): Promise<void> {
  if (newStatus === oldStatus) return;

  try {
    const supabase = createAdminClient();

    // Fetch booking + linked suppliers
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (!booking) return;

    const b = mapKeysToCamel<CamelBooking>(booking);
    const clientName = b.clientName || "Valued Guest";
    const bookingRef = b.bookingReference || bookingId.slice(0, 8).toUpperCase();
    const destination = b.destination || "";
    const dates = b.startDate && b.endDate
      ? `${new Date(b.startDate).toLocaleDateString()} – ${new Date(b.endDate).toLocaleDateString()}`
      : b.startDate
        ? new Date(b.startDate).toLocaleDateString()
        : undefined;

    // Fetch linked suppliers
    const { data: bookingSuppliers } = await supabase
      .from("booking_suppliers")
      .select("supplier_id, service_name, cost, suppliers!inner(id, name, email, contact_person)")
      .eq("booking_id", bookingId);

    if (!bookingSuppliers || bookingSuppliers.length === 0) return;

    const supplierEmails = (bookingSuppliers as unknown as BookingSupplierRow[])
      .map((bs) => bs.suppliers)
      .filter((s): s is SupplierRow => s !== null && !!s.email);

    if (supplierEmails.length === 0) return;

    for (const supplier of supplierEmails) {
      let emailData: { subject: string; htmlContent: string };

      switch (newStatus) {
        case "confirmed":
          emailData = supplierBookingConfirmed({
            supplierName: supplier.contact_person || supplier.name,
            clientName,
            bookingRef,
            destination,
            dates,
            notes: b.specialRequests || undefined,
          });
          break;

        case "deposit_paid":
        case "paid":
          emailData = supplierPaymentReceived({
            supplierName: supplier.contact_person || supplier.name,
            clientName,
            bookingRef,
            destination,
            amount: newStatus === "paid"
              ? (b.totalAmount ? `$${parseFloat(b.totalAmount).toLocaleString()}` : "$0")
              : (b.depositAmount ? `$${parseFloat(b.depositAmount).toLocaleString()}` : "$0"),
            paymentMethod: b.paymentMethod || undefined,
          });
          break;

        default:
          emailData = supplierBookingUpdated({
            supplierName: supplier.contact_person || supplier.name,
            clientName,
            bookingRef,
            destination,
            dates,
            changes: `Status changed from ${oldStatus} to ${newStatus}`,
          });
          break;
      }

      if (!supplier.email) continue;

      await sendEmail({
        to: [{ email: supplier.email, name: supplier.name }],
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
      });
    }
  } catch (err) {
    console.error(`Supplier email failed for booking ${bookingId}:`, err);
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleGetOne(TABLE, id);
}

/**
 * Suppliers on a journey that are missing a contract and/or insurance on file.
 * Empty when the journey has no linked suppliers, or all are compliant — the
 * only thing this returns is a set that should obstruct a confirmation.
 */
async function findNonCompliantSuppliers(
  journeyId: string | null
): Promise<{ id: string; name: string }[]> {
  if (!journeyId) return [];
  const supabase = createAdminClient();

  const { data: items } = await supabase
    .from("itinerary_items")
    .select("supplier_id")
    .eq("journey_id", journeyId)
    .not("supplier_id", "is", null);

  const ids = Array.from(
    new Set(
      ((items ?? []) as { supplier_id: string | null }[])
        .map((item) => item.supplier_id)
        .filter((value): value is string => typeof value === "string" && value !== "")
    )
  );
  if (ids.length === 0) return [];

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, contract_on_file, insurance_on_file")
    .in("id", ids);

  return (
    (suppliers ?? []) as {
      id: string;
      name: string | null;
      contract_on_file: boolean | null;
      insurance_on_file: boolean | null;
    }[]
  )
    .filter((s) => s.contract_on_file !== true || s.insurance_on_file !== true)
    .map((s) => ({ id: s.id, name: s.name || "Unnamed supplier" }));
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return updateBooking(request, context);
}

/**
 * PATCH is an alias for PUT.
 *
 * The admin editor updates a booking with PUT, but PATCH is the verb the
 * platform's booking API is described with, and the update is field-wise at
 * the database level anyway (only the posted columns are written). Both verbs
 * therefore run the same handler — including the guest-portal provisioning
 * below — so the two can never drift apart.
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return updateBooking(request, context);
}

async function updateBooking(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // The guest's address on the incoming payload, and the one the booking
  // carries today. Both are needed to decide whether this edit is the moment
  // the guest gains portal access (a new address, or a different one).
  //
  // The stored address is read BEFORE the update, so the comparison is
  // against the booking as it stands today and not against the value this
  // very request is about to write.
  const incomingClientEmail = readClientEmail(body);
  let storedClientEmail: string | null = null;
  if (incomingClientEmail) {
    try {
      const supabase = createAdminClient();
      const { data: current } = await supabase
        .from("bookings")
        .select("client_email")
        .eq("id", id)
        .single();
      const stored = current?.client_email;
      storedClientEmail = typeof stored === "string" ? stored : null;
    } catch (err) {
      // Not being able to read the booking back is no reason to fail the edit:
      // fall back to "no stored address", which provisions the incoming one.
      // The helper is idempotent, so a repeat is harmless.
      console.error(`Could not read the stored guest address for booking ${id}:`, err);
      storedClientEmail = null;
    }
  }

  // A booking paid by wire transfer must move to a money status exclusively
  // through the confirm-payment endpoint, which writes the finance ledger
  // (transactions + payments) and the audit trail. The generic editor must
  // refuse to mark such a booking paid/deposit-paid directly, or the money is
  // never recorded. This stays out of the way of every other edit: it only
  // fires when the status is CHANGING to a money status and the booking shows
  // wire-transfer evidence (its own record or the payload).
  const moneyStatus = body.status === "deposit_paid" || body.status === "paid";

  // Fetch current booking to detect status changes + wire-transfer evidence
  let oldStatus: string | null = null;
  let wireBooking = false;
  let journeyId: string | null = null;
  if (body.status) {
    const supabase = createAdminClient();
    const { data: current } = await supabase
      .from("bookings")
      .select("status, payment_method, swift_confirmation_code, deposit_method, journey_id")
      .eq("id", id)
      .single();
    oldStatus = current?.status || null;
    journeyId = (current?.journey_id as string | null) ?? null;
    wireBooking =
      current?.payment_method === "wire_transfer" ||
      Boolean(current?.swift_confirmation_code) ||
      current?.deposit_method === "swift" ||
      current?.deposit_method === "bank_transfer" ||
      body.payment_method === "wire_transfer" ||
      Boolean(body.swift_confirmation_code);
  }

  if (wireBooking && moneyStatus && oldStatus !== body.status) {
    return NextResponse.json(
      {
        error:
          "Wire-transfer payments must be confirmed with the 'Confirm Payment Received' action so the finance ledger is written. Edit the booking without changing its payment status, then use that action on the booking row.",
      },
      { status: 409 }
    );
  }

  // Supplier compliance gate (KORA: "suppliers used without complete
  // compliance files"). A booking cannot be confirmed while any supplier on its
  // journey lacks a contract and/or insurance on file. The journey's suppliers
  // are the source of truth here, because booking_suppliers rows are only
  // derived *on* confirmation — checking those would let the first confirm pass
  // and block nothing. Mirrors the wire-transfer 409 guard above.
  if (body.status === "confirmed" && oldStatus !== "confirmed") {
    const nonCompliant = await findNonCompliantSuppliers(journeyId);
    if (nonCompliant.length > 0) {
      const names = nonCompliant.map((s) => s.name).join(", ");
      return NextResponse.json(
        {
          error: `Cannot confirm: ${names} ${nonCompliant.length === 1 ? "is" : "are"} missing a contract and/or insurance on file. Complete the supplier compliance file (or remove the supplier from the journey) before confirming.`,
        },
        { status: 409 }
      );
    }
  }

  const result = await handleUpdate(TABLE, id, body, request);

  // Guest portal access.
  //
  // The guest's address arrives with the booking, and the portal's own login
  // flow never creates users (it only signs in addresses that already exist),
  // so the booking is where the address has to be provisioned from.
  //
  // "Changed-or-new" is decided against the STORED booking, read before the
  // update above: the incoming address is compared with the one the booking
  // carries today. An address that was empty and is now set counts as new, a
  // genuinely different address counts as changed, and re-saving the same
  // address does not provision at all (the helper is idempotent, so there
  // would be nothing to gain).
  //
  // Only a successful update provisions, and the call is isolated: the helper
  // never throws, and the try/catch makes sure of it. A provisioning problem
  // must never turn a saved booking into a failed request.
  if (result.status === 200 && incomingClientEmail && clientEmailChanged(storedClientEmail, incomingClientEmail)) {
    try {
      const outcome = await ensureGuestAuthUser(incomingClientEmail);
      if (outcome.failed) {
        console.error(
          `Guest portal provisioning failed for ${incomingClientEmail}: ${outcome.reason ?? "unknown_error"}`
        );
      } else {
        console.log(
          `Guest portal provisioning for ${incomingClientEmail}: ${outcome.created ? "created" : "skipped"}`
        );
      }
    } catch (err) {
      console.error(`Guest portal provisioning error for ${incomingClientEmail}:`, err);
    }
  }

  // If status changed and update succeeded, send auto-emails in background
  if (result.status === 200 && body.status && oldStatus && oldStatus !== body.status) {
    sendStatusEmail(id, body.status, oldStatus);
    sendSupplierEmails(id, body.status, oldStatus);

    // Surface the state change in the admin bell so operators notice it even
    // when they are not watching the bookings page.
    void createNotification({
      type: "booking_status_changed",
      title: `Booking ${id.slice(0, 8).toUpperCase()} → ${body.status}`,
      body: `Status changed from ${oldStatus} to ${body.status}`,
      link: `/admin/bookings/${id}`,
      entityType: "booking",
      entityId: id,
    }).catch((err) => console.error("Failed to create booking status notification:", err));

    // Automated pipeline: operations & trip delivery. Derives supplier
    // reservations on confirmation, marks them confirmed as operations runs,
    // and advances the operational journey (in_operation / completed + the
    // learning event). Idempotent and non-fatal: the register functions
    // swallow their own errors and return them for logging, so a pipeline
    // hiccup can never fail a booking status update.
    try {
      const supplierRes = await registerSupplierReservationsForBooking(id, body.status);
      if (supplierRes.error) {
        console.error("Supplier reservation registration issue:", supplierRes.error);
      }
    } catch (pipelineError) {
      console.error("Supplier reservation pipeline error:", pipelineError);
    }
    try {
      const delivery = await registerTripDelivery(id, body.status);
      if (delivery.error) {
        console.error("Trip delivery registration issue:", delivery.error);
      }
    } catch (pipelineError) {
      console.error("Trip delivery pipeline error:", pipelineError);
    }
  }

  return result;
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleDelete(TABLE, id);
}
