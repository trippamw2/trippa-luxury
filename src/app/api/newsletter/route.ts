import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    // In production, save to Supabase
    // const supabase = createAdminClient();
    // await supabase.from("newsletter_subscribers").insert({ email });

    console.log("Newsletter subscription:", email);

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to the Trippa newsletter.",
    });
  } catch (error) {
    console.error("Newsletter error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
