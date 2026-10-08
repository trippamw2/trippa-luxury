import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, newsletterWelcomeEmail } from "@/lib/email";
import { clientKey, publicWriteLimiter } from "@/lib/public-rate-limiter";

export async function POST(request: Request) {
  try {
    // Each accepted signup sends a welcome email, so this needs a bound too.
    const verdict = await publicWriteLimiter.take(clientKey(request));
    if (!verdict.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } }
      );
    }

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
    let emailStatus: "sent" | "failed" = "failed";
    try {
      const welcomeEmail = newsletterWelcomeEmail();
      await sendEmail({
        subject: welcomeEmail.subject,
        htmlContent: welcomeEmail.htmlContent,
        to: [{ email, name: email.split("@")[0] }],
      });
      emailStatus = "sent";
    } catch (emailError) {
      console.error("Newsletter welcome email error:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Welcome to Kivara! Check your inbox for a confirmation.",
      email: { welcome: emailStatus },
    });
  } catch (error) {
    console.error("Newsletter error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/newsletter — unsubscribe an address without logging in.
 *
 * CAN-SPAM and GDPR both require a web unsubscribe that needs no account, so
 * this is deliberately unauthenticated (bounded by the shared public-write
 * limiter, like signup). It always reports success whether or not the address
 * existed, so the endpoint cannot be used to probe who is on the list.
 */
export async function DELETE(request: Request) {
  try {
    const verdict = await publicWriteLimiter.take(clientKey(request));
    if (!verdict.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } }
      );
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
      .eq("email", email);

    if (error) {
      console.error("Newsletter unsubscribe error:", error);
      return NextResponse.json(
        { error: "Failed to unsubscribe. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "You have been unsubscribed. You will not receive further newsletters.",
    });
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}
