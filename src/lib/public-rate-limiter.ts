/**
 * Fixed-window rate limiting for public write endpoints.
 *
 * Scope, stated plainly: this is per-process state, so on a multi-instance or
 * serverless deployment each instance keeps its own counter and a caller can
 * still multiply their allowance by the number of instances. It is defence in
 * depth against casual abuse and runaway scripts, not a hard boundary.
 *
 * The hard boundary belongs at the edge (WAF rules, a CAPTCHA, or provider-level
 * quotas). This exists so that a missing edge rule is not an open door.
 */

export interface PublicRateLimiter {
  /** Consume one unit, returning whether the call is allowed. */
  take(key: string, nowMs?: number): RateVerdict;
  reset(): void;
  /** Tracked keys. Exposed so the bound can be asserted in tests. */
  size(): number;
}

export interface RateVerdict {
  allowed: boolean;
  /** Units left in the current window. */
  remaining: number;
  /** Seconds until the window resets. */
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  /** Allowed calls per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Ceiling on tracked keys.
 *
 * `clientKey` is derived from `x-forwarded-for`, which an attacker controls, so
 * the key space is effectively unbounded: a caller who varies that header on
 * every request would otherwise add a permanent map entry per request and grow
 * this process until it dies. Sweeping keeps the cost bounded regardless.
 */
const MAX_TRACKED_KEYS = 10_000;

export function createPublicRateLimiter(options: RateLimitOptions): PublicRateLimiter {
  const { limit, windowMs } = options;
  const windows = new Map<string, Window>();

  /**
   * Keep the tracked key set bounded without making every request pay for it.
   *
   * Reclaiming finished windows is an O(n) scan of the map, so it runs at most
   * once per window. Doing it per call would just trade the memory-growth
   * problem for a CPU one: an attacker who varies the key on every request would
   * keep the map at the cap and force a full scan each time.
   *
   * Enforcing the hard cap is separate and stays O(1) per evicted key, so the
   * bound holds within a single window too.
   */
  let lastSweepAt = Number.NEGATIVE_INFINITY;

  function sweep(nowMs: number): void {
    if (windows.size < MAX_TRACKED_KEYS) return;

    if (nowMs - lastSweepAt >= windowMs) {
      lastSweepAt = nowMs;
      for (const [key, window] of windows) {
        if (nowMs >= window.resetAt) windows.delete(key);
      }
    }

    // Evict below the cap, not down to it: `take` adds a key straight after this
    // returns, so leaving the map at exactly MAX_TRACKED_KEYS would let the
    // next request push it to MAX+1.
    while (windows.size >= MAX_TRACKED_KEYS) {
      const oldest = windows.keys().next();
      if (oldest.done) break;
      windows.delete(oldest.value);
    }
  }

  function take(key: string, nowMs = Date.now()): RateVerdict {
    sweep(nowMs);

    const existing = windows.get(key);

    if (!existing || nowMs >= existing.resetAt) {
      windows.set(key, { count: 1, resetAt: nowMs + windowMs });
      return {
        allowed: true,
        remaining: limit - 1,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }

    if (existing.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - nowMs) / 1000)),
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: limit - existing.count,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - nowMs) / 1000)),
    };
  }

  return {
    take,
    reset() {
      windows.clear();
    },
    size() {
      return windows.size;
    },
  };
}

/** Inquiry and newsletter: generous enough for a real person, tight enough to stop a script. */
export const publicWriteLimiter = createPublicRateLimiter({
  limit: 5,
  windowMs: 60 * 60 * 1000, // 5 per hour
});

/**
 * Unauthenticated AI endpoints. Each call reaches a paid LLM, so an unbounded
 * endpoint is a billing denial-of-wallet as much as a security problem. Tighter
 * than the public write limiter because these are not part of the normal path a
 * guest walks: the admin panel and the authenticated portal are.
 */
export const llmCostLimiter = createPublicRateLimiter({
  limit: 20,
  windowMs: 60 * 60 * 1000, // 20 per hour
});

/**
 * Best-effort client identity. Spoofable by design: `x-forwarded-for` is attacker
 * controlled, so this raises the cost of casual abuse without pretending to be
 * an authentication mechanism.
 */
export function clientKey(request: {
  headers: { get(name: string): string | null };
}): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** A 429 for an endpoint whose cost is an LLM call. */
export function tooManyRequests(retryAfterSeconds: number, message: string) {
  return Response.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}