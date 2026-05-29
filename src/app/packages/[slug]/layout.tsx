import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";
import { getMergedPackages } from "@/lib/public-data";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const packages = await getMergedPackages();
  const pkg = packages.find((p) => p.id === slug);

  if (!pkg) {
    return { title: "Package Not Found" };
  }

  return {
    title: `${pkg.title} — Luxury Travel Package | Kivara`,
    description: pkg.subtitle || pkg.description,
    alternates: {
      canonical: `${SITE_URL}/packages/${pkg.id}`,
    },
    openGraph: {
      title: `${pkg.title} | Kivara`,
      description: pkg.subtitle || pkg.description,
      url: `${SITE_URL}/packages/${pkg.id}`,
      images: pkg.image ? [{ url: pkg.image, width: 1200, height: 630, alt: pkg.title }] : [],
      type: "website",
      locale: "en_US",
      siteName: "Kivara Luxury Travel",
    },
    twitter: {
      card: "summary_large_image",
      title: `${pkg.title} | Kivara`,
      description: pkg.subtitle || pkg.description,
      images: pkg.image ? [pkg.image] : [],
    },
  };
}

export default async function PackageLayout({ params, children }: Props) {
  const { slug } = await params;
  const packages = await getMergedPackages();
  const pkg = packages.find((p) => p.id === slug);

  return (
    <>
      {pkg && (
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: SITE_URL },
            { name: "Journeys", url: `${SITE_URL}/packages` },
            { name: pkg.title, url: `${SITE_URL}/packages/${pkg.id}` },
          ]}
        />
      )}
      {children}
    </>
  );
}
