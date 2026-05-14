import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, newsletterWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if already subscribed
    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("email, is_active")
      .eq("email", email)
      .single();

    if (existing) {
      if (!existing.is_active) {
        await supabase
          .from("newsletter_subscribers")
          .update({ is_active: true, unsubscribed_at: null })
          .eq("email", email);
      }
      return NextResponse.json({
        success: true,
        message: "You are already subscribed to our newsletter.",
      });
    }

    const { error: dbError } = await supabase
      .from("newsletter_subscribers")
      .insert({ email, is_active: true });

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: 500 }
      );
    }

    // Send welcome email via Brevo
    try {
      const welcomeEmail = newsletterWelcomeEmail();
      await sendEmail({
        subject: welcomeEmail.subject,
        htmlContent: welcomeEmail.htmlContent,
        to: [{ email, name: email.split("@")[0] }],
      });
    } catch (emailError) {
      console.error("Newsletter welcome email error:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Welcome to Trippa! Check your inbox for a confirmation.",
    });
  } catch (error) {
    console.error("Newsletter error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
