// ─── Kivara Inquiry API (with AI agent trigger) ─────────────────────────
// Receives guest inquiries, saves to Supabase, sends emails, and triggers
// AI agent pipeline (profiler → curator → quote) automatically.
// POST /api/inquiry

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, newInquiryEmail, inquiryConfirmationEmail } from "@/lib/email";
import { guestProfiler } from "@/lib/ai/guest-profiler";
import { workflowPersistence } from "@/lib/workflow-persistence";

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

    // ── 1. Save to Supabase ──
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
    }

    // ── 2. AI: Profile the guest (LLM-powered) ──
    let aiProfile: {
      id: string;
      isCouple: boolean;
      specialOccasion?: string;
      preferences: any;
      destinations?: string[];
    } | null = null;
    let aiLeadScore: { score: number; tier: string } | null = null;
    let aiWorkflow: any = null;
    try {
      const profile = await guestProfiler.llmProfile({
        fullName,
        email,
        phone: phone || undefined,
        message: message || "",
        destination: destination || undefined,
        preferredDates: preferredDates || undefined,
        guests: guests || 2,
      });

      aiProfile = {
        id: profile.id,
        isCouple: profile.isCouple,
        specialOccasion: profile.specialOccasion,
        preferences: profile.preferences,
        destinations: profile.extractedDestinations,
      };

      aiLeadScore = {
        score: profile.leadScore,
        tier: profile.leadTier,
      };

      // Create workflow entry in Supabase
      if (inquiry?.id) {
        aiWorkflow = await workflowPersistence.createFromInquiry(
          inquiry.id,
          fullName,
          email,
          phone,
          destination,
          preferredDates,
          guests,
          message
        );
      }
    } catch (aiError) {
      console.error("AI profiling error:", aiError);
      // Don't fail the request : still send emails and save inquiry
    }

    // ── 3. Send notification email to concierge team ──
    try {
      const enhancedNotification = newInquiryEmail({
        fullName,
        email,
        phone,
        destination,
        preferredDates,
        guests,
        message,
      });

      await sendEmail({
        ...enhancedNotification,
        to: [{ email: "concierge@kivara.luxury", name: "Kivara Concierge" }],
        replyTo: { email, name: fullName },
      });
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
    }

    // ── 4. Send confirmation email to the inquirer ──
    try {
      await sendEmail({
        ...inquiryConfirmationEmail({ fullName, destination }),
        to: [{ email, name: fullName }],
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for your inquiry. Our concierge team will respond within 24 hours.",
      inquiryId: inquiry?.id || null,
      ai: {
        profile: aiProfile,
        leadScore: aiLeadScore,
        workflowId: aiWorkflow?.id || null,
      },
    });
  } catch (error) {
    console.error("Inquiry error:", error);
    return NextResponse.json(
      { error: "Failed to process inquiry" },
      { status: 500 }
    );
  }
}
