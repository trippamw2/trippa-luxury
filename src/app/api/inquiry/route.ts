import { NextResponse } from "next/server";

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

    // In production, save to Supabase and send email notification
    // const supabase = createAdminClient();
    // await supabase.from("inquiries").insert({ full_name: fullName, email, ... });

    console.log("Inquiry received:", { fullName, email, destination });

    return NextResponse.json({
      success: true,
      message: "Thank you for your inquiry. Our concierge team will respond within 24 hours.",
    });
  } catch (error) {
    console.error("Inquiry error:", error);
    return NextResponse.json(
      { error: "Failed to process inquiry" },
      { status: 500 }
    );
  }
}
