import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentryMock = vi.hoisted(() => ({
  init: vi.fn(),
  captureRequestError: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => sentryMock);

import { getSentryDsn } from "./lib/sentry";

const SERVER_DSN_KEY = "SENTRY_DSN";
const PUBLIC_DSN_KEY = "NEXT_PUBLIC_SENTRY_DSN";
const SERVER_DSN = "https://public@o1.ingest.sentry.io/1";
const PUBLIC_DSN = "https://public@o1.ingest.sentry.io/2";

describe("Sentry environment gating", () => {
  const originalServerDsn = process.env[SERVER_DSN_KEY];
  const originalPublicDsn = process.env[PUBLIC_DSN_KEY];

  function restoreEnv(key: string, value: string | undefined): void {
    if (value === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  }

  beforeEach(() => {
    delete process.env[SERVER_DSN_KEY];
    delete process.env[PUBLIC_DSN_KEY];
    sentryMock.init.mockClear();
    // Force the Sentry config modules to be evaluated again by the next
    // dynamic import.
    vi.resetModules();
  });

  afterEach(() => {
    restoreEnv(SERVER_DSN_KEY, originalServerDsn);
    restoreEnv(PUBLIC_DSN_KEY, originalPublicDsn);
    vi.resetModules();
  });

  describe("getSentryDsn", () => {
    it("returns undefined when no Sentry DSN is configured", () => {
      expect(getSentryDsn()).toBeUndefined();
    });

    it("returns the trimmed server DSN when SENTRY_DSN is set", () => {
      process.env[SERVER_DSN_KEY] = `  ${SERVER_DSN}  `;

      expect(getSentryDsn()).toBe(SERVER_DSN);
    });

    it("falls back to NEXT_PUBLIC_SENTRY_DSN when SENTRY_DSN is unset", () => {
      process.env[PUBLIC_DSN_KEY] = PUBLIC_DSN;

      expect(getSentryDsn()).toBe(PUBLIC_DSN);
    });

    it("ignores a blank server DSN and falls back to the public DSN", () => {
      process.env[SERVER_DSN_KEY] = "   ";
      process.env[PUBLIC_DSN_KEY] = PUBLIC_DSN;

      expect(getSentryDsn()).toBe(PUBLIC_DSN);
    });
  });

  describe("server SDK initialisation", () => {
    it("does not initialise the SDK when no DSN is configured", async () => {
      await import("./sentry.server.config");

      expect(sentryMock.init).not.toHaveBeenCalled();
    });

    it("initialises the SDK with the configured DSN", async () => {
      process.env[SERVER_DSN_KEY] = SERVER_DSN;

      await import("./sentry.server.config");

      expect(sentryMock.init).toHaveBeenCalledTimes(1);
      expect(sentryMock.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: SERVER_DSN,
          dataCollection: expect.objectContaining({ userInfo: false }),
        }),
      );
    });
  });

  describe("client SDK initialisation", () => {
    it("does not initialise the SDK when no DSN is configured", async () => {
      await import("./instrumentation-client");

      expect(sentryMock.init).not.toHaveBeenCalled();
    });

    it("initialises the SDK with the public DSN", async () => {
      process.env[PUBLIC_DSN_KEY] = PUBLIC_DSN;

      await import("./instrumentation-client");

      expect(sentryMock.init).toHaveBeenCalledTimes(1);
      expect(sentryMock.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: PUBLIC_DSN,
          dataCollection: expect.objectContaining({ userInfo: false }),
        }),
      );
    });
  });
});
