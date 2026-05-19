// ─── Kivara Brand Template ─────────────────────────────────────────────
// Shared brand styles and document wrapper for all branded papers.

export const KIVARA_BRAND = {
  name: "Kivara",
  tagline: "Where the Soul of the Bush Meets the Serenity of the Shore.",
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      background: #FAF7F2;
      color: #1A1A1A;
      -webkit-font-smoothing: antialiased;
    }
    
    @media print {
      body { background: white; }
      .no-print { display: none !important; }
    }
    
    .document {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
    }
    
    .document-header {
      background: #1A1A1A;
      padding: 48px 60px 40px;
      position: relative;
    }
    
    .document-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 60px;
      right: 60px;
      height: 1px;
      background: linear-gradient(90deg, transparent, #C9A96E, transparent);
    }
    
    .document-brand {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
    }
    
    .brand-name {
      font-family: 'Playfair Display', 'Times New Roman', serif;
      font-size: 32px;
      color: #D4BC8A;
      letter-spacing: 6px;
      font-weight: 700;
      line-height: 1;
    }
    
    .brand-tagline {
      font-size: 8px;
      color: #A89880;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-top: 6px;
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
    }
    
    .document-body {
      padding: 48px 60px 60px;
    }
    
    .document-footer {
      background: #F5F0EB;
      padding: 24px 60px;
      text-align: center;
    }
    
    .document-footer p {
      font-size: 9px;
      color: #8B7D6B;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    
    h1 { font-family: 'Playfair Display', serif; font-size: 24px; margin-bottom: 8px; }
    h2 { font-family: 'Playfair Display', serif; font-size: 18px; margin-bottom: 16px; color: #1A1A1A; }
    h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8B7D6B; margin-bottom: 12px; border-bottom: 1px solid #EDE5DA; padding-bottom: 8px; }
    
    p { font-size: 13px; line-height: 1.7; color: #4A4A4A; margin-bottom: 12px; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; padding: 10px 8px; font-size: 10px; color: #8B7D6B; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #EDE5DA; }
    td { padding: 10px 8px; font-size: 13px; border-bottom: 1px solid #F5F0EB; }
    tfoot td { border-bottom: none; padding-top: 12px; }
    
    .gold { color: #C9A96E; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: 'Courier New', monospace; }
    
    .ref-box {
      background: #F5F0EB;
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
      font-size: 16px;
      font-weight: 700;
      color: #1A1A1A;
      font-family: 'Courier New', monospace;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .info-item label {
      font-size: 9px;
      color: #8B7D6B;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: block;
      margin-bottom: 2px;
    }
    
    .info-item span {
      font-size: 13px;
      color: #1A1A1A;
      font-weight: 500;
    }
    
    .divider {
      border: none;
      border-top: 1px solid #EDE5DA;
      margin: 24px 0;
    }
    
    .total-row td {
      font-size: 16px;
      font-weight: 700;
      padding-top: 16px;
      border-top: 2px solid #1A1A1A;
    }
    
    .total-amount {
      font-size: 22px;
      color: #C9A96E;
      font-weight: 700;
    }

    .print-button {
      background: #1A1A1A;
      color: #FAF7F2;
      border: none;
      padding: 12px 32px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      cursor: pointer;
      margin-bottom: 24px;
    }

    .print-button:hover {
      background: #2C2C2C;
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
          <div class="brand-name">KIVARA</div>
          <div class="brand-tagline">Luxury African Travel</div>
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
      <p>${KIVARA_BRAND.name} Luxury Travel &mdash; ${KIVARA_BRAND.tagline}</p>
      <p>${KIVARA_BRAND.email} · ${KIVARA_BRAND.phone} · ${KIVARA_BRAND.website}</p>
      <p style="margin-top: 8px; font-size: 8px; opacity: 0.7;">${KIVARA_BRAND.address}</p>
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
