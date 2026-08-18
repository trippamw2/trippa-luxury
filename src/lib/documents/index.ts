// ─── Kivara Document Generation System ─────────────────────────────────
// Unified export for all branded document generators.

export { generateQuoteDocument, generateQuoteHtmlEmail } from "./quote";
export { generateInvoiceDocument } from "./invoice";
export { generateInvoicePDFBuffer } from "./invoice-pdf";
export { generateReceiptDocument } from "./receipt";
export { generateItineraryDocument } from "./itinerary";
export { generateVisaInfoDocument } from "./visa-info";
export { generatePackingListDocument } from "./packing-list";
export { generateTravelInsuranceDocument } from "./travel-insurance";

export { wrapDocument, KIVARA_BRAND } from "./template";
export type { InvoiceData } from "./invoice";
export type { InvoicePDFData } from "./invoice-pdf";
export type { ReceiptDocumentData } from "./receipt";
