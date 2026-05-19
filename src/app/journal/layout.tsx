import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Journal | Kivara Luxury Travel",
  description:
    "Kivara's Journal — inspiration for discerning travelers. Destination guides, romantic itineraries, and stories from Africa's most extraordinary escapes. Lake Malawi, South Luangwa, and Zanzibar.",
  alternates: {
    canonical: "https://kivara.luxury/journal",
  },
  openGraph: {
    title: "Journal | Kivara Luxury Travel",
    description:
      "Kivara's Journal — inspiration for discerning travelers. Destination guides, romantic itineraries, and stories from Africa's most extraordinary escapes.",
    url: "https://kivara.luxury/journal",
    type: "website",
    locale: "en_US",
    siteName: "Kivara Luxury Travel",
  },
};

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
