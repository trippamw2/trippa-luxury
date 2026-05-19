import type { Metadata } from "next";
import { PACKAGES } from "@/lib/constants";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pkg = PACKAGES.find((p) => p.id === slug);

  if (!pkg) {
    return { title: "Package Not Found" };
  }

  return {
    title: `${pkg.title} — Luxury Travel Package | Kivara`,
    description: pkg.subtitle || pkg.description,
    alternates: {
      canonical: `https://kivara.luxury/packages/${pkg.id}`,
    },
    openGraph: {
      title: `${pkg.title} | Kivara`,
      description: pkg.subtitle || pkg.description,
      url: `https://kivara.luxury/packages/${pkg.id}`,
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

export default function PackageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
