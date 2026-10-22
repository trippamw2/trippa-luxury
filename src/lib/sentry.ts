/**
 * Sentry is opt-in for this app.
 *
 * Nothing is initialised, no global handler is installed and no event leaves
 * the process until a DSN is configured. The DSN is resolved lazily (never at
 * module load), the same convention the rest of this codebase uses for
 * environment variables, so the build and every unrelated code path keep
 * working without any Sentry configuration.
 */

/**
 * Resolves the Sentry DSN from the environment.
 *
 * `SENTRY_DSN` is the server-side variable. `NEXT_PUBLIC_SENTRY_DSN` is the
 * browser-safe one: Next.js inlines `NEXT_PUBLIC_*` variables into the client
 * bundle, and the browser can only ever see that one. Either variable enables
 * Sentry - a public DSN is not a secret.
 *
 * @returns the configured DSN, or `undefined` when Sentry is not configured.
 */
export function getSentryDsn(): string | undefined {
  const serverDsn = process.env.SENTRY_DSN?.trim();
  if (serverDsn) {
    return serverDsn;
  }

  const publicDsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return publicDsn ? publicDsn : undefined;
}

/**
 * Data collection baseline that keeps personally identifiable data out of
 * Sentry events.
 *
 * Sentry v11 dropped `sendDefaultPii` and now collects rich context (user
 * identity, cookies, request/response headers and bodies) by default. This
 * restores the restrictive baseline the app expects: no user identity, no
 * cookies, no headers, no query parameters, no bodies, no queue payloads and
 * no stack-frame variables.
 */
export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  graphQL: { document: false, variables: false },
  queues: false,
  stackFrameVariables: false,
};
