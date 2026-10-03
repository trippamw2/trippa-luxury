/**
 * Rate limit storage: a shared Postgres fixed window, with an in-process
 * fallback.
 *
 * ── Why a durable store ────────────────────────────────────────────────────
 * A counter held in a `Map` is only real for one process. On a serverless or
 * multi-instance deployment every instance keeps its own count, so a caller can
 * multiply their allowance by the number of instances, and a cold start resets
 * every counter to zero. Postgres fixes both, because the counter outlives the
 * instance.
 *
 * ── Why a fallback anyway ──────────────────────────────────────────────────
 * A rate limiter that throws when its database is unreachable turns a dependency
 * blip into an outage of every public endpoint, which is worse than the abuse it
 * prevents. So nothing here throws: on failure it logs visibly and degrades to
 * an in-process limiter. That is a deliberate availability-over-strictness trade,
 * and it is only sound because the abuse ceiling is also enforced at the edge
 * (WAF / CAPTCHA / provider quotas). This layer is defence in depth, never a hard
 * boundary.
 *
 * ── Residual weakness, stated plainly ──────────────────────────────────────
 * Neither store fixes the identity problem. `clientKey` derives from
 * `x-forwarded-for`, which the caller controls, so an attacker who varies that
 * header gets a fresh bucket per request no matter where the counter lives.
 * Durable counting makes the limit *honest* about what it can enforce; it does
 * not make it an authentication mechanism.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface RateVerdict {
  allowed: boolean;
  /** Units left in the current window. */
  remaining: number;
  /** Seconds until the window resets. */
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  readonly kind: "postgres" | "memory";
  /**
   * Consume one unit.
   *
   * `nowMs` exists so the in-memory store is deterministic under test. The
   * Postgres store ignores it: server time is the only clock consistent across
   * instances, and honouring a caller-supplied one would let a skewed instance
   * hand out a window the rest of the fleet has already closed.
   */
  take(bucketKey: string, limit: number, windowMs: number, nowMs?: number): Promise<RateVerdict>;
  /** Tracked keys. Meaningful for the memory store; 0 for Postgres. */
  size(): number;
  /** Drop tracked state. Meaningful for the memory store; no-op for Postgres. */
  clear(): void;
}

/**
 * Ceiling on tracked keys in the memory store.
 *
 * `clientKey` is derived from `x-forwarded-for`, which an attacker controls, so
 * the key space is effectively unbounded: a caller who varies that header on
 * every request would otherwise add a permanent map entry per request and grow
 * the process until it dies. Sweeping keeps the cost bounded regardless.
 */
export const MAX_TRACKED_KEYS = 10_000;

interface Window {
  count: number;
  resetAt: number;
}

/**
 * The original per-process limiter, ported with its behaviour unchanged.
 *
 * One instance owns one key space, and that isolation is load-bearing: `inquiry`
 * runs the public-write limiter and the LLM-cost limiter against the *same*
 * client IP, so a single shared map would have the two limiters silently spend
 * each other's allowance.
 */
export function createMemoryRateLimitStore(): RateLimitStore {
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

  /**
   * `windowMs` is passed in rather than closed over: the store does not know its
   * window at construction time. For any single store the value is constant (a
   * limiter owns its store and has one fixed window), so this is equivalent to
   * the closed-over version, and it keeps the store constructible without
   * arguments.
   */
  function sweep(nowMs: number, windowMs: number): void {
    if (windows.size < MAX_TRACKED_KEYS) return;

    if (nowMs - lastSweepAt >= windowMs) {
      lastSweepAt = nowMs;
      for (const [key, window] of windows) {
        if (nowMs >= window.resetAt) windows.delete(key);
      }
    }

    // Evict below the cap, not down to it: `take` adds a key straight after this
    // returns, so leaving the map at exactly MAX_TRACKED_KEYS would let the next
    // request push it to MAX+1.
    while (windows.size >= MAX_TRACKED_KEYS) {
      const oldest = windows.keys().next();
      if (oldest.done) break;
      windows.delete(oldest.value);
    }
  }

  return {
    kind: "memory",

    async take(bucketKey, limit, windowMs, nowMs = Date.now()): Promise<RateVerdict> {
      sweep(nowMs, windowMs);

      const existing = windows.get(bucketKey);

      if (!existing || nowMs >= existing.resetAt) {
        windows.set(bucketKey, { count: 1, resetAt: nowMs + windowMs });
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
    },

    size() {
      return windows.size;
    },

    clear() {
      windows.clear();
    },
  };
}

type RpcResult = {
  data: { allowed: boolean; remaining: number; retry_after_seconds: number }[] | null;
  error: { message: string; code?: string } | null;
};

type RpcClient = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<RpcResult> };

/**
 * Postgres-backed store. One atomic `INSERT .. ON CONFLICT DO UPDATE` per call,
 * so concurrent requests cannot both slip past the limit.
 */
export function createPostgresRateLimitStore(client: RpcClient): RateLimitStore {
  return {
    kind: "postgres",

    async take(bucketKey, limit, windowMs): Promise<RateVerdict> {
      const { data, error } = await client.rpc("take_rate_limit", {
        p_bucket_key: bucketKey,
        p_limit: limit,
        p_window_seconds: Math.max(1, Math.round(windowMs / 1000)),
      });

      if (error) throw new Error(error.message);
      const row = data?.[0];
      if (!row) throw new Error("take_rate_limit returned no row");

      return {
        allowed: row.allowed,
        remaining: row.remaining,
        retryAfterSeconds: row.retry_after_seconds,
      };
    },

    // Counters live in Postgres, so there is no local key set to report or drop.
    size: () => 0,
    clear: () => undefined,
  };
}

/**
 * A key used only to decide whether the RPC exists.
 *
 * `limit: 0` admits nothing, so the probe cannot consume anyone's allowance, and
 * the bucket is a single constant row rather than anything derived from a
 * caller. It is irrelevant to real traffic and is overwritten by the next probe.
 */
const PROBE_KEY = "__rate_limit_probe__";

/** PostgREST's code for a missing function, and Postgres's for a missing relation. */
const UNDEFINED_FUNCTION_CODES = new Set(["PGRST202", "42883"]);

function isUndefinedFunction(error: { message: string; code?: string }): boolean {
  if (error.code && UNDEFINED_FUNCTION_CODES.has(error.code)) return true;
  return /could not find the function|does not exist/i.test(error.message);
}

/** Throttle the fallback warning so a database outage cannot flood the logs. */
const LOG_THROTTLE_MS = 60_000;
const lastLoggedAt = new Map<string, number>();

export function logStoreFallbackOnce(reason: string, message: string, nowMs = Date.now()): void {
  const last = lastLoggedAt.get(reason);
  if (last !== undefined && nowMs - last < LOG_THROTTLE_MS) return;
  lastLoggedAt.set(reason, nowMs);
  console.warn(
    `[rate-limit] ${message} Falling back to the in-process limiter, so limits are per-instance again.`
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export interface RateLimitResolution {
  /** `null` means no durable store is available; use the caller's own. */
  store: RateLimitStore | null;
  durable: boolean;
}

let resolution: Promise<RateLimitResolution> | undefined;

/** Test seam: forget the resolved store and any throttled warnings. */
export function resetRateLimitStoreCache(): void {
  lastLoggedAt.clear();
  resolution = undefined;
}

/**
 * Resolve the durable store once per process.
 *
 * Postgres is used only when it is configured AND the RPC answers. The probe
 * matters: a deployment that has not applied migration 032 would otherwise send
 * every public request down a throwing path, and the resulting errors would look
 * like an application bug rather than a pending migration.
 */
export function resolveRateLimitStore(): Promise<RateLimitResolution> {
  if (resolution) return resolution;

  resolution = (async (): Promise<RateLimitResolution> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return { store: null, durable: false };

    let client: RpcClient;
    try {
      client = createAdminClient() as unknown as RpcClient;
    } catch (error) {
      logStoreFallbackOnce("client", `Supabase client unavailable: ${describe(error)}`);
      return { store: null, durable: false };
    }

    try {
      const { error } = await client.rpc("take_rate_limit", {
        p_bucket_key: PROBE_KEY,
        p_limit: 0,
        p_window_seconds: 1,
      });

      if (error) {
        if (isUndefinedFunction(error)) {
          // Expected on any deployment that has not applied migration 032 yet.
          logStoreFallbackOnce("missing-rpc", "take_rate_limit is not present in the database.");
        } else {
          logStoreFallbackOnce("probe-failed", `Rate-limit probe failed: ${error.message}`);
        }
        return { store: null, durable: false };
      }
    } catch (error) {
      logStoreFallbackOnce("probe-threw", `Rate-limit probe threw: ${describe(error)}`);
      return { store: null, durable: false };
    }

    return { store: createPostgresRateLimitStore(client), durable: true };
  })();

  return resolution;
}

/**
 * Take through the durable store, degrading to `fallback` on any failure.
 *
 * This is the only entry point a limiter should use. It cannot throw, so no route
 * has to decide what a rate-limiter outage should do to its response.
 *
 * `fallback` is passed in rather than created here because it has to be the
 * limiter's *own* long-lived store: a store built per call would never accumulate
 * a count, so the limit could never be reached.
 */
export async function takeRateLimit(
  bucketKey: string,
  limit: number,
  windowMs: number,
  fallback: RateLimitStore,
  nowMs?: number
): Promise<{ verdict: RateVerdict; durable: boolean }> {
  const { store, durable } = await resolveRateLimitStore();

  if (store) {
    try {
      return { verdict: await store.take(bucketKey, limit, windowMs, nowMs), durable };
    } catch (error) {
      logStoreFallbackOnce("take-failed", `Rate-limit write failed: ${describe(error)}`);
    }
  }

  return { verdict: await fallback.take(bucketKey, limit, windowMs, nowMs), durable: false };
}