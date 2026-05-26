import type { Metadata } from "next";
import { getMergedProperties } from "@/lib/public-data";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

const baseUrl = "https://kivara.com";

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

export default function PropertyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
