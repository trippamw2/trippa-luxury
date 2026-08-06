import { NextRequest } from "next/server";
import { handleGetOne, handleUpdate, handleDelete } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  newBookingNotification,
  paymentReceiptEmail,
} from "@/lib/email";
import { mapKeysToCamel } from "@/lib/api-helpers";

const TABLE = "bookings";

type CamelBooking = {
  clientName?: string;
  bookingReference?: string;
  destination?: string;
  startDate?: string;
  totalAmount?: string;
  depositAmount?: string;
  paymentMethod?: string;
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

  // If status changed and update succeeded, send auto-email in background
  if (result.status === 200 && body.status && oldStatus && oldStatus !== body.status) {
    sendStatusEmail(id, body.status, oldStatus);
  }

  return result;
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleDelete(TABLE, id);
}
