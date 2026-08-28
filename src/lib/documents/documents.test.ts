import { describe, it, expect } from "vitest";
import { generateVisaInfoDocument } from "@/lib/documents/visa-info";
import { generatePackingListDocument } from "@/lib/documents/packing-list";
import { generateTravelInsuranceDocument } from "@/lib/documents/travel-insurance";

describe("generateVisaInfoDocument", () => {
  it("produces a full branded HTML document", () => {
    const html = generateVisaInfoDocument();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
  });

  it("covers all supported destinations", () => {
    const html = generateVisaInfoDocument();
    expect(html).toContain("Visa Requirements");
    for (const dest of [
      "Zambia",
      "Zimbabwe",
      "Botswana",
      "Tanzania",
      "Kenya",
      "South Africa",
    ]) {
      expect(html).toContain(dest);
    }
  });

  it("includes the Kivara brand footer", () => {
    const html = generateVisaInfoDocument();
    expect(html).toContain("kivara.luxury");
  });
});

describe("generatePackingListDocument", () => {
  it("produces a full branded HTML document", () => {
    const html = generatePackingListDocument();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
  });

  it("includes a packing heading and season sections", () => {
    const html = generatePackingListDocument();
    expect(html).toContain("Packing");
    expect(html).toContain("Dry Season");
    expect(html).toContain("Green Season");
  });

  it("includes the Kivara brand footer", () => {
    expect(generatePackingListDocument()).toContain("kivara.luxury");
  });
});

describe("generateTravelInsuranceDocument", () => {
  it("produces a full branded HTML document", () => {
    const html = generateTravelInsuranceDocument();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
  });

  it("includes insurance guidance and recommended providers", () => {
    const html = generateTravelInsuranceDocument();
    expect(html).toContain("Travel Insurance");
    expect(html).toContain("Medical emergency");
    expect(html).toContain("World Nomads");
  });

  it("includes the Kivara brand footer", () => {
    expect(generateTravelInsuranceDocument()).toContain("kivara.luxury");
  });
});
