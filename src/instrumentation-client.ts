import * as Sentry from "@sentry/nextjs";
import { getSentryDsn, SENTRY_DATA_COLLECTION } from "@/lib/sentry";

/**
 * Browser Sentry configuration.
 *
 * Next.js runs this file before hydration, so unhandled client errors are
 * captured from the very first paint. Without a DSN nothing is initialised
 * and the browser bundle stays free of any Sentry behaviour.
 */
const dsn = getSentryDsn();

if (dsn) {
  Sentry.init({
    dsn,
    // Never attach user data (identity, cookies, bodies) to events.
    dataCollection: SENTRY_DATA_COLLECTION,
  });
}

/**
 * Next.js calls this on every App Router navigation.
 *
 * The export is unconditional so the Sentry build plugin always finds the hook
 * it looks for; `captureRouterTransitionStart` is a no-op while no client is
 * initialised.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
