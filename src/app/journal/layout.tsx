import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

const canonical = `${SITE_URL}/journal`;

export const metadata: Metadata = {
  title: "Journal | kivara.africa",
  description:
    "Kivara's Journal: inspiration for discerning travelers. Destination guides, romantic itineraries, and stories from Africa's most remarkable escapes. Lake Malawi, South Luangwa, and Zanzibar.",
  alternates: { canonical },
  openGraph: {
    title: "Journal | kivara.africa",
    description:
      "Kivara's Journal: inspiration for discerning travelers. Destination guides, romantic itineraries, and stories from Africa's most remarkable escapes.",
    url: canonical,
    type: "website",
    locale: "en_US",
    siteName: "kivara.africa",
  },
};

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
