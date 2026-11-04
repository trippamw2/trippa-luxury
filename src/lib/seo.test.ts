import { describe, it, expect } from "vitest";
import { SITE_URL } from "./constants";
import { canonicalUrl, pageMetadata, NO_INDEX } from "./seo";

describe("canonicalUrl", () => {
  it("maps the root to the bare site URL", () => {
    expect(canonicalUrl()).toBe(SITE_URL);
    expect(canonicalUrl("/")).toBe(SITE_URL);
    expect(canonicalUrl("")).toBe(SITE_URL);
  });

  it("builds absolute page URLs", () => {
    expect(canonicalUrl("/about")).toBe(`${SITE_URL}/about`);
    expect(canonicalUrl("about")).toBe(`${SITE_URL}/about`);
    expect(canonicalUrl("/journal/a-story/")).toBe(`${SITE_URL}/journal/a-story`);
  });

  it("preserves nested paths", () => {
    expect(canonicalUrl("/properties/lake-house")).toBe(`${SITE_URL}/properties/lake-house`);
  });
});

describe("pageMetadata", () => {
  it("always emits a canonical, plus optional title and description", () => {
    expect(pageMetadata("/faq")).toEqual({ alternates: { canonical: `${SITE_URL}/faq` } });
    expect(pageMetadata("/faq", "FAQ", "Answers")).toEqual({
      title: "FAQ",
      description: "Answers",
      alternates: { canonical: `${SITE_URL}/faq` },
    });
  });

  it("exposes a no-index robots fragment", () => {
    expect(NO_INDEX).toEqual({ robots: { index: false, follow: false } });
  });
});
