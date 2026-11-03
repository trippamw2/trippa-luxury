/**
 * Canonical public site URL for anything that leaves the server — PayPal
 * return/cancel URLs, email CTA links, unsubscribe links, sitemap entries.
 *
 * Why this exists: `process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"`
 * is everywhere, and a *present but empty* variable (a real configuration state
 * on Vercel) bypasses that fallback and ships `localhost:3000` into production
 * emails and payment redirects. Resolution order below always ends on a public
 * https origin, never localhost, unless localhost was explicitly configured.
 */

const PRODUCTION_FALLBACK = "https://kivara.africa";

/** Trim, add a scheme if missing, and drop trailing slashes. */
export function normalizeSiteUrl(raw: string | undefined | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withScheme.replace(/\/+$/, "");
}

export function getSiteUrl(env: NodeJS.ProcessEnv = process.env): string {
  // 1. Explicit configuration wins (localhost in local dev is legitimate).
  const configured = normalizeSiteUrl(env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;

  // 2. Vercel's own production domain, injected at build time. This is what
  //    keeps payment redirects and email links working when the explicit
  //    variable is missing or empty.
  const vercelProduction = normalizeSiteUrl(env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelProduction) return vercelProduction;

  // 3. The per-deployment URL (preview deployments).
  const vercelDeployment = normalizeSiteUrl(env.VERCEL_URL);
  if (vercelDeployment) return vercelDeployment;

  // 4. Last resort: the brand domain.
  return PRODUCTION_FALLBACK;
}
