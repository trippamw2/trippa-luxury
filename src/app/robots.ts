import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = "https://kivara.luxury";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
