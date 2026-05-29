import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";
import { getMergedProperties } from "@/lib/public-data";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

const baseUrl = SITE_URL;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const properties = await getMergedProperties();
  const property = properties.find((p) => p.id === slug);

  if (!property) {
    return { title: "Property Not Found" };
  }

  const ogImage = property.heroImage
    ? { url: `${baseUrl}${property.heroImage}`, width: 1200, height: 800 }
    : undefined;

  return {
    title: property.name,
    description: property.tagline,
    alternates: { canonical: `${baseUrl}/properties/${property.id}` },
    openGraph: {
      title: `${property.name} | Kivara`,
      description: property.tagline,
      url: `${baseUrl}/properties/${property.id}`,
      images: ogImage ? [ogImage] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${property.name} | Kivara`,
      description: property.tagline,
      images: ogImage ? [ogImage.url] : [],
    },
  };
}

export default async function PropertyLayout({ params, children }: Props) {
  const { slug } = await params;
  const properties = await getMergedProperties();
  const property = properties.find((p) => p.id === slug);

  return (
    <>
      {property && (
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: SITE_URL },
            { name: "Properties", url: `${SITE_URL}/properties` },
            { name: property.name, url: `${SITE_URL}/properties/${property.id}` },
          ]}
        />
      )}
      {children}
    </>
  );
}
