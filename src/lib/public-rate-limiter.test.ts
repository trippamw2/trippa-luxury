import { describe, expect, it } from "vitest";
import {
  clientKey,
  createPublicRateLimiter,
  type PublicRateLimiter,
} from "@/lib/public-rate-limiter";

function limiter(): PublicRateLimiter {
  // No `durable`: these assert the in-process algorithm, and the durable path
  // ignores `nowMs` and would talk to a real database.
  return createPublicRateLimiter({ limit: 3, windowMs: 1000 });
}

describe("fixed-window rate limiting", () => {
  it("allows calls up to the limit", async () => {
    const rl = limiter();
    expect((await rl.take("a", 0)).allowed).toBe(true);
    expect((await rl.take("a", 0)).allowed).toBe(true);
    expect((await rl.take("a", 0)).allowed).toBe(true);
  });

  it("refuses the call after the limit", async () => {
    const rl = limiter();
    await rl.take("a", 0);
    await rl.take("a", 0);
    await rl.take("a", 0);
    expect((await rl.take("a", 0)).allowed).toBe(false);
  });

  it("counts each caller separately", async () => {
    const rl = limiter();
    for (let i = 0; i < 3; i += 1) await rl.take("a", 0);
    expect((await rl.take("a", 0)).allowed).toBe(false);
    // One guest exhausting their allowance must not lock out everyone else.
    expect((await rl.take("b", 0)).allowed).toBe(true);
  });

  it("allows again once the window has passed", async () => {
    const rl = limiter();
    for (let i = 0; i < 3; i += 1) await rl.take("a", 0);
    expect((await rl.take("a", 0)).allowed).toBe(false);
    // Past the 1000ms window.
    expect((await rl.take("a", 1001)).allowed).toBe(true);
  });

  it("reports how long to wait", async () => {
    const rl = createPublicRateLimiter({ limit: 1, windowMs: 60_000 });
    await rl.take("a", 0);
    const verdict = await rl.take("a", 0);
    expect(verdict.retryAfterSeconds).toBe(60);
    expect(verdict.remaining).toBe(0);
  });

  it("counts down the remaining allowance", async () => {
    const rl = limiter();
    expect((await rl.take("a", 0)).remaining).toBe(2);
    expect((await rl.take("a", 0)).remaining).toBe(1);
    expect((await rl.take("a", 0)).remaining).toBe(0);
  });

  it("resets on demand", async () => {
    const rl = limiter();
    for (let i = 0; i < 3; i += 1) await rl.take("a", 0);
    rl.reset();
    expect((await rl.take("a", 0)).allowed).toBe(true);
  });

  it("refuses to build a durable limiter without a stable bucket name", () => {
    // Without this guard two durable limiters would share one bucket and spend
    // each other's allowance.
    expect(() =>
      createPublicRateLimiter({ limit: 5, windowMs: 1000, durable: true })
    ).toThrow(/stable `name`/);
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
  it("does not grow without limit when the key is attacker-controlled", async () => {
    // `clientKey` reads x-forwarded-for, so varying it per request is trivial.
    // Before the sweep existed, each variation left a permanent map entry and
    // the process grew until it died.
    const rl = createPublicRateLimiter({ limit: 3, windowMs: 60_000 });

    for (let i = 0; i < 25_000; i += 1) {
      await rl.take(`198.51.100.${i}`, 0);
    }

    expect(rl.size()).toBeLessThanOrEqual(10_000);
  });

  it("reclaims expired windows rather than only capping", async () => {
    const rl = createPublicRateLimiter({ limit: 3, windowMs: 1000 });

    for (let i = 0; i < 12_000; i += 1) {
      await rl.take(`key-${i}`, 0);
    }
    expect(rl.size()).toBe(10_000);

    // Every window from t=0 has expired by t=2000, so the sweep should drop
    // them all rather than falling back to evicting live entries.
    await rl.take("one-more", 2_000);
    expect(rl.size()).toBe(1);
  });

  it("keeps counting a key that is still tracked after a sweep", async () => {
    // Eviction is oldest-first, so this asserts only what the design actually
    // guarantees: a key that survives the sweep keeps its count. An attacker who
    // rotates keys is outside what this limiter claims to stop, which is why the
    // module states the hard boundary belongs at the edge.
    const rl = createPublicRateLimiter({ limit: 2, windowMs: 60_000 });

    for (let i = 0; i < 9_000; i += 1) {
      await rl.take(`noise-${i}`, 0);
    }
    expect((await rl.take("survivor", 0)).allowed).toBe(true);
    expect((await rl.take("survivor", 0)).allowed).toBe(true);
    for (let i = 9_000; i < 12_000; i += 1) {
      await rl.take(`noise-${i}`, 0);
    }

    expect((await rl.take("survivor", 0)).allowed).toBe(false);
  });

  it("still counts a caller correctly inside the normal range", async () => {
    const rl = createPublicRateLimiter({ limit: 2, windowMs: 1000 });
    expect((await rl.take("a", 0)).allowed).toBe(true);
    expect((await rl.take("a", 0)).allowed).toBe(true);
    expect((await rl.take("a", 0)).allowed).toBe(false);
    expect((await rl.take("a", 1_000)).allowed).toBe(true);
  });
});