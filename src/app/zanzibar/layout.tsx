import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zanzibar — The Spice Island Romance | Kivara",
  description:
    "Discover Zanzibar: turquoise waters, ancient Stone Town, and spice-scented luxury. The apex of tropical romance for couples seeking paradise.",
  alternates: { canonical: "https://kivara.com/zanzibar" },
  openGraph: {
    title: "Zanzibar — The Spice Island Romance | Kivara",
    description:
      "Discover Zanzibar: turquoise waters, ancient Stone Town, and spice-scented luxury. The apex of tropical romance for couples seeking paradise.",
    url: "https://kivara.com/zanzibar",
    images: [{ url: "/images/baraza-beach.jpg", width: 1200, height: 630, alt: "Zanzibar — Baraza Resort & Spa" }],
    type: "website",
    locale: "en_US",
    siteName: "Kivara Luxury Travel",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zanzibar — The Spice Island Romance | Kivara",
    description:
      "Discover Zanzibar: turquoise waters, ancient Stone Town, and spice-scented luxury. The apex of tropical romance for couples seeking paradise.",
    images: ["/images/baraza-beach.jpg"],
  },
};

export default function ZanzibarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
