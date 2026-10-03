// â”€â”€â”€ Kivara Inquiry API (with AI agent trigger) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Receives guest inquiries, saves to Supabase, sends emails, and triggers
// AI agent pipeline (profiler â†’ curator â†’ quote) automatically.
// POST /api/inquiry

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, newInquiryEmail, inquiryConfirmationEmail } from "@/lib/email";
import { guestProfiler, persistClientDna, type ProfiledGuest } from "@/lib/ai/guest-profiler";
import { logInteraction } from "@/lib/ai/customer-intelligence";
import { workflowPersistence } from "@/lib/workflow-persistence";
import { clientKey, llmCostLimiter, publicWriteLimiter, tooManyRequests } from "@/lib/public-rate-limiter";
import { gateAiAction, ActionBlockedError, actionBlockedResponse } from "@/lib/ai/action-gate";

export async function POST(request: Request) {
  try {
    // This writes a row and sends two emails, so it is an open door to inbox
    // flooding and quota burn without a bound.
    const verdict = await publicWriteLimiter.take(clientKey(request));
    if (!verdict.allowed) {
      return tooManyRequests(verdict.retryAfterSeconds, "Too many enquiries. Please try again shortly.");
    }

    // The pipeline below profiles the guest with a paid LLM, so this endpoint is
    // publicly billable as well as publicly writable.
    const llmVerdict = await llmCostLimiter.take(clientKey(request));
    if (!llmVerdict.allowed) {
      return tooManyRequests(llmVerdict.retryAfterSeconds, "Too many requests. Please try again shortly.");
    }

    const body = await request.json();
    const { fullName, email, phone, destination, preferredDates, guests, message } = body;

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    // Bound the stored and emailed fields so one request cannot carry a
    // megabyte of text into the CRM and the concierge's inbox.
    const MAX_LEN = 2000;
    for (const [field, value] of Object.entries({ fullName, email, phone, destination, message })) {
      if (typeof value === "string" && value.length > MAX_LEN) {
        return NextResponse.json(
          { error: `${field} must be ${MAX_LEN} characters or fewer` },
          { status: 400 }
        );
      }
    }

    // â”€â”€ 1. Save to Supabase â”€â”€
    // Gated after validation but before the first side effect: this route writes
    // a row, profiles the guest with a paid LLM, and sends two emails. An
    // inbound inquiry is an internal write (it notifies the business, not the
    // guest), so it is gated as one â€” and refused before anything is stored if
    // the operator has switched AI internal writes off.
    try {
      await gateAiAction("inquiry", {}, { entityType: "inquiry", entityId: null });
    } catch (gateError) {
      if (gateError instanceof ActionBlockedError) return actionBlockedResponse(gateError);
      throw gateError;
    }

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

    // â”€â”€ 2. AI: Profile the guest (LLM-powered) â”€â”€
    let aiProfile: {
      id: string;
      isCouple: boolean;
      specialOccasion?: string;
      preferences: Record<string, unknown>;
      destinations?: string[];
    } | null = null;
    let aiLeadScore: { score: number; tier: string } | null = null;
    let aiWorkflow: { id: string } | null = null;
    // Held beyond the AI block because Client DNA can only be written once the
    // `guest_profiles.id` UUID exists, and that is resolved in the CRM step.
    let profiledGuest: ProfiledGuest | null = null;
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

      profiledGuest = profile;
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

    // â”€â”€ 2b. CRM: upsert guest profile + log inbound inquiry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Every inquiry becomes a Customer Memory record so the AI chief of
    // staff and journey engine have persistent context on this guest.
    let guestProfileId: string | null = null;
    try {
      if (email) {
        const { data: existingGuest } = await supabase
          .from("guest_profiles")
          .select("id")
          .eq("email", email)
          .single();

        const occasion = aiProfile?.specialOccasion || null;
        const prefs = (aiProfile?.preferences || {}) as {
          travelStyle?: string;
          accommodationStyle?: string;
          activityLevel?: string;
          budgetRange?: string;
        };

        if (existingGuest) {
          guestProfileId = existingGuest.id;
          await supabase
            .from("guest_profiles")
            .update({
              full_name: fullName,
              phone: phone || undefined,
              is_couple: aiProfile?.isCouple ?? true,
              special_occasion: occasion || undefined,
              travel_style: prefs.travelStyle,
              accommodation_style: prefs.accommodationStyle,
              activity_level: prefs.activityLevel,
              budget_range: prefs.budgetRange,
              past_destinations: aiProfile?.destinations
                ? JSON.parse(JSON.stringify(aiProfile.destinations))
                : undefined,
              last_contacted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingGuest.id);
        } else {
          const { data: newGuest, error: guestError } = await supabase
            .from("guest_profiles")
            .insert({
              full_name: fullName,
              email,
              phone: phone || null,
              is_couple: aiProfile?.isCouple ?? true,
              travel_style: prefs.travelStyle || "mixed",
              accommodation_style: prefs.accommodationStyle || "luxury-resort",
              activity_level: prefs.activityLevel || "moderate",
              budget_range: prefs.budgetRange || "premium",
              dietary_restrictions: [],
              interests: [],
              special_occasion: occasion || null,
              past_destinations: aiProfile?.destinations
                ? JSON.parse(JSON.stringify(aiProfile.destinations))
                : [],
              wishlist: [],
              source: "website",
              email_opt_in: true,
            })
            .select("id")
            .single();

          if (guestError || !newGuest) {
            console.error("Failed to create guest profile:", guestError?.message);
          } else {
            guestProfileId = newGuest.id;
          }
        }

        // Link the inquiry to the guest profile for the timeline
        if (guestProfileId && inquiry?.id) {
          await supabase
            .from("inquiries")
            .update({ guest_profile_id: guestProfileId })
            .eq("id", inquiry.id);
        }

        // Log the inbound inquiry interaction
        if (guestProfileId) {
          await logInteraction({
            guestProfileId,
            channel: "email",
            direction: "inbound",
            subject: `Website inquiry${occasion ? ` â€” ${occasion}` : ""}`,
            body: message || "Inquiry via website",
            relatedInquiryId: inquiry?.id,
          });
        }

        // Persist the profile as this guest's active Client DNA â€” the memory
        // every later AI step reads. Version bumps on re-profile, and
        // `persistClientDna` never throws, so a lost write cannot fail the
        // inquiry that produced it.
        if (profiledGuest && guestProfileId) {
          const dna = await persistClientDna(profiledGuest, {
            leadId: null,
            guestProfileId,
          });
          if (!dna.ok) {
            console.error("Client DNA not persisted:", dna.error);
          }
        }
      }
    } catch (crmError) {
      console.error("CRM guest profile error:", crmError);
      // Non-fatal : the inquiry is still recorded
    }

    // â”€â”€ 3. Send notification email to concierge team â”€â”€
    const emailStatus: { notification: "sent" | "failed" | "skipped"; confirmation: "sent" | "failed" | "skipped" } = {
      notification: "skipped",
      confirmation: "skipped",
    };
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
        to: [{ email: "concierge@kivara.africa", name: "Kivara Concierge" }],
        replyTo: { email, name: fullName },
      });
      emailStatus.notification = "sent";
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
      emailStatus.notification = "failed";
    }

    // â”€â”€ 4. Send confirmation email to the inquirer â”€â”€
    try {
      await sendEmail({
        ...inquiryConfirmationEmail({ fullName, destination }),
        to: [{ email, name: fullName }],
      });
      emailStatus.confirmation = "sent";
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      emailStatus.confirmation = "failed";
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for your inquiry. Our concierge team will respond within 24 hours.",
      inquiryId: inquiry?.id || null,
      guestProfileId,
      email: emailStatus,
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
