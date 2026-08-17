import {
  MAX_ATTEMPTS,
  WINDOW_MS,
  LOCKOUT_MS,
  isWithinWindow,
  withWindowStart,
  applyFailure,
  createRateLimiter,
  type LoginAttemptState,
} from "@/lib/login-rate-limiter";

describe("login rate limiter", () => {
  const base: LoginAttemptState = { failures: 0, windowStart: 1_000_000, lockedUntil: 0 };

  describe("constants", () => {
    it("allows 5 attempts before lockout", () => {
      expect(MAX_ATTEMPTS).toBe(5);
      expect(WINDOW_MS).toBe(15 * 60 * 1000);
      expect(LOCKOUT_MS).toBe(15 * 60 * 1000);
    });
  });

  describe("isWithinWindow", () => {
    it("true when within the rolling window", () => {
      expect(isWithinWindow(base, 1_000_000 + WINDOW_MS - 1)).toBe(true);
    });
    it("false once the window expires", () => {
      expect(isWithinWindow(base, 1_000_000 + WINDOW_MS)).toBe(false);
    });
  });

  describe("withWindowStart", () => {
    it("resets failures to 1 and anchors the window", () => {
      expect(withWindowStart(base, 2_000_000)).toEqual({
        failures: 1,
        windowStart: 2_000_000,
        lockedUntil: 0,
      });
    });
  });

  describe("applyFailure (pure)", () => {
    it("starts a window on the first failure", () => {
      const next = applyFailure(base, 2_000_000);
      expect(next.failures).toBe(1);
      expect(next.windowStart).toBe(2_000_000);
      expect(next.lockedUntil).toBe(0);
    });

    it("counts up to MAX_ATTEMPTS without locking", () => {
      let state = base;
      // 4 failures within window — still not locked
      for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
        state = applyFailure(state, state.windowStart + i);
      }
      expect(state.failures).toBe(MAX_ATTEMPTS - 1);
      expect(state.lockedUntil).toBe(0);
    });

    it("locks on the MAX_ATTEMPTS-th failure", () => {
      let state = base;
      // windowStart anchored at base.windowStart; failures at windowStart..windowStart+4
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        state = applyFailure(state, base.windowStart + i);
      }
      expect(state.failures).toBe(MAX_ATTEMPTS);
      // Lockout is anchored at the timestamp of the failing attempt that
      // tripped the limit (the MAX_ATTEMPTS-th attempt), not at windowStart.
      const trippedAt = base.windowStart + (MAX_ATTEMPTS - 1);
      expect(state.lockedUntil).toBe(trippedAt + LOCKOUT_MS);
    });

    it("rolls a fresh window when the previous one expired mid-window", () => {
      const counted = applyFailure(applyFailure(base, 1_000_000 + 1), 1_000_000 + 2);
      expect(counted.failures).toBe(2);
      // After the window expires, a new window starts with failures = 1.
      const fresh = applyFailure(counted, 1_000_000 + WINDOW_MS + 5);
      expect(fresh.failures).toBe(1);
      expect(fresh.windowStart).toBe(1_000_000 + WINDOW_MS + 5);
      expect(fresh.lockedUntil).toBe(0);
    });

    it("keeps the existing lockout when already locked", () => {
      const locked: LoginAttemptState = { failures: 5, windowStart: 1_000_000, lockedUntil: 1_000_000 + LOCKOUT_MS };
      const next = applyFailure(locked, 1_000_000 + LOCKOUT_MS - 1);
      expect(next).toEqual(locked);
    });
  });

  describe("createRateLimiter (stateful)", () => {
    it("allows the first attempt and blocks after MAX_ATTEMPTS", () => {
      const limiter = createRateLimiter();
      const ip = "1.2.3.4";
      const now = 1_000_000;
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const r = limiter.check(ip, now + i * 1000);
        expect(r.allowed).toBe(true);
        limiter.recordFailure(ip, now + i * 1000);
      }
      const locked = limiter.check(ip, now + MAX_ATTEMPTS * 1000);
      expect(locked.allowed).toBe(false);
      expect(locked.retryAfterMs).toBeGreaterThan(0);
    });

    it("unlocks again after the lockout expires", () => {
      const limiter = createRateLimiter();
      const ip = "1.2.3.4";
      const now = 1_000_000;
      // 5 failures at now..now+4 trip the lockout at (now+4)+LOCKOUT_MS.
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        limiter.recordFailure(ip, now + i);
      }
      expect(limiter.check(ip, now + MAX_ATTEMPTS).allowed).toBe(false);
      // After the lockout (now+4)+LOCKOUT_MS elapses the IP is reset and allowed again.
      expect(limiter.check(ip, now + (MAX_ATTEMPTS - 1) + LOCKOUT_MS + 1).allowed).toBe(true);
    });

    it("clears the failure count on a successful login", () => {
      const limiter = createRateLimiter();
      const ip = "1.2.3.4";
      const now = 1_000_000;
      for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
        limiter.recordFailure(ip, now + i * 1000);
      }
      // Still allowed (just under the threshold) ...
      expect(limiter.check(ip, now + (MAX_ATTEMPTS - 1) * 1000).allowed).toBe(true);
      // ... and a success resets us.
      limiter.recordSuccess(ip);
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        expect(limiter.check(ip, now + 1_000_000 + i).allowed).toBe(true);
        limiter.recordFailure(ip, now + 1_000_000 + i);
      }
    });

    it("isolates IPs independently", () => {
      const limiter = createRateLimiter();
      const now = 1_000_000;
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        limiter.recordFailure("1.1.1.1", now + i);
      }
      // First IP is locked, second is fine.
      expect(limiter.check("1.1.1.1", now + MAX_ATTEMPTS).allowed).toBe(false);
      expect(limiter.check("2.2.2.2", now + MAX_ATTEMPTS).allowed).toBe(true);
    });
  });
});
