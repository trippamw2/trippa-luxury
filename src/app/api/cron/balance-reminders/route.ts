import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/cron/balance-reminders
 *
 * Cron-job-friendly endpoint that sends balance payment reminders
 * for bookings where the departure is within 30 days and the balance
 * has not yet been paid.
 *
 * Designed to be called by Vercel Cron Jobs (or any scheduled task runner).
 *
 * Auth: Bearer token matching CRON_SECRET env var.
 *
 * Response:
 *   { sent: number, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers.get("authorization")?.replace("Bearer ", "");
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Find bookings where:
    // - Status is confirmed or provisional
    // - Departure is within 30 days from now
    // - Balance is still owed (balance_amount > 0)
    // - No reminder has been sent yet
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, booking_reference, client_name, client_email, start_date, balance_amount, currency")
      .in("status", ["confirmed", "provisional"])
      .lte("start_date", thirtyDaysFromNow.toISOString())
      .gt("balance_amount", 0)
      .is("balance_reminder_sent_at", null);

    if (error) {
      console.error("Cron: error fetching bookings for balance reminders:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        sent: 0,
        message: "No bookings require balance reminders at this time.",
      });
    }

    let sent = 0;

    for (const booking of bookings) {
      if (!booking.client_email) continue;

      const balanceAmount = booking.balance_amount || 0;
      const currency = booking.currency || "USD";
      const bookingRef = booking.booking_reference || booking.id.slice(0, 8).toUpperCase();
      const clientName = booking.client_name || "Valued Guest";
      const startDate = booking.start_date
        ? new Date(booking.start_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "your upcoming journey";

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const paymentUrl = `${baseUrl}/portal/booking/${booking.id}`;

      const htmlContent = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; color: #1A1A1A;">
          <div style="background: #1A1A1A; padding: 32px 40px; text-align: center;">
            <h1 style="font-family: 'Times New Roman', serif; color: #D4BC8A; font-size: 24px; margin: 0; letter-spacing: 2px;">KIVARA</h1>
            <p style="color: #A89880; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin: 4px 0 0;">Balance Payment Reminder</p>
          </div>
          <div style="padding: 40px;">
            <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">${clientName},</h2>
            <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">As your journey on <strong>${startDate}</strong> approaches, we kindly remind you that the remaining balance for booking <strong>${bookingRef}</strong> is due within 30 days of your departure.</p>
            <div style="background: #F5F0EB; padding: 20px; margin-bottom: 24px; border-left: 3px solid #C9A96E;">
              <p style="font-size: 11px; color: #8B7D6B; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Amount Due</p>
              <p style="font-size: 24px; color: #C9A96E; font-weight: 700; margin: 0;">${currency} ${balanceAmount.toLocaleString()}</p>
            </div>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${paymentUrl}" style="display: inline-block; padding: 14px 40px; background: #1A1A1A; color: #FAF7F2; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">View Booking & Pay</a>
            </div>
            <p style="font-size: 13px; color: #8B7D6B; line-height: 1.6; margin: 0;">Should you have any questions or require assistance with your payment, your concierge is here to help : simply reply to this email.</p>
            <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 16px 0 0;">With warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Concierge</strong></p>
          </div>
          <div style="background: #EDE5DA; padding: 20px 40px; text-align: center;">
            <p style="font-size: 10px; color: #8B7D6B; margin: 0;">Kivara Luxury Travel : concierge@kivara.luxury</p>
          </div>
        </div>`;

      try {
        await sendEmail({
          to: [{ email: booking.client_email, name: clientName }],
          subject: `Balance Payment Reminder : ${bookingRef} : Kivara Luxury Travel`,
          htmlContent,
        });

        // Mark reminder as sent
        await supabase
          .from("bookings")
          .update({ balance_reminder_sent_at: new Date().toISOString() })
          .eq("id", booking.id);

        sent++;
      } catch (err) {
        console.error(`Cron: failed to send balance reminder for booking ${booking.id}:`, err);
        // Continue with next booking — don't fail the whole batch
      }
    }

    return NextResponse.json({
      sent,
      message: `${sent} balance reminder(s) sent out of ${bookings.length} eligible booking(s).`,
    });
  } catch (err: unknown) {
    console.error("Cron: balance-reminders error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
