import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    siteName: "Kivara Luxury Travel",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
    supabaseConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    brevoConfigured: !!process.env.NEXT_BREVO_KEY,
  });
}
