// ─── Kivara Document Generation System ─────────────────────────────────
// Unified export for all branded document generators.

export { generateQuoteDocument, generateQuoteHtmlEmail } from "./quote";
export { generateInvoiceDocument } from "./invoice";
export { generateInvoicePDFBuffer } from "./invoice-pdf";
export { generateReceiptDocument } from "./receipt";
export { generateItineraryDocument } from "./itinerary";

export { wrapDocument, KIVARA_BRAND } from "./template";
export type { InvoiceData } from "./invoice";
export type { InvoicePDFData } from "./invoice-pdf";
export type { ReceiptDocumentData } from "./receipt";
