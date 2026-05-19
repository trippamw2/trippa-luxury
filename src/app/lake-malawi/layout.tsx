import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lake Malawi — Africa's Hidden Luxury Beach Escape",
  description:
    "Discover Lake Malawi: crystalline waters, private islands, and barefoot luxury. Africa's most serene romance sanctuary for couples seeking transcendence.",
  alternates: { canonical: "https://kivara.com/lake-malawi" },
  openGraph: {
    title: "Lake Malawi — Africa's Hidden Luxury Beach Escape | Kivara",
    description:
      "Discover Lake Malawi: crystalline waters, private islands, and barefoot luxury. Africa's most serene romance sanctuary for couples seeking transcendence.",
    url: "https://kivara.com/lake-malawi",
    images: [{ url: "/images/kaya-mawa-beach-swing.jpg", width: 1200, height: 630, alt: "Lake Malawi — Kaya Mawa" }],
    type: "website",
    locale: "en_US",
    siteName: "Kivara Luxury Travel",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lake Malawi — Africa's Hidden Luxury Beach Escape | Kivara",
    description:
      "Discover Lake Malawi: crystalline waters, private islands, and barefoot luxury. Africa's most serene romance sanctuary.",
    images: ["/images/kaya-mawa-beach-swing.jpg"],
  },
};

export default function LakeMalawiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
