import { describe, it, expect } from "vitest";
import {
  DEFAULT_IDLE_MINUTES,
  MAX_IDLE_MINUTES,
  MIN_IDLE_MINUTES,
  IDLE_WARNING_SECONDS,
  idleTimeoutMs,
  isIdleExpired,
  parseIdleMinutes,
  secondsUntilIdleLogout,
  shouldWarnIdle,
} from "./admin-idle";

const MINUTE = 60_000;

describe("parseIdleMinutes", () => {
  it("defaults when the value is absent or unparseable", () => {
    expect(parseIdleMinutes(undefined)).toBe(DEFAULT_IDLE_MINUTES);
    expect(parseIdleMinutes("")).toBe(DEFAULT_IDLE_MINUTES);
    expect(parseIdleMinutes("not-a-number")).toBe(DEFAULT_IDLE_MINUTES);
    expect(parseIdleMinutes("0")).toBe(DEFAULT_IDLE_MINUTES);
    expect(parseIdleMinutes("-15")).toBe(DEFAULT_IDLE_MINUTES);
  });

  it("clamps to the supported window", () => {
    expect(parseIdleMinutes("1")).toBe(MIN_IDLE_MINUTES);
    expect(parseIdleMinutes("2000")).toBe(MAX_IDLE_MINUTES);
  });

  it("accepts a normal value", () => {
    expect(parseIdleMinutes("45")).toBe(45);
    expect(parseIdleMinutes("45.9")).toBe(45);
  });
});

describe("idle arithmetic", () => {
  it("converts minutes to milliseconds", () => {
    expect(idleTimeoutMs("30")).toBe(30 * MINUTE);
  });

  it("counts down and expires exactly at the boundary", () => {
    const timeout = 30 * MINUTE;
    const start = 1_000_000;
    expect(secondsUntilIdleLogout(start, start, timeout)).toBe(1800);
    expect(secondsUntilIdleLogout(start, start + 29 * MINUTE, timeout)).toBe(60);
    expect(secondsUntilIdleLogout(start, start + timeout, timeout)).toBe(0);
    expect(secondsUntilIdleLogout(start, start + timeout + MINUTE, timeout)).toBe(0);
  });

  it("warns only inside the warning window", () => {
    const timeout = 30 * MINUTE;
    const start = 0;
    expect(shouldWarnIdle(start, 10 * MINUTE, timeout)).toBe(false);
    expect(shouldWarnIdle(start, timeout - (IDLE_WARNING_SECONDS + 5) * 1000, timeout)).toBe(false);
    expect(shouldWarnIdle(start, timeout - IDLE_WARNING_SECONDS * 1000, timeout)).toBe(true);
    expect(shouldWarnIdle(start, timeout - 1, timeout)).toBe(true);
    expect(shouldWarnIdle(start, timeout, timeout)).toBe(false);
  });

  it("marks the session expired only after the window", () => {
    const timeout = 30 * MINUTE;
    expect(isIdleExpired(0, timeout - 1, timeout)).toBe(false);
    expect(isIdleExpired(0, timeout, timeout)).toBe(true);
  });

  it("treats a clock that moved backwards as active, not expired", () => {
    const timeout = 30 * MINUTE;
    expect(secondsUntilIdleLogout(10 * MINUTE, 0, timeout)).toBe(2400);
    expect(isIdleExpired(10 * MINUTE, 0, timeout)).toBe(false);
  });
});
