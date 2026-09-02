import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminAuthError } from "@/lib/admin-auth";
import {
  generatePaymentReference,
  getBankDetailsFromSettings,
  generateWireTransferInstructions,
} from "@/lib/wire-transfer";

/**
 * POST /api/payment/wire-transfer
 * Creates wire transfer instructions for a booking.
 * Accessible to admin users AND authenticated guests who own the booking.
 *
 * Body: { bookingId: string, type: "deposit" | "balance" | "full" }
 * Returns: { instructions, reference, bankDetails, deadline }
 */
export async function POST(request: NextRequest) {
  try {
    const { bookingId, type = "balance" } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    // Auth check: must be admin or authenticated guest who owns this booking
    const supabaseClient = await createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Check if user is an admin
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, client_name, client_email, booking_reference, total_amount, deposit_amount, balance_amount, currency")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // If not admin, verify guest owns this booking
    if (!adminProfile) {
      if (booking.client_email !== user.email) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Calculate amount based on payment type
    const totalAmount = Number(booking.total_amount) || 0;
    const depositAmount = Number(booking.deposit_amount) || 0;
    const balanceAmount = Number(booking.balance_amount) || (totalAmount - depositAmount);

    let amount: number;
    if (type === "deposit") {
      amount = depositAmount || Math.round(totalAmount * 0.3);
    } else if (type === "balance") {
      amount = balanceAmount;
    } else {
      amount = totalAmount;
    }

    const currency = booking.currency || "USD";

    // Generate payment reference
    const paymentRef = generatePaymentReference(type, bookingId);

    // Fetch bank details from platform_settings
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("key, value");

    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    const bankDetails = getBankDetailsFromSettings(settingsMap);

    if (!bankDetails.bankName || !bankDetails.accountNumber) {
      return NextResponse.json(
        { error: "Bank details not configured. Please add bank details in Admin > Settings." },
        { status: 400 }
      );
    }

    // Generate instructions
    const instructions = generateWireTransferInstructions({
      bankDetails,
      amount,
      currency,
      reference: paymentRef.reference,
      guestName: booking.client_name || "Valued Guest",
      bookingRef: booking.booking_reference || bookingId.slice(0, 8).toUpperCase(),
    });

    // Store the payment reference on the booking
    await supabase
      .from("bookings")
      .update({
        payment_method: "wire_transfer",
        swift_confirmation_code: paymentRef.reference,
      })
      .eq("id", bookingId);

    return NextResponse.json({
      reference: paymentRef.reference,
      amount,
      currency,
      type,
      bankDetails: instructions.bankDetails,
      instructions: instructions.instructions,
      deadline: instructions.deadline,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Wire transfer error:", err);
    const message = err instanceof Error ? err.message : "Failed to create wire transfer instructions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
