import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  newInquiryEmail,
  inquiryConfirmationEmail,
  paymentReceiptEmail,
} from "@/lib/email";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert("x & y")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x &amp; y&quot;)&lt;/script&gt;"
    );
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeHtml("Maya at Lake Malawi")).toBe("Maya at Lake Malawi");
    expect(escapeHtml(2)).toBe("2");
    expect(escapeHtml(null)).toBe("");
  });
});

describe("email templates escape interpolated values", () => {
  it("escapes attacker-controlled fields in the admin inquiry email", () => {
    const { htmlContent } = newInquiryEmail({
      fullName: `<script>alert("name")</script>`,
      email: `victim@example.com" onmouseover="x`,
      message: `<img src=x onerror="alert('msg')">`,
      destination: "lake-malawi",
    });

    expect(htmlContent).not.toContain("<script>");
    expect(htmlContent).toContain("&lt;script&gt;");
    expect(htmlContent).not.toContain("<img src=x");
    expect(htmlContent).toContain("&lt;img src=x");
    expect(htmlContent).not.toContain(`onmouseover="x`);
    expect(htmlContent).toContain("onmouseover=&quot;x");
    // Static markup remains intact.
    expect(htmlContent).toContain("<h2");
  });

  it("escapes the guest name and destination in the confirmation email", () => {
    const { htmlContent } = inquiryConfirmationEmail({
      fullName: `<b>Maya</b>`,
      destination: "zanzibar",
    });

    expect(htmlContent).toContain("&lt;b&gt;Maya&lt;/b&gt;,");
    expect(htmlContent).not.toContain("<b>Maya</b>");
    // Normal destination text passes through unchanged.
    expect(htmlContent).toContain("Zanzibar");
  });

  it("escapes receipt fields while keeping the prose unchanged", () => {
    const { htmlContent } = paymentReceiptEmail({
      clientName: `Maya & <Co>`,
      amount: `USD "100"`,
      bookingRef: `<KVR-1>`,
      paymentMethod: `PayPal & card`,
    });

    expect(htmlContent).toContain("Maya &amp; &lt;Co&gt;");
    expect(htmlContent).toContain("USD &quot;100&quot;");
    expect(htmlContent).toContain("&lt;KVR-1&gt;");
    expect(htmlContent).toContain("PayPal &amp; card");
    expect(htmlContent).toContain("Your payment has been gracefully received.");
  });
});
