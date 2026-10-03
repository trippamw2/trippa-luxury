import { describe, it, expect } from "vitest";
import {
  escapeIlikePattern,
  ilikeSubstring,
  MAX_SEARCH_TERM_LENGTH,
} from "@/lib/postgrest-filter";

describe("escapeIlikePattern", () => {
  it("leaves an ordinary term untouched", () => {
    expect(escapeIlikePattern("Kaponda")).toBe("Kaponda");
    expect(escapeIlikePattern("martin@example.com")).toBe("martin@example.com");
  });

  it("strips the PostgREST grammar characters so the expression keeps its shape", () => {
    // Left in place, this comma closes the first condition and appends another.
    expect(escapeIlikePattern("%,guest_email.not.is.null")).not.toContain(",");
    expect(escapeIlikePattern("or(1.eq.1)")).toBe("or1.eq.1");
    expect(escapeIlikePattern(`na"me'`)).toBe("name");
  });

  it("keeps the dot, because a value cannot restructure the expression with one", () => {
    // Inside column.operator.value the value is everything after the second
    // dot, so stripping dots would only break searching by email address.
    expect(escapeIlikePattern("a.b")).toBe("a.b");
    expect(escapeIlikePattern("martin@example.com")).toBe("martin@example.com");
  });

  it("strips the characters that could inject a further query parameter", () => {
    expect(escapeIlikePattern("x&select=*")).toBe("xselect*");
    expect(escapeIlikePattern("a?b#c=d")).toBe("abcd");
  });

  it("escapes LIKE metacharacters so the search stays literal", () => {
    expect(escapeIlikePattern("100%")).toBe("100\\%");
    expect(escapeIlikePattern("first_last")).toBe("first\\_last");
  });

  it("escapes the backslash before anything else, not after", () => {
    // A naive order would turn the backslash of \% into \\ and leave % live.
    expect(escapeIlikePattern("\\%")).toBe("\\\\\\%");
    expect(escapeIlikePattern("\\")).toBe("\\\\");
  });

  it("cannot be used to widen the match beyond the caller's term", () => {
    const hostile = "%_%,%";
    const escaped = escapeIlikePattern(hostile);
    expect(escaped).not.toMatch(/(^|[^\\])%/);
    expect(escaped).not.toContain(",");
  });

  it("bounds the length", () => {
    const escaped = escapeIlikePattern("a".repeat(5_000));
    expect(escaped.length).toBeLessThanOrEqual(MAX_SEARCH_TERM_LENGTH);
  });

  it("handles an empty term", () => {
    expect(escapeIlikePattern("")).toBe("");
  });
});

describe("ilikeSubstring", () => {
  it("wraps the escaped term in wildcards", () => {
    expect(ilikeSubstring("Kaponda")).toBe("%Kaponda%");
  });

  it("leaves only the two structural wildcards live", () => {
    const pattern = ilikeSubstring("%,guest_email.not.is.null");
    // Exactly one leading and one trailing wildcard; every other one escaped.
    expect(pattern.startsWith("%")).toBe(true);
    expect(pattern.endsWith("%")).toBe(true);
    expect(pattern.slice(1, -1)).not.toContain(",");
    expect(pattern.slice(1, -1)).not.toMatch(/(^|[^\\])%/);
  });

  it("cannot close the condition and start a new one", () => {
    // The regression that motivated this helper. The comma is gone, so the
    // injected `guest_email.not.is.null` can never become a second condition;
    // it is now inert text inside the first one's value. Dots survive on
    // purpose, since a value cannot restructure the expression with one.
    const pattern = ilikeSubstring("%,guest_email.not.is.null");
    expect(pattern).toBe("%\\%guest\\_email.not.is.null%");
    expect(pattern.slice(1, -1)).not.toContain(",");
  });
});