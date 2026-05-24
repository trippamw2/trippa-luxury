import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, newBookingNotification, paymentReceiptEmail, reminderEmail, paymentLinkEmail } from "@/lib/email";
import { mapKeysToCamel } from "@/lib/api-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, paymentUrl } = body; // type: "confirmation" | "receipt" | "reminder" | "payment-link"

    // Fetch booking
    const supabase = createAdminClient();
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const b = mapKeysToCamel<any>(booking);
    const clientName = b.clientName || "Valued Guest";
    const clientEmail = b.clientEmail;
    const bookingRef = b.bookingReference || b.id?.slice(0, 8).toUpperCase();

    if (!clientEmail) {
      return NextResponse.json({ error: "Booking has no client email" }, { status: 400 });
    }

    let emailPayload: { subject: string; htmlContent: string };

    switch (type) {
      case "confirmation": {
        const notif = newBookingNotification({
          bookingRef,
          clientName,
          destination: b.destination,
          startDate: b.startDate,
          totalAmount: b.totalAmount ? `$${parseFloat(b.totalAmount).toLocaleString()}` : undefined,
        });
        emailPayload = { subject: notif.subject, htmlContent: notif.htmlContent };
        break;
      }
      case "receipt": {
        const receipt = paymentReceiptEmail({
          clientName,
          bookingRef,
          amount: b.depositAmount ? `$${parseFloat(b.depositAmount).toLocaleString()}` : "$0",
          paymentMethod: b.paymentMethod || undefined,
        });
        emailPayload = { subject: receipt.subject, htmlContent: receipt.htmlContent };
        break;
      }
      case "reminder": {
        const reminder = reminderEmail({
          clientName,
          subject: `A Gentle Reminder — ${bookingRef} — Kivara Luxury Travel`,
          htmlContent: `
            <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">${clientName},</h2>
            <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">This is a gentle reminder regarding the outstanding balance for booking <strong>${bookingRef}</strong>.</p>
            <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">Your remaining investment of <strong style="color: #C9A96E; font-size: 18px;">$${parseFloat(b.balanceAmount || 0).toLocaleString()}</strong> is due by <strong>${b.balanceDueDate ? new Date(b.balanceDueDate).toLocaleDateString() : "the date specified in your proposal"}</strong>.</p>
            <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">Should you have any questions or wish to discuss payment arrangements, your concierge is here to assist.</p>
            <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 16px 0 0;">With warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Concierge</strong></p>
          `,
        });
        emailPayload = { subject: reminder.subject, htmlContent: reminder.htmlContent };
        break;
      }
      case "payment-link": {
        if (!paymentUrl) {
          return NextResponse.json({ error: "paymentUrl is required for payment-link type" }, { status: 400 });
        }
        const pl = paymentLinkEmail({
          clientName,
          bookingRef,
          amount: `$${parseFloat(b.totalAmount || 0).toLocaleString()}`,
          paymentUrl,
          type: "full",
        });
        emailPayload = { subject: pl.subject, htmlContent: pl.htmlContent };
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown email type: ${type}` }, { status: 400 });
    }

    const result = await sendEmail({
      to: [{ email: clientEmail, name: clientName }],
      subject: emailPayload.subject,
      htmlContent: emailPayload.htmlContent,
    });

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (err: any) {
    console.error("Send booking email error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
