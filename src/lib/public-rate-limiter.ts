/**
 * Fixed-window rate limiting for public write endpoints.
 *
 * Counters live in Postgres when it is available, so the limit means the same
 * thing on every instance and survives a cold start. That matters because the
 * previous per-process counters were only real for one instance: on a serverless
 * deployment a caller could multiply their allowance by the instance count, and
 * a restart reset every counter to zero.
 *
 * Two things this still is not:
 *
 *  1. **Not a hard boundary.** `clientKey` derives from `x-forwarded-for`, which
 *     the caller controls, so an attacker who varies that header gets a fresh
 *     bucket per request regardless of where the counter lives. Durable counting
 *     makes the limit honest about what it can enforce; it does not make it an
 *     authentication mechanism. The hard boundary belongs at the edge (WAF, a
 *     CAPTCHA, provider-level quotas). This exists so a missing edge rule is not
 *     an open door.
 *  2. **Not available offline.** If the database is unreachable the limiter
 *     degrades to in-process counting rather than failing every request. See
 *     `@/lib/rate-limit-store` for why that trade is deliberate.
 */

import {
  createMemoryRateLimitStore,
  takeRateLimit,
  type RateLimitStore,
  type RateVerdict,
} from "@/lib/rate-limit-store";

export type { RateVerdict };

export interface PublicRateLimiter {
  /**
   * Consume one unit, returning whether the call is allowed.
   *
   * Async because the durable store is a network round-trip. Awaiting it is not
   * optional bookkeeping: the count has to be committed before the endpoint acts,
   * or concurrent requests all read the same pre-increment value and every one of
   * them is admitted past the limit.
   */
  take(key: string, nowMs?: number): Promise<RateVerdict>;
  /**
   * Drop in-process state.
   *
   * Does **not** clear Postgres counters, which are shared with every other
   * instance and cannot be reset by one process. Exists for tests and local use.
   */
  reset(): void;
  /**
   * Tracked in-process keys. Exposed so the bound can be asserted in tests.
   * Always 0 for a limiter that is actually counting in Postgres.
   */
  size(): number;
}

export interface RateLimitOptions {
  /** Allowed calls per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /**
   * Stable identity for this limiter's buckets in the shared store.
   *
   * Required when `durable`. It must not change when `limit` or `windowMs`
   * change: the bucket key is where the counter lives, so a key derived from the
   * limit would hand every caller a fresh allowance on each tuning change and
   * defeat the point of counting durably.
   */
  name?: string;
  /**
   * Count in the shared store when it is available, falling back to in-process
   * counting when it is not.
   *
   * Off by default so that a limiter constructed in a test stays hermetic: the
   * durable path ignores `nowMs` and would talk to a real database.
   */
  durable?: boolean;
}

/**
 * Ceiling on the durable bucket key, leaving room for the name prefix.
 *
 * `x-forwarded-for` is attacker-controlled, so without a clamp a large header
 * would produce a key past the column's length check, the insert would fail, and
 * every such request would quietly fall back to in-process counting — an easy way
 * to opt out of the shared limit. Truncating collides distinct callers into one
 * bucket, which makes the limit stricter for them; that is the safe direction for
 * a failure, and a legitimate forwarded address is far shorter than this.
 */
const MAX_BUCKET_KEY = 200;

function bucketKeyFor(name: string, key: string): string {
  return `${name}:${key.length > MAX_BUCKET_KEY ? key.slice(0, MAX_BUCKET_KEY) : key}`;
}

export function createPublicRateLimiter(options: RateLimitOptions): PublicRateLimiter {
  const { limit, windowMs, durable = false } = options;

  if (durable && !options.name) {
    // Fail at construction rather than silently sharing one bucket with every
    // other durable limiter, which would let one endpoint's traffic exhaust
    // another's allowance.
    throw new Error(
      "createPublicRateLimiter: a durable limiter needs a stable `name` to namespace its buckets"
    );
  }

  const fallback: RateLimitStore = createMemoryRateLimitStore();

  return {
    async take(key, nowMs) {
      if (!durable || !options.name) {
        return fallback.take(key, limit, windowMs, nowMs);
      }

      // Namespace the key: `inquiry` runs two limiters against the same client IP,
      // and an un-namespaced shared store would have them spend each other's
      // allowance.
      const { verdict } = await takeRateLimit(
        bucketKeyFor(options.name, key),
        limit,
        windowMs,
        fallback,
        nowMs
      );
      return verdict;
    },

    reset() {
      fallback.clear();
    },

    size() {
      return fallback.size();
    },
  };
}

/** Inquiry and newsletter: generous enough for a real person, tight enough to stop a script. */
export const publicWriteLimiter = createPublicRateLimiter({
  limit: 5,
  windowMs: 60 * 60 * 1000, // 5 per hour
  name: "public-write",
  durable: true,
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
  name: "llm-cost",
  durable: true,
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