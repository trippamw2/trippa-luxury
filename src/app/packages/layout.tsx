import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Kivara Romantic Journeys | Bespoke Luxury Itineraries",
  description:
    "Curated romantic journeys across Africa's finest escapes. From Lake Malawi to South Luangwa and Zanzibar: bespoke itineraries for discerning couples.",
  alternates: { canonical: canonicalUrl("/packages") },
};

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
