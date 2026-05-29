// ─── Kivara Invoice PDF Document (@react-pdf/renderer) ───────────────────
// Server-side renderable PDF document for invoice downloads.

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

// ── Brand Constants ────────────────────────────────────────────────────
const GOLD = "#C9A96E";
const GOLD_LIGHT = "#D4BC8A";
const DARK = "#141414";
const TEXT_PRIMARY = "#1A1A1A";
const TEXT_SECONDARY = "#4A4A4A";
const TEXT_MUTED = "#8B7D6B";
const CREAM = "#FAF7F2";
const WARM_WHITE = "#F5F0EB";
const BORDER = "#EDE5DA";

// ── Data Types ─────────────────────────────────────────────────────────
export interface InvoicePDFData {
  invoiceNumber: string;
  bookingRef: string;
  clientName: string;
  clientEmail: string;
  issueDate: string;
  dueDate: string;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount?: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  status: string;
}

// ── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: TEXT_PRIMARY,
    backgroundColor: "#FFFFFF",
    padding: 0,
  },
  // Header
  header: {
    backgroundColor: DARK,
    padding: "36 48 28",
  },
  headerGoldBar: {
    height: 2,
    backgroundColor: GOLD,
    marginBottom: 20,
  },
  brandName: {
    fontFamily: "Times-Roman",
    fontSize: 28,
    color: "#F4F0E8",
    letterSpacing: 12,
    textAlign: "center",
  },
  brandTagline: {
    fontSize: 7,
    color: "#D8CBB8",
    letterSpacing: 4,
    textAlign: "center",
    marginTop: 4,
    textTransform: "uppercase",
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  badgeLabel: {
    fontSize: 7,
    color: TEXT_MUTED,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  badgeTitle: {
    fontFamily: "Times-Roman",
    fontSize: 14,
    color: GOLD_LIGHT,
    marginTop: 1,
  },
  statusBadge: {
    fontSize: 7,
    color: GOLD,
    letterSpacing: 2,
    textTransform: "uppercase",
    borderWidth: 1,
    borderColor: GOLD,
    padding: "2 8",
    marginLeft: 12,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  // Body
  body: {
    padding: "40 48 48",
  },
  // Section
  sectionTitle: {
    fontSize: 8,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    paddingBottom: 6,
  },
  // Info grid
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
  },
  infoItem: {
    width: "50%",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 6,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 7,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 500,
    color: TEXT_PRIMARY,
  },
  // Ref box
  refBox: {
    backgroundColor: WARM_WHITE,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    padding: "12 16",
    marginBottom: 20,
  },
  refLabel: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginBottom: 2,
  },
  refValue: {
    fontSize: 12,
    fontFamily: "Courier",
    fontWeight: 700,
    color: TEXT_PRIMARY,
  },
  // Table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableHeaderCell: {
    fontSize: 7,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: 600,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 6,
  },
  tableCell: {
    fontSize: 9,
    color: TEXT_SECONDARY,
  },
  tableCellBold: {
    fontSize: 9,
    fontWeight: 700,
    color: TEXT_PRIMARY,
  },
  tableTotalRow: {
    flexDirection: "row",
    borderTopWidth: 2,
    borderTopColor: GOLD,
    paddingTop: 8,
    marginTop: 4,
  },
  tableTotalLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: TEXT_PRIMARY,
  },
  tableTotalValue: {
    fontSize: 14,
    fontWeight: 700,
    color: GOLD,
  },
  // Notes
  notesBox: {
    backgroundColor: WARM_WHITE,
    padding: "12 16",
    marginBottom: 20,
  },
  notesText: {
    fontSize: 8,
    color: TEXT_MUTED,
    lineHeight: 1.6,
  },
  // Paragraph
  paragraph: {
    fontSize: 10,
    lineHeight: 1.8,
    color: TEXT_SECONDARY,
    marginBottom: 14,
  },
  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    padding: "16 48",
    textAlign: "center",
  },
  footerBrand: {
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: "#C2A46D",
    letterSpacing: 2,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 7,
    color: TEXT_MUTED,
    letterSpacing: 0.6,
    lineHeight: 1.6,
  },
});

// ── PDF Document Component ─────────────────────────────────────────────
const InvoicePDF: React.FC<InvoicePDFData> = (data) => {
  const itemsRows = data.lineItems.map((item, i) => (
    <View style={styles.tableRow} key={i}>
      <Text style={[styles.tableCell, { flex: 3 }]}>{item.description}</Text>
      <Text style={[styles.tableCell, { flex: 0.7, textAlign: "center" }]}>
        {item.quantity}
      </Text>
      <Text style={[styles.tableCell, { flex: 1.2, textAlign: "right" }]}>
        {data.currency} {item.unitPrice.toLocaleString()}
      </Text>
      <Text style={[styles.tableCellBold, { flex: 1.2, textAlign: "right" }]}>
        {data.currency} {item.total.toLocaleString()}
      </Text>
    </View>
  ));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerGoldBar} />
          <Text style={styles.brandName}>KIVARA</Text>
          <Text style={styles.brandTagline}>BUSH ● BEACH ● ROMANCE</Text>
          <View style={styles.badgeRow}>
            <View>
              <Text style={styles.badgeLabel}>Invoice</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.badgeTitle}>{data.invoiceNumber}</Text>
                <Text style={styles.statusBadge}>{data.status}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          {/* Reference */}
          <View style={styles.refBox}>
            <Text style={styles.refLabel}>Booking Reference</Text>
            <Text style={styles.refValue}>{data.bookingRef}</Text>
          </View>

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Client</Text>
              <Text style={styles.infoValue}>{data.clientName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{data.clientEmail}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Issue Date</Text>
              <Text style={styles.infoValue}>{data.issueDate}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Due Date</Text>
              <Text style={styles.infoValue}>{data.dueDate}</Text>
            </View>
          </View>

          {/* Line Items */}
          <Text style={styles.sectionTitle}>Services Rendered</Text>
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Description</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.7, textAlign: "center" }]}>
                Qty
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: "right" }]}>
                Unit Price
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: "right" }]}>
                Total
              </Text>
            </View>

            {/* Rows */}
            {itemsRows}

            {/* Totals */}
            <View style={[styles.tableRow, { borderBottomWidth: 0, paddingTop: 8 }]}>
              <Text style={[{ flex: 3.7, textAlign: "right", fontSize: 9, color: TEXT_MUTED }]}>
                Subtotal
              </Text>
              <Text style={[{ flex: 1.2, textAlign: "right", fontSize: 10, color: TEXT_PRIMARY }]}>
                {data.currency} {data.subtotal.toLocaleString()}
              </Text>
            </View>
            {data.discountAmount ? (
              <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                <Text style={[{ flex: 3.7, textAlign: "right", fontSize: 9, color: TEXT_MUTED }]}>
                  Discount
                </Text>
                <Text
                  style={[{ flex: 1.2, textAlign: "right", fontSize: 10, color: GOLD }]}
                >
                  -{data.currency} {data.discountAmount.toLocaleString()}
                </Text>
              </View>
            ) : null}
            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={[{ flex: 3.7, textAlign: "right", fontSize: 9, color: TEXT_MUTED }]}>
                Tax ({data.taxRate}%)
              </Text>
              <Text style={[{ flex: 1.2, textAlign: "right", fontSize: 10, color: TEXT_PRIMARY }]}>
                {data.currency} {data.taxAmount.toLocaleString()}
              </Text>
            </View>
            <View style={styles.tableTotalRow}>
              <Text style={[{ flex: 3.7, textAlign: "right", fontSize: 12, fontWeight: 700 }]}>
                Total Due
              </Text>
              <Text style={[{ flex: 1.2, textAlign: "right", fontSize: 14, fontWeight: 700, color: GOLD }]}>
                {data.currency} {data.totalAmount.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Notes */}
          {data.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{data.notes}</Text>
            </View>
          ) : null}

          {/* Payment info */}
          <Text style={styles.paragraph}>
            Payment is due by {data.dueDate}. Please remit payment via bank transfer or the
            secure payment link provided separately.
          </Text>
          <Text style={styles.paragraph}>
            Thank you for choosing Kivara.
            {"\n"}
            <Text style={{ color: GOLD, fontWeight: 700 }}>The Kivara Team</Text>
          </Text>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>KIVARA</Text>
          <Text style={styles.footerText}>
            concierge@kivara.luxury &nbsp;&middot;&nbsp; +27 87 123 4567 &nbsp;&middot;&nbsp;{" "}
            https://kivara.luxury
          </Text>
          <Text style={[styles.footerText, { opacity: 0.6 }]}>
            Cape Town, South Africa &nbsp;&middot;&nbsp; Where Your Love Story Meets the Wild.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

// ── Server-side render helper ──────────────────────────────────────────
export async function generateInvoicePDFBuffer(
  data: InvoicePDFData
): Promise<Buffer> {
  const element = React.createElement(InvoicePDF, data);
  return renderToBuffer(element as unknown as React.ReactElement<React.ComponentProps<typeof Document>>);
}

export default InvoicePDF;
