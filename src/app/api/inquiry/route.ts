import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, newInquiryEmail, inquiryConfirmationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, phone, destination, preferredDates, guests, message } = body;

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // Save to Supabase
    const supabase = createAdminClient();
    const { data: inquiry, error: dbError } = await supabase
      .from("inquiries")
      .insert({
        full_name: fullName,
        email,
        phone: phone || null,
        destination: destination || null,
        preferred_dates: preferredDates || null,
        guests: guests || 2,
        message,
        status: "new",
        source: "website",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      // Don't fail the request - still send email notification
    }

    // Send notification email to concierge team
    try {
      await sendEmail({
        ...newInquiryEmail({ fullName, email, phone, destination, preferredDates, guests, message }),
        to: [{ email: "concierge@trippa.luxury", name: "Trippa Concierge" }],
        replyTo: { email, name: fullName },
      });
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
      // Don't fail the request
    }

    // Send confirmation email to the inquirer
    try {
      await sendEmail({
        ...inquiryConfirmationEmail({ fullName, destination }),
        to: [{ email, name: fullName }],
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the request
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for your inquiry. Our concierge team will respond within 24 hours.",
      inquiryId: inquiry?.id || null,
    });
  } catch (error) {
    console.error("Inquiry error:", error);
    return NextResponse.json(
      { error: "Failed to process inquiry" },
      { status: 500 }
    );
  }
}
