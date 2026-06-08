// ─── Kivara Quote PDF Document (@react-pdf/renderer) ────────────────────
// Server-side renderable PDF document for quote attachments.

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { CuratedJourney } from "@/lib/ai/types";
import type { QuoteData } from "@/lib/ai/quote-engine";

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
  // Body
  body: {
    padding: "40 48 48",
  },
  greeting: {
    fontFamily: "Times-Roman",
    fontSize: 18,
    marginBottom: 12,
    color: TEXT_PRIMARY,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.8,
    color: TEXT_SECONDARY,
    marginBottom: 14,
  },
  // Reference box
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
  // Section title
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
  journeyTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 2,
    color: TEXT_PRIMARY,
  },
  journeySubtitle: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginBottom: 16,
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
  // Highlights
  highlightItem: {
    fontSize: 9,
    color: TEXT_SECONDARY,
    marginBottom: 4,
    paddingLeft: 8,
  },
  // Included
  includedItem: {
    fontSize: 9,
    color: TEXT_SECONDARY,
    marginBottom: 3,
    paddingLeft: 8,
  },
  // Itinerary preview
  itineraryRow: {
    flexDirection: "row",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  dayCol: {
    width: 40,
    fontSize: 9,
    color: GOLD,
    fontFamily: "Courier",
  },
  detailCol: {
    flex: 1,
  },
  itineraryTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  itineraryMeta: {
    fontSize: 8,
    color: TEXT_MUTED,
  },
  // Terms
  termsBox: {
    backgroundColor: WARM_WHITE,
    padding: "12 16",
    marginTop: 20,
  },
  termsText: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginBottom: 4,
    lineHeight: 1.6,
  },
  termsHighlight: {
    color: GOLD,
    fontWeight: 700,
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
interface QuotePDFProps {
  journey: CuratedJourney;
  quoteRef: string;
  validUntil: string;
  depositRequired: number;
  depositPercent: number;
  paymentTerms: string;
}

const QuotePDF: React.FC<QuotePDFProps> = ({
  journey,
  quoteRef,
  validUntil,
  depositRequired,
  depositPercent,
  paymentTerms,
}) => {
  const { pricing } = journey;
  const isCouple = journey.guestProfile.isCouple ?? true;
  const guestLabel = isCouple ? "Couple" : "Solo Traveller";
  const guestCount = isCouple ? 2 : 1;
  const transferCost = pricing.transfers.reduce((s, t) => s + t.cost, 0);
  const accomSubtotal = pricing.subtotal - transferCost;

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
              <Text style={styles.badgeLabel}>Journey Proposal</Text>
              <Text style={styles.badgeTitle}>{quoteRef}</Text>
            </View>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          <Text style={styles.greeting}>Dear {journey.guestProfile.name},</Text>
          <Text style={styles.paragraph}>
            It is our privilege to present this personally curated journey for you. Every
            element has been selected with care : from the properties that will host you to
            the moments waiting to be discovered.
          </Text>

          {/* Reference */}
          <View style={styles.refBox}>
            <Text style={styles.refLabel}>Quote Reference</Text>
            <Text style={styles.refValue}>{quoteRef}</Text>
          </View>

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Guest</Text>
              <Text style={styles.infoValue}>{journey.guestProfile.name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Party</Text>
              <Text style={styles.infoValue}>
                {guestLabel} &middot; {isCouple ? "2 Guests" : "1 Guest"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>{journey.duration} Nights</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Valid Until</Text>
              <Text style={styles.infoValue}>{validUntil}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Destinations</Text>
              <Text style={styles.infoValue}>
                {journey.destinations
                  .map((d) => d.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
                  .join(", ")}
              </Text>
            </View>
          </View>

          {/* Journey Overview */}
          <Text style={styles.sectionTitle}>Journey Overview</Text>
          <Text style={styles.journeyTitle}>{journey.title}</Text>
          <Text style={styles.journeySubtitle}>{journey.subtitle}</Text>

          {/* Itinerary Summary */}
          <Text style={styles.sectionTitle}>Itinerary Summary</Text>
          {journey.itinerary.slice(0, 5).map((day) => (
            <View style={styles.itineraryRow} key={day.day}>
              <Text style={styles.dayCol}>Day {day.day}</Text>
              <View style={styles.detailCol}>
                <Text style={styles.itineraryTitle}>{day.title}</Text>
                <Text style={styles.itineraryMeta}>
                  {day.accommodation} &middot; {day.location}
                </Text>
                {day.transfers.length > 0 && (
                  <Text style={styles.itineraryMeta}>
                    {day.transfers.map((t) => `${t.from} → ${t.to}`).join(", ")}
                  </Text>
                )}
              </View>
            </View>
          ))}
          {journey.itinerary.length > 5 && (
            <Text style={{ fontSize: 8, color: TEXT_MUTED, marginBottom: 10 }}>
              Full {journey.itinerary.length}-day itinerary available upon request.
            </Text>
          )}

          {/* Pricing */}
          <Text style={styles.sectionTitle}>Investment</Text>
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Accommodation</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.7, textAlign: "center" }]}>
                Nights
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>
                {isCouple ? "Per Couple" : "Per Person"}/N
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>
                Subtotal
              </Text>
            </View>

            {/* Rows */}
            {pricing.accommodation.map((a, i) => {
              const pppn = a.ratePerNightPPPN || Math.round(a.ratePerNight / guestCount);
              return (
                <View style={styles.tableRow} key={i}>
                  <Text style={[styles.tableCell, { flex: 2.5 }]}>{a.label}</Text>
                  <Text style={[styles.tableCell, { flex: 0.7, textAlign: "center" }]}>
                    {a.nights}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                    ${pppn.toLocaleString()}
                  </Text>
                  <Text style={[styles.tableCellBold, { flex: 1, textAlign: "right" }]}>
                    ${a.subtotal.toLocaleString()}
                  </Text>
                </View>
              );
            })}

            {/* Totals */}
            <View style={[styles.tableRow, { borderBottomWidth: 0, paddingTop: 8 }]}>
              <Text style={[{ flex: 3, textAlign: "right", fontSize: 9, color: TEXT_MUTED }]}>
                Accommodation Subtotal
              </Text>
              <Text style={[{ flex: 1, textAlign: "right", fontSize: 10, color: TEXT_PRIMARY }]}>
                ${accomSubtotal.toLocaleString()}
              </Text>
            </View>
            {transferCost > 0 && (
              <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                <Text
                  style={[{ flex: 3, textAlign: "right", fontSize: 9, color: TEXT_MUTED }]}
                >
                  Private Charters & Transfers
                </Text>
                <Text
                  style={[{ flex: 1, textAlign: "right", fontSize: 10, color: TEXT_PRIMARY }]}
                >
                  ${transferCost.toLocaleString()}
                </Text>
              </View>
            )}
            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={[{ flex: 3, textAlign: "right", fontSize: 9, color: TEXT_MUTED }]}>
                Taxes & Fees (10%)
              </Text>
              <Text
                style={[{ flex: 1, textAlign: "right", fontSize: 10, fontWeight: 700, color: TEXT_PRIMARY }]}
              >
                ${pricing.taxes.toLocaleString()}
              </Text>
            </View>
            <View style={styles.tableTotalRow}>
              <Text style={[{ flex: 3, textAlign: "right", fontSize: 12, fontWeight: 700 }]}>
                Total
              </Text>
              <Text style={[{ flex: 1, textAlign: "right", fontSize: 14, fontWeight: 700, color: GOLD }]}>
                ${pricing.total.toLocaleString()} {pricing.currency}
              </Text>
            </View>
          </View>

          {/* Highlights */}
          <Text style={styles.sectionTitle}>Journey Highlights</Text>
          {journey.highlights.map((h, i) => (
            <Text key={i} style={styles.highlightItem}>
              &bull; {h}
            </Text>
          ))}

          {/* What's Included */}
          {journey.includedExtras.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>What's Included</Text>
              {journey.includedExtras.map((e, i) => (
                <Text key={i} style={styles.includedItem}>
                  &bull; {e}
                </Text>
              ))}
            </>
          )}

          {/* Terms */}
          <Text style={styles.sectionTitle}>Terms & Payment</Text>
          <View style={styles.termsBox}>
            <Text style={styles.termsText}>
              Deposit Required:{" "}
              <Text style={styles.termsHighlight}>
                ${depositRequired.toLocaleString()} ({depositPercent}%)
              </Text>
            </Text>
            <Text style={styles.termsText}>{paymentTerms}</Text>
            <Text style={styles.termsText}>
              Quote valid until: <Text style={{ fontWeight: 700 }}>{validUntil}</Text>
            </Text>
          </View>

          <Text style={styles.paragraph}>
            Should you wish to adjust any element of this journey, simply reply. Your
            personal concierge is ready to refine every detail until it feels perfectly yours.
          </Text>
          <Text style={styles.paragraph}>
            Warmest regards,
            {"\n"}
            <Text style={{ color: GOLD, fontWeight: 700 }}>Your Kivara Concierge</Text>
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
export async function generateQuotePDFBuffer(data: {
  journey: CuratedJourney;
  quoteRef: string;
  validUntil: string;
  depositRequired: number;
  depositPercent: number;
  paymentTerms: string;
}): Promise<Buffer> {
  const element = React.createElement(QuotePDF, data);
  return renderToBuffer(element as unknown as React.ReactElement<React.ComponentProps<typeof Document>>);
}

export default QuotePDF;
