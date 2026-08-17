/**
 * In-memory, per-IP login rate limiter.
 *
 * Single-instance only: suitable for a single Next.js server process. For
 * multi-instance deployments, swap this for a shared store (Redis/memcached).
 *
 * Policy:
 *   - MAX_ATTEMPTS consecutive failures within WINDOW_MS => account/IP lockout
 *   - A lockout blocks the IP for LOCKOUT_MS
 *   - A successful login clears the failure count
 */
export interface LoginAttemptState {
  failures: number;
  /** epoch ms of the first failure in the current rolling window */
  windowStart: number;
  /** epoch ms when the lockout expires (0 = not locked) */
  lockedUntil: number;
}

export interface LoginRateLimiter {
  check(ip: string, nowMs?: number): { allowed: boolean; retryAfterMs: number };
  recordFailure(ip: string, nowMs?: number): void;
  recordSuccess(ip: string): void;
}

export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

/** Pure window bookkeeping, isolated for unit testing. */
export function isWithinWindow(state: LoginAttemptState, nowMs: number): boolean {
  return nowMs - state.windowStart < WINDOW_MS;
}

/** Returns fresh state with the window anchored at `nowMs`. */
export function withWindowStart(state: LoginAttemptState, nowMs: number): LoginAttemptState {
  return { ...state, failures: 1, windowStart: nowMs };
}

/** Applies a failed attempt to the current state. */
export function applyFailure(state: LoginAttemptState, nowMs: number): LoginAttemptState {
  if (state.lockedUntil && nowMs < state.lockedUntil) {
    // Already locked — keep the existing lockout.
    return state;
  }
  if (!isWithinWindow(state, nowMs)) {
    return withWindowStart(state, nowMs);
  }
  const failures = state.failures + 1;
  const lockedUntil = failures >= MAX_ATTEMPTS ? nowMs + LOCKOUT_MS : state.lockedUntil;
  return { ...state, failures, windowStart: state.windowStart, lockedUntil };
}

export function createRateLimiter(): LoginRateLimiter {
  const store = new Map<string, LoginAttemptState>();

  function check(ip: string, nowMs = Date.now()): { allowed: boolean; retryAfterMs: number } {
    const state = store.get(ip);
    if (!state) return { allowed: true, retryAfterMs: 0 };

    if (state.lockedUntil && nowMs < state.lockedUntil) {
      return { allowed: false, retryAfterMs: state.lockedUntil - nowMs };
    }

    // Lockout expired — reset.
    if (state.lockedUntil && nowMs >= state.lockedUntil) {
      store.delete(ip);
      return { allowed: true, retryAfterMs: 0 };
    }

    return { allowed: true, retryAfterMs: 0 };
  }

  function recordFailure(ip: string, nowMs = Date.now()): void {
    const existing = store.get(ip) ?? { failures: 0, windowStart: nowMs, lockedUntil: 0 };
    const next = applyFailure(existing, nowMs);
    store.set(ip, next);
  }

  function recordSuccess(ip: string): void {
    store.delete(ip);
  }

  return { check, recordFailure, recordSuccess };
}

// Module singleton used by the login route.
export const loginRateLimiter = createRateLimiter();
