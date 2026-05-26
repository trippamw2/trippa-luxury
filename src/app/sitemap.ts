import type { MetadataRoute } from "next";
import { PACKAGES, JOURNAL_POSTS } from "@/lib/constants";
import { getMergedDestinations, getMergedProperties } from "@/lib/public-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = "https://kivara.luxury";

  // Static routes
  const staticRoutes = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1.0 },
    { url: `${siteUrl}/about`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${siteUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${siteUrl}/packages`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${siteUrl}/journal`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${siteUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  // Dynamic data from API/DB
  const [destinations, properties] = await Promise.all([
    getMergedDestinations(),
    getMergedProperties(),
  ]);

  // Destination routes
  const destinationRoutes = destinations.map((dest) => ({
    url: `${siteUrl}/${dest.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  // Property routes
  const propertyRoutes = properties.map((prop) => ({
    url: `${siteUrl}/properties/${prop.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Package routes
  const packageRoutes = PACKAGES.map((pkg) => ({
    url: `${siteUrl}/packages#${pkg.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Journal routes
  const journalRoutes = JOURNAL_POSTS.map((post) => ({
    url: `${siteUrl}/journal/${post.id}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...destinationRoutes,
    ...propertyRoutes,
    ...packageRoutes,
    ...journalRoutes,
  ];
}
