import { NextRequest } from "next/server";
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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  // Fetch current booking to detect status changes
  let oldStatus: string | null = null;
  if (body.status) {
    const supabase = createAdminClient();
    const { data: current } = await supabase
      .from("bookings")
      .select("status")
      .eq("id", id)
      .single();
    oldStatus = current?.status || null;
  }

  const result = await handleUpdate(TABLE, id, body, request);

  // If status changed and update succeeded, send auto-emails in background
  if (result.status === 200 && body.status && oldStatus && oldStatus !== body.status) {
    sendStatusEmail(id, body.status, oldStatus);
    sendSupplierEmails(id, body.status, oldStatus);
  }

  return result;
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleDelete(TABLE, id);
}
