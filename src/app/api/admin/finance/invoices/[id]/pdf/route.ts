import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { generateInvoicePDFBuffer } from "@/lib/documents/invoice-pdf";
import { mapKeysToCamel } from "@/lib/api-helpers";

type InvoiceBooking = {
  bookingReference?: string;
  clientName?: string;
  clientEmail?: string;
};

type InvoiceLineItem = {
  description?: string;
  quantity?: number | string;
  qty?: number | string;
  unit_price?: number | string;
  unitPrice?: number | string;
  total?: number | string;
};

/**
 * GET /api/admin/finance/invoices/[id]/pdf
 *
 * Downloads a branded Kivara invoice PDF for the given invoice ID.
 * Requires admin authentication.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const supabase = createAdminClient();

    // Fetch invoice with booking reference
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*, bookings!inner(booking_reference, client_name, client_email)")
      .eq("id", id)
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: error?.message || "Invoice not found" },
        { status: error?.code === "PGRST116" ? 404 : 500 }
      );
    }

    const booking = mapKeysToCamel<InvoiceBooking>(invoice.bookings);
    const lineItems = (invoice.line_items as InvoiceLineItem[]) || [];
    const currency = invoice.currency || "USD";

    const pdfData = {
      invoiceNumber: invoice.invoice_number,
      bookingRef: booking.bookingReference || id.slice(0, 8).toUpperCase(),
      clientName: booking.clientName || "Valued Client",
      clientEmail: booking.clientEmail || "",
      issueDate: invoice.issue_date
        ? new Date(invoice.issue_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
      dueDate: invoice.due_date
        ? new Date(invoice.due_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "N/A",
      lineItems: lineItems.map((item: InvoiceLineItem) => ({
        description: item.description || "Service",
        quantity: Number(item.quantity || item.qty || 1),
        unitPrice: parseFloat(String(item.unit_price || item.unitPrice || 0)),
        total: parseFloat(String(item.total || 0)),
      })),
      subtotal: parseFloat(invoice.subtotal || 0),
      taxRate: parseFloat(invoice.tax_rate || 0),
      taxAmount: parseFloat(invoice.tax_amount || 0),
      discountAmount: invoice.discount_amount
        ? parseFloat(invoice.discount_amount)
        : undefined,
      totalAmount: parseFloat(invoice.total_amount || 0),
      currency,
      notes: invoice.notes || undefined,
      status: invoice.status || "draft",
    };

    const pdfBuffer = await generateInvoicePDFBuffer(pdfData);
    const pdfBytes = new Uint8Array(pdfBuffer);

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
        "Content-Length": pdfBytes.length.toString(),
      },
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Invoice PDF generation error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate invoice PDF";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
