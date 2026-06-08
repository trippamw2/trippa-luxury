import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Luxury Packages",
  description:
    "Curated romantic journeys across Africa's finest escapes. From Lake Malawi to South Luangwa and Zanzibar: bespoke itineraries for discerning couples.",
};

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
