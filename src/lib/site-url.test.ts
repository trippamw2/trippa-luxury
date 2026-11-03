import { describe, it, expect } from "vitest";
import { getSiteUrl, normalizeSiteUrl } from "./site-url";

const env = (values: Record<string, string | undefined>) => values as NodeJS.ProcessEnv;

describe("normalizeSiteUrl", () => {
  it("returns null for empty, blank and missing values", () => {
    expect(normalizeSiteUrl("")).toBeNull();
    expect(normalizeSiteUrl("   ")).toBeNull();
    expect(normalizeSiteUrl(undefined)).toBeNull();
    expect(normalizeSiteUrl(null)).toBeNull();
  });

  it("adds a scheme and strips trailing slashes", () => {
    expect(normalizeSiteUrl("kivara.africa")).toBe("https://kivara.africa");
    expect(normalizeSiteUrl("https://kivara.africa///")).toBe("https://kivara.africa");
    expect(normalizeSiteUrl(" http://localhost:3000/ ")).toBe("http://localhost:3000");
  });
});

describe("getSiteUrl", () => {
  it("prefers the explicit variable", () => {
    expect(
      getSiteUrl(
        env({
          NEXT_PUBLIC_SITE_URL: "https://kivara.africa",
          VERCEL_PROJECT_PRODUCTION_URL: "trippa-luxury.vercel.app",
        })
      )
    ).toBe("https://kivara.africa");
  });

  it("ignores a present-but-empty variable and falls through", () => {
    expect(
      getSiteUrl(env({ NEXT_PUBLIC_SITE_URL: "", VERCEL_PROJECT_PRODUCTION_URL: "trippa-luxury.vercel.app" }))
    ).toBe("https://trippa-luxury.vercel.app");
  });

  it("never returns localhost when the variable is blank", () => {
    const url = getSiteUrl(env({ NEXT_PUBLIC_SITE_URL: "   " }));
    expect(url).not.toContain("localhost");
    expect(url).toBe("https://kivara.africa");
  });

  it("uses the deployment URL for previews", () => {
    expect(getSiteUrl(env({ VERCEL_URL: "trippa-luxury-abc.vercel.app" }))).toBe(
      "https://trippa-luxury-abc.vercel.app"
    );
  });

  it("keeps an explicitly configured localhost for local development", () => {
    expect(getSiteUrl(env({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }))).toBe(
      "http://localhost:3000"
    );
  });
});
