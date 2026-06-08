// ─── Kivara Brand Template ─────────────────────────────────────────────
// Shared brand styles and document wrapper for all branded papers.

export const KIVARA_BRAND = {
  name: "Kivara",
  tagline: "Where Your Love Story Meets the Wild.",
  email: "concierge@kivara.luxury",
  phone: "+27 87 123 4567",
  website: "https://kivara.luxury",
  address: "Cape Town, South Africa",
  colors: {
    primary: "#1A1A1A",
    gold: "#C9A96E",
    goldLight: "#D4BC8A",
    goldDark: "#B8944A",
    cream: "#FAF7F2",
    warmWhite: "#F5F0EB",
    warmWhiteDark: "#EDE5DA",
    sand: "#D4C5A9",
    earth: "#8B7D6B",
    earthLight: "#A89880",
    white: "#FFFFFF",
    darkBg: "#1A1A1A",
    textPrimary: "#1A1A1A",
    textSecondary: "#4A4A4A",
    textMuted: "#8B7D6B",
  },
  fonts: {
    heading: "'Trajan Pro', 'Times New Roman', serif",
    body: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    mono: "'Courier New', monospace",
  },
};

export interface DocumentMeta {
  title: string;
  reference: string;
  date: string;
  clientName: string;
  bookingRef?: string;
}

export function wrapDocument(html: string, meta?: { title?: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta?.title || "Kivara Luxury Travel"} | Kivara</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    @page { margin: 0; }
    
    body {
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      background: #F4EFE8;
      color: #1A1A1A;
      -webkit-font-smoothing: antialiased;
    }
    
    @media print {
      body { background: white; }
      .no-print { display: none !important; }
      .document { box-shadow: none; }
    }
    
    /* ── Document Container ─────────────────────────── */
    .document {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border: 1px solid rgba(201, 169, 110, 0.15);
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.07);
    }
    
    /* ── Header ──────────────────────────────────────── */
    .document-header {
      background: #141414;
      padding: 44px 60px 36px;
      position: relative;
    }
    
    .document-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #C9A96E, #D4BC8A, #C9A96E);
    }
    
    .document-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 60px;
      right: 60px;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(201, 169, 110, 0.5), transparent);
    }
    
    .document-brand {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
    }
    
    .brand-logo-svg {
      display: block;
      width: 220px;
      height: auto;
    }
    
    .document-badge {
      text-align: right;
    }
    
    .document-badge-label {
      font-size: 9px;
      color: #A89880;
      text-transform: uppercase;
      letter-spacing: 3px;
    }
    
    .document-badge-title {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      color: #D4BC8A;
      margin-top: 2px;
      font-weight: 500;
    }
    
    /* ── Body ─────────────────────────────────────────── */
    .document-body {
      padding: 52px 60px 60px;
    }
    
    /* ── Footer ───────────────────────────────────────── */
    .document-footer {
      border-top: 1px solid rgba(201, 169, 110, 0.2);
      padding: 20px 60px;
      text-align: center;
    }
    
    .document-footer p {
      font-size: 8.5px;
      color: #8B7D6B;
      margin-bottom: 3px;
      letter-spacing: 0.8px;
      line-height: 1.6;
    }
    
    .document-footer .footer-brand {
      font-size: 11px;
      font-family: 'Playfair Display', serif;
      color: #C9A96E;
      letter-spacing: 2px;
      margin-bottom: 6px;
    }
    
    /* ── Typography ───────────────────────────────────── */
    h1 {
      font-family: 'Playfair Display', serif;
      font-size: 26px;
      font-weight: 500;
      margin-bottom: 10px;
      color: #1A1A1A;
      line-height: 1.3;
    }
    
    h2 {
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      font-weight: 500;
      margin-bottom: 16px;
      color: #1A1A1A;
    }
    
    h3 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      color: #8B7D6B;
      margin-bottom: 12px;
      padding-bottom: 8px;
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    h3::before,
    h3::after {
      content: '';
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(201, 169, 110, 0.3), transparent);
    }
    
    h3::before { flex: none; width: 24px; background: #C9A96E; }
    
    p {
      font-size: 13px;
      line-height: 1.8;
      color: #4A4A4A;
      margin-bottom: 14px;
    }
    
    /* ── Tables ───────────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    
    thead th {
      text-align: left;
      padding: 10px 8px;
      font-size: 9px;
      color: #8B7D6B;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 600;
      border-bottom: 1px solid rgba(201, 169, 110, 0.3);
    }
    
    td {
      padding: 10px 8px;
      font-size: 13px;
      border-bottom: 1px solid #F0EBE4;
      color: #4A4A4A;
    }
    
    tfoot td {
      border-bottom: none;
      padding-top: 12px;
    }
    
    /* ── Utilities ────────────────────────────────────── */
    .gold { color: #C9A96E; }
    .gold-dark { color: #B8944A; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: 'Courier New', monospace; }
    .text-earth { color: #8B7D6B; }
    .text-xs { font-size: 11px; }
    .text-sm { font-size: 12px; }
    .mt-2 { margin-top: 8px; }
    .mb-2 { margin-bottom: 8px; }
    
    /* ── Reference Box ────────────────────────────────── */
    .ref-box {
      background: #F6F2EC;
      border-left: 3px solid #C9A96E;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    
    .ref-box p {
      font-size: 11px;
      color: #8B7D6B;
      margin-bottom: 2px;
    }
    
    .ref-box .ref-value {
      font-size: 15px;
      font-weight: 700;
      color: #1A1A1A;
      font-family: 'Courier New', monospace;
    }
    
    /* ── Info Grid ────────────────────────────────────── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 28px;
    }
    
    .info-item {
      border-bottom: 1px solid #F0EBE4;
      padding-bottom: 8px;
    }
    
    .info-item label {
      font-size: 9px;
      color: #8B7D6B;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: block;
      margin-bottom: 3px;
    }
    
    .info-item span {
      font-size: 14px;
      color: #1A1A1A;
      font-weight: 500;
    }
    
    /* ── Dividers ─────────────────────────────────────── */
    .divider {
      border: none;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(201, 169, 110, 0.3), transparent);
      margin: 32px 0;
    }
    
    .ornament {
      text-align: center;
      margin: 28px 0;
      font-size: 14px;
      color: #C9A96E;
      letter-spacing: 12px;
      opacity: 0.5;
    }
    
    /* ── Total Row ────────────────────────────────────── */
    .total-row td {
      font-size: 16px;
      font-weight: 700;
      padding-top: 16px;
      border-top: 2px solid #C9A96E;
    }
    
    .total-amount {
      font-size: 22px;
      color: #C9A96E;
      font-weight: 700;
    }
    
    .subtotal-label {
      font-size: 12px;
      color: #8B7D6B;
    }
    
    /* ── Print Button ─────────────────────────────────── */
    .print-button {
      background: #141414;
      color: #FAF7F2;
      border: 1px solid rgba(201, 169, 110, 0.3);
      padding: 12px 32px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      cursor: pointer;
      margin-bottom: 24px;
      transition: all 0.2s;
    }

    .print-button:hover {
      background: #2C2C2C;
      border-color: #C9A96E;
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: center; padding: 24px 0;">
    <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="document">
    ${html}
  </div>
</body>
</html>`;
}

export function documentHeader(meta: { title: string; reference: string; clientName: string }): string {
  return `
    <div class="document-header">
      <div class="document-brand">
        <div>
          <svg class="brand-logo-svg" viewBox="0 0 400 145" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Kivara">
            <path d="M 105,12 Q 200,24 295,12 Q 200,40 105,12 Z" fill="#F4F0E8" opacity="0.7"/>
            <path d="M 105,46 Q 200,36 295,46 Q 200,22 105,46 Z" fill="#D4BC8A" opacity="0.8"/>
            <text x="200" y="88" text-anchor="middle" font-family="'Trajan Pro','Times New Roman',Georgia,serif" font-size="44" font-weight="400" fill="#F4F0E8" style="letter-spacing: 28px;">KIVARA</text>
            <text x="200" y="120" text-anchor="middle" font-family="'Inter','Helvetica Neue',Arial,sans-serif" font-size="7" font-weight="300" fill="#D8CBB8" style="letter-spacing: 5px;">BUSH ● BEACH ● ROMANCE</text>
          </svg>
        </div>
        <div class="document-badge">
          <div class="document-badge-label">${meta.title}</div>
          <div class="document-badge-title">${meta.reference}</div>
        </div>
      </div>
    </div>`;
}

export function documentBody(content: string): string {
  return `<div class="document-body">${content}</div>`;
}

export function documentFooter(): string {
  return `
    <div class="document-footer">
      <p class="footer-brand">KIVARA</p>
      <p>${KIVARA_BRAND.email} &nbsp;·&nbsp; ${KIVARA_BRAND.phone} &nbsp;·&nbsp; ${KIVARA_BRAND.website}</p>
      <p style="opacity: 0.6;">${KIVARA_BRAND.address} &nbsp;·&nbsp; ${KIVARA_BRAND.tagline}</p>
    </div>`;
}

export function refBox(label: string, value: string): string {
  return `
    <div class="ref-box">
      <p>${label}</p>
      <div class="ref-value">${value}</div>
    </div>`;
}

export function infoGrid(items: { label: string; value: string }[]): string {
  const rows = items.map(item => `
    <div class="info-item">
      <label>${item.label}</label>
      <span>${item.value}</span>
    </div>`).join("");
  return `<div class="info-grid">${rows}</div>`;
}
