import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  clampLimit,
  clampOffset,
  resolveOrderBy,
} from "@/lib/api-helpers";

describe("page size", () => {
  it("defaults when the caller does not ask", () => {
    expect(clampLimit(null)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampLimit(null)).toBeGreaterThan(0);
  });

  it("accepts a reasonable request", () => {
    expect(clampLimit("25")).toBe(25);
  });

  it("caps an absurd request instead of obeying it", () => {
    // The bug: ?limit=10000000 asked Postgres for the entire table.
    expect(clampLimit("10000000")).toBe(MAX_PAGE_SIZE);
  });

  it("falls back on unparseable input rather than returning NaN", () => {
    // NaN used to flow into the range arithmetic and silently drop the bound.
    for (const raw of ["abc", "", "  ", "NaN"]) {
      expect(clampLimit(raw), `input ${JSON.stringify(raw)}`).toBe(DEFAULT_PAGE_SIZE);
    }
  });

  it("parses leniently but never returns something unsafe", () => {
    // parseInt stops at the first invalid character, so "1.5.2" yields 1. That
    // is a small page rather than a broken query, which is the safe direction.
    expect(clampLimit("1.5.2")).toBe(1);
  });

  it("falls back on zero and negative input", () => {
    expect(clampLimit("0")).toBe(DEFAULT_PAGE_SIZE);
    expect(clampLimit("-10")).toBe(DEFAULT_PAGE_SIZE);
  });

  it("never returns a value that is not a positive integer", () => {
    for (const raw of [null, "5", "0", "-1", "abc", "999999"]) {
      const size = clampLimit(raw);
      expect(Number.isInteger(size)).toBe(true);
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThanOrEqual(MAX_PAGE_SIZE);
    }
  });
});

describe("offset", () => {
  it("defaults to the first page", () => {
    expect(clampOffset(null)).toBe(0);
  });

  it("accepts a positive offset", () => {
    expect(clampOffset("100")).toBe(100);
  });

  it("falls back on junk and negative input", () => {
    expect(clampOffset("abc")).toBe(0);
    expect(clampOffset("-5")).toBe(0);
  });
});

describe("sort order", () => {
  it("defaults to newest first", () => {
    expect(resolveOrderBy(null)).toEqual({ column: "created_at", direction: "desc" });
  });

  it("accepts a known column and direction", () => {
    expect(resolveOrderBy("name:asc")).toEqual({ column: "name", direction: "asc" });
    expect(resolveOrderBy("total_amount:desc")).toEqual({
      column: "total_amount",
      direction: "desc",
    });
  });

  it("refuses an unknown column instead of passing it to the database", () => {
    // An arbitrary column name is a schema probe and can force a pathological sort.
    expect(resolveOrderBy("password_hash")).toEqual({
      column: "created_at",
      direction: "desc",
    });
    expect(resolveOrderBy("; drop table bookings")).toEqual({
      column: "created_at",
      direction: "desc",
    });
  });

  it("treats an unrecognised direction as descending", () => {
    expect(resolveOrderBy("name:sideways")).toEqual({ column: "name", direction: "desc" });
  });

  it("handles a bare column with no direction", () => {
    expect(resolveOrderBy("status")).toEqual({ column: "status", direction: "desc" });
  });
});