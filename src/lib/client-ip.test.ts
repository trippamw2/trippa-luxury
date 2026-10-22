/**
 * Decision table for `resolveClientIp`, the client identity every rate-limit
 * bucket is keyed on. Exported by `@/lib/rate-limit-store`.
 */
import { describe, expect, it } from "vitest";
import { resolveClientIp, UNKNOWN_CLIENT_KEY } from "@/lib/rate-limit-store";

/**
 * A request whose headers answer with the given values; a header that is not
 * listed is absent.
 */
function request(headers: Record<string, string | readonly string[] | undefined>) {
  return {
    headers: {
      get: (name: string): string | readonly string[] | null =>
        headers[name.toLowerCase()] ?? null,
    },
  };
}

describe("resolveClientIp", () => {
  it("prefers the platform address over the forwarded chain", () => {
    // The proxy writes x-real-ip; the caller only writes x-forwarded-for.
    expect(
      resolveClientIp(
        request({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "203.0.113.5, 10.0.0.1" })
      )
    ).toBe("198.51.100.7");
  });

  it("does not let a forged forwarded chain override the platform address", () => {
    expect(
      resolveClientIp(request({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "9.9.9.9" }))
    ).toBe("198.51.100.7");
  });

  it("uses the leftmost forwarded hop when the platform address is absent", () => {
    expect(resolveClientIp(request({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    expect(resolveClientIp(request({ "x-forwarded-for": "a, b, c" }))).toBe("a");
  });

  it("never returns the whole forwarded chain as a key", () => {
    const resolved = resolveClientIp(request({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }));
    expect(resolved).toBe("1.2.3.4");
    expect(resolved).not.toContain(",");
  });

  it("groups callers that arrive with no address into one bucket", () => {
    // Not a fresh allowance per request: unidentified callers share a bucket.
    expect(resolveClientIp(request({}))).toBe(UNKNOWN_CLIENT_KEY);
    expect(resolveClientIp(request({ "user-agent": "curl" }))).toBe(UNKNOWN_CLIENT_KEY);
  });

  it("skips empty forwarded entries instead of keying on an empty address", () => {
    expect(resolveClientIp(request({ "x-forwarded-for": ", , 203.0.113.5" }))).toBe("203.0.113.5");
    expect(resolveClientIp(request({ "x-forwarded-for": " , " }))).toBe(UNKNOWN_CLIENT_KEY);
  });

  it("reads a repeated forwarded header as the chain it carries", () => {
    expect(resolveClientIp(request({ "x-forwarded-for": ["203.0.113.5", "10.0.0.1"] }))).toBe(
      "203.0.113.5"
    );
  });

  it("trims surrounding whitespace and treats a blank header as absent", () => {
    expect(resolveClientIp(request({ "x-real-ip": "  198.51.100.7  " }))).toBe("198.51.100.7");
    expect(resolveClientIp(request({ "x-forwarded-for": "   " }))).toBe(UNKNOWN_CLIENT_KEY);
    expect(resolveClientIp(request({ "x-real-ip": "" }))).toBe(UNKNOWN_CLIENT_KEY);
  });

  it("resolves malformed headers deterministically and never throws", () => {
    const malformed = request({
      "x-real-ip": "not-an-address",
      "x-forwarded-for": ",,, ,,  ",
    });
    expect(() => resolveClientIp(malformed)).not.toThrow();
    // The platform header is trusted as written: it is written by the proxy,
    // so guessing at its format would only invent an identity it never had.
    expect(resolveClientIp(malformed)).toBe("not-an-address");
    expect(resolveClientIp(malformed)).toBe(resolveClientIp(malformed));
  });
});
