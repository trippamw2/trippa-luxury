import type { Instrumentation } from "next";
import * as Sentry from "@sentry/nextjs";
import { getSentryDsn } from "@/lib/sentry";

/**
 * Boots the Sentry SDK for the runtime the server is running in.
 *
 * The runtime specific config modules are imported dynamically so the SDK is
 * only pulled into the bundle - and only initialised - when a DSN is
 * configured. Without a DSN this app behaves exactly as it did before Sentry
 * was added.
 */
export async function register(): Promise<void> {
  if (!getSentryDsn()) {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("@/sentry.edge.config");
  }
}

/**
 * Reports server-side request errors (render, action and proxy failures) to
 * Sentry. A no-op while Sentry is not configured.
 */
export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  if (!getSentryDsn()) {
    return;
  }

  Sentry.captureRequestError(error, request, context);
};
