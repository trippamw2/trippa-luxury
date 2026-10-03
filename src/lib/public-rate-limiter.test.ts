import { describe, expect, it } from "vitest";
import {
  clientKey,
  createPublicRateLimiter,
  type PublicRateLimiter,
} from "@/lib/public-rate-limiter";

function limiter(): PublicRateLimiter {
  return createPublicRateLimiter({ limit: 3, windowMs: 1000 });
}

describe("fixed-window rate limiting", () => {
  it("allows calls up to the limit", () => {
    const rl = limiter();
    expect(rl.take("a", 0).allowed).toBe(true);
    expect(rl.take("a", 0).allowed).toBe(true);
    expect(rl.take("a", 0).allowed).toBe(true);
  });

  it("refuses the call after the limit", () => {
    const rl = limiter();
    rl.take("a", 0);
    rl.take("a", 0);
    rl.take("a", 0);
    expect(rl.take("a", 0).allowed).toBe(false);
  });

  it("counts each caller separately", () => {
    const rl = limiter();
    for (let i = 0; i < 3; i += 1) rl.take("a", 0);
    expect(rl.take("a", 0).allowed).toBe(false);
    // One guest exhausting their allowance must not lock out everyone else.
    expect(rl.take("b", 0).allowed).toBe(true);
  });

  it("allows again once the window has passed", () => {
    const rl = limiter();
    for (let i = 0; i < 3; i += 1) rl.take("a", 0);
    expect(rl.take("a", 0).allowed).toBe(false);
    // Past the 1000ms window.
    expect(rl.take("a", 1001).allowed).toBe(true);
  });

  it("reports how long to wait", () => {
    const rl = createPublicRateLimiter({ limit: 1, windowMs: 60_000 });
    rl.take("a", 0);
    const verdict = rl.take("a", 0);
    expect(verdict.retryAfterSeconds).toBe(60);
    expect(verdict.remaining).toBe(0);
  });

  it("counts down the remaining allowance", () => {
    const rl = limiter();
    expect(rl.take("a", 0).remaining).toBe(2);
    expect(rl.take("a", 0).remaining).toBe(1);
    expect(rl.take("a", 0).remaining).toBe(0);
  });

  it("resets on demand", () => {
    const rl = limiter();
    for (let i = 0; i < 3; i += 1) rl.take("a", 0);
    rl.reset();
    expect(rl.take("a", 0).allowed).toBe(true);
  });
});

describe("client identity", () => {
  const req = (headers: Record<string, string>) => ({
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  });

  it("uses the first forwarded address, not the whole chain", () => {
    expect(clientKey(req({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip", () => {
    expect(clientKey(req({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("groups unidentified callers together rather than failing open per request", () => {
    // Spoofable, and deliberately so: an attacker without a forwarding header
    // shares one bucket rather than getting a fresh unlimited allowance.
    expect(clientKey(req({}))).toBe("unknown");
  });
});

describe("bounded memory", () => {
  it("does not grow without limit when the key is attacker-controlled", () => {
    // `clientKey` reads x-forwarded-for, so varying it per request is trivial.
    // Before the sweep existed, each variation left a permanent map entry and
    // the process grew until it died.
    const rl = createPublicRateLimiter({ limit: 3, windowMs: 60_000 });

    for (let i = 0; i < 25_000; i += 1) {
      rl.take(`198.51.100.${i}`, 0);
    }

    expect(rl.size()).toBeLessThanOrEqual(10_000);
  });

  it("reclaims expired windows rather than only capping", () => {
    const rl = createPublicRateLimiter({ limit: 3, windowMs: 1000 });

    for (let i = 0; i < 12_000; i += 1) {
      rl.take(`key-${i}`, 0);
    }
    expect(rl.size()).toBe(10_000);

    // Every window from t=0 has expired by t=2000, so the sweep should drop
    // them all rather than falling back to evicting live entries.
    rl.take("one-more", 2_000);
    expect(rl.size()).toBe(1);
  });

  it("keeps counting a key that is still tracked after a sweep", () => {
    // Eviction is oldest-first, so this asserts only what the design actually
    // guarantees: a key that survives the sweep keeps its count. An attacker who
    // rotates keys is outside what this limiter claims to stop, which is why the
    // module states the hard boundary belongs at the edge.
    const rl = createPublicRateLimiter({ limit: 2, windowMs: 60_000 });

    for (let i = 0; i < 9_000; i += 1) {
      rl.take(`noise-${i}`, 0);
    }
    expect(rl.take("survivor", 0).allowed).toBe(true);
    expect(rl.take("survivor", 0).allowed).toBe(true);
    for (let i = 9_000; i < 12_000; i += 1) {
      rl.take(`noise-${i}`, 0);
    }

    expect(rl.take("survivor", 0).allowed).toBe(false);
  });

  it("still counts a caller correctly inside the normal range", () => {
    const rl = createPublicRateLimiter({ limit: 2, windowMs: 1000 });
    expect(rl.take("a", 0).allowed).toBe(true);
    expect(rl.take("a", 0).allowed).toBe(true);
    expect(rl.take("a", 0).allowed).toBe(false);
    expect(rl.take("a", 1_000).allowed).toBe(true);
  });
});