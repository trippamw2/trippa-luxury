import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

/**
 * Absolute canonical URL for a public route.
 *
 * Every page should declare its own canonical: a root-level canonical is
 * inherited by any page that does not override it, which would point unrelated
 * pages at the homepage. The brand domain stays the canonical host even when
 * the app is served from a preview or `*.vercel.app` deployment.
 */
export function canonicalUrl(path = "/"): string {
  if (!path || path === "/") return SITE_URL;
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${withLeadingSlash.replace(/\/+$/, "")}`;
}

/** Metadata fragment for pages that must not be indexed (legal utility, payment, portal). */
export const NO_INDEX: Pick<Metadata, "robots"> = {
  robots: { index: false, follow: false },
};

/** Metadata fragment for an indexable public page. */
export function pageMetadata(path: string, title?: string, description?: string): Metadata {
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical: canonicalUrl(path) },
  };
}
