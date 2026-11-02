import { describe, it, expect } from "vitest";
import { expiryBadge } from "@/lib/supplier-documents";

describe("expiryBadge", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("neutral when no expiry", () => {
    expect(expiryBadge(null, now)).toBe("neutral");
    expect(expiryBadge(undefined, now)).toBe("neutral");
  });
  it("red when expired", () => {
    expect(expiryBadge("2025-12-01", now)).toBe("red");
  });
  it("amber when within 60 days", () => {
    expect(expiryBadge("2026-02-15", now)).toBe("amber");
  });
  it("neutral when beyond 60 days", () => {
    expect(expiryBadge("2026-06-01", now)).toBe("neutral");
  });
});