import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";

const canonical = `${SITE_URL}/contact`;

export const metadata: Metadata = {
  title: "Contact — Begin Your Journey | Kivara Luxury Travel",
  description:
    "Reach out to Kivara's concierge team. Let us craft your perfect African romance escape — a bespoke itinerary designed around your love story.",
  alternates: { canonical },
  openGraph: {
    title: "Contact — Begin Your Journey | Kivara Luxury Travel",
    description:
      "Reach out to Kivara's concierge team. Let us craft your perfect African romance escape — a bespoke itinerary designed around your love story.",
    url: canonical,
    images: [{ url: "/images/kivara-og.jpg", width: 1200, height: 630, alt: "Kivara Luxury Travel" }],
    type: "website",
    locale: "en_US",
    siteName: "Kivara Luxury Travel",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact — Begin Your Journey | Kivara Luxury Travel",
    description:
      "Reach out to Kivara's concierge team. Let us craft your perfect African romance escape — a bespoke itinerary designed around your love story.",
    images: ["/images/kivara-og.jpg"],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SITE_URL },
          { name: "Contact", url: canonical },
        ]}
      />
      {children}
    </>
  );
}
