import * as Sentry from "@sentry/nextjs";
import { getSentryDsn, SENTRY_DATA_COLLECTION } from "@/lib/sentry";

/**
 * Edge runtime Sentry configuration.
 *
 * Loaded by `src/instrumentation.ts` only when a DSN is configured. The guard
 * is repeated here so the SDK can never initialise without one, whatever
 * imports this module.
 */
const dsn = getSentryDsn();

if (dsn) {
  Sentry.init({
    dsn,
    // Never attach user data (identity, cookies, bodies) to events.
    dataCollection: SENTRY_DATA_COLLECTION,
  });
}
