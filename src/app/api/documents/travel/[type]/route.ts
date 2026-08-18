import { NextRequest, NextResponse } from "next/server";
import { generateVisaInfoDocument } from "@/lib/documents/visa-info";
import { generatePackingListDocument } from "@/lib/documents/packing-list";
import { generateTravelInsuranceDocument } from "@/lib/documents/travel-insurance";

/**
 * GET /api/documents/travel/[type]
 * Returns branded HTML travel documents.
 * Types: visa-info, packing-list, travel-insurance
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  let html: string;

  switch (type) {
    case "visa-info":
      html = generateVisaInfoDocument();
      break;
    case "packing-list":
      html = generatePackingListDocument();
      break;
    case "travel-insurance":
      html = generateTravelInsuranceDocument();
      break;
    default:
      return NextResponse.json({ error: "Unknown document type" }, { status: 404 });
  }

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
