/**
 * Admin idle-session policy.
 *
 * Supabase refresh tokens keep a browser session alive indefinitely, which is
 * fine for a consumer app but not for a staff console that holds guest records,
 * payments and supplier contracts. The admin panel therefore signs a session
 * out after a period without real interaction.
 *
 * Pure and deterministic so the arithmetic is unit tested without timers.
 */

/** Default idle window before the admin session is terminated. */
export const DEFAULT_IDLE_MINUTES = 30;

/** Floor/ceiling so a bad env value cannot disable the policy. */
export const MIN_IDLE_MINUTES = 5;
export const MAX_IDLE_MINUTES = 480;

/** How long before expiry the "stay signed in" warning appears. */
export const IDLE_WARNING_SECONDS = 60;

/** localStorage key shared across tabs so activity in one tab counts for all. */
export const ADMIN_LAST_ACTIVE_KEY = "kivara:admin:last-active";

/** Parse `NEXT_PUBLIC_ADMIN_IDLE_MINUTES`, clamped to a sane window. */
export function parseIdleMinutes(raw?: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_IDLE_MINUTES;
  return Math.min(Math.max(Math.trunc(parsed), MIN_IDLE_MINUTES), MAX_IDLE_MINUTES);
}

/** Idle window in milliseconds. */
export function idleTimeoutMs(raw?: string | null): number {
  return parseIdleMinutes(raw) * 60_000;
}

/**
 * Whole seconds remaining before the idle logout, floored at 0.
 *
 * `lastActiveMs` and `nowMs` are epoch milliseconds.
 */
export function secondsUntilIdleLogout(
  lastActiveMs: number,
  nowMs: number,
  timeoutMs: number
): number {
  const remaining = timeoutMs - (nowMs - lastActiveMs);
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/** True while the warning banner should be visible. */
export function shouldWarnIdle(lastActiveMs: number, nowMs: number, timeoutMs: number): boolean {
  const remaining = secondsUntilIdleLogout(lastActiveMs, nowMs, timeoutMs);
  return remaining > 0 && remaining <= IDLE_WARNING_SECONDS;
}

/** True once the idle window has elapsed. */
export function isIdleExpired(lastActiveMs: number, nowMs: number, timeoutMs: number): boolean {
  return secondsUntilIdleLogout(lastActiveMs, nowMs, timeoutMs) === 0;
}
